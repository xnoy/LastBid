--[[
  place_bid.lua — the atomic heart of BidNova.
  ---------------------------------------------------------------------------
  Redis runs a script as a single isolated unit: nothing else touches these
  keys while it executes. That gives us read-validate-write in one step, so two
  bids arriving in the same millisecond are serialised by Redis itself. There
  is no read-then-write window for a race to slip through, and no lock to leak.

  It implements eBay-style *proxy* bidding. A bidder never really submits "a
  price", they submit a **maximum**. The visible price is derived:

      price = min(winner_max, runner_up_max + increment)

  so the winner only ever pays one increment over the person behind them.
  A user's maximum lives in a separate hash that is only ever read by this
  script and by its owner's own API calls — it is never broadcast.

  KEYS
    1  auction:<id>              hash, hot auction state
    2  auction:<id>:autobids     hash, userId -> private maximum (paise)
    3  auctions:active           zset, auctionId scored by endsAt (ms)
    4  auction:<id>:req:<reqId>  string, idempotency receipt ('' to skip)

  ARGV
    1  userId
    2  maxAmount            integer paise, the bidder's ceiling
    3  now                  epoch ms, supplied by the caller (replication-safe)
    4  antiSnipeWindowMs    extend the clock if a bid lands inside this window
    5  antiSnipeExtensionMs how far to push the deadline when that happens
    6  declaredCurrentBid   what the client thought the price was; -1 to skip.
                            Used only to reject *stale* taps, never to set price.

  RETURNS a JSON string:
    { ok, code, price, leaderId, endsAt, bidCount, version, reserveMet,
      minNextBid, extended, events: [{ userId, amount, isAuto, at }] }
  `ok=false` always carries a machine-readable `code` the API maps to a message.
--]]

local auctionKey = KEYS[1]
local autoKey    = KEYS[2]
local indexKey   = KEYS[3]
local reqKey     = KEYS[4]

local userId        = ARGV[1]
local maxAmount     = tonumber(ARGV[2])
local now           = tonumber(ARGV[3])
local snipeWindow   = tonumber(ARGV[4])
local snipeExtend   = tonumber(ARGV[5])
local declaredPrice = tonumber(ARGV[6])

-- ---------------------------------------------------------------------------
-- 0. Idempotency. A retried request returns the original receipt instead of
--    creating a second bid. Covers double taps, flaky mobile networks, and
--    client-side retry loops.
-- ---------------------------------------------------------------------------
if reqKey ~= '' then
  local cached = redis.call('GET', reqKey)
  if cached then return cached end
end

local function fail(code, extra)
  local res = { ok = false, code = code }
  if extra then for k, v in pairs(extra) do res[k] = v end end
  return cjson.encode(res)
end

-- HGETALL returns a flat array; fold it into a table.
local function hash(key)
  local flat = redis.call('HGETALL', key)
  local t = {}
  for i = 1, #flat, 2 do t[flat[i]] = flat[i + 1] end
  return t
end

local a = hash(auctionKey)
if a.id == nil then
  -- Not in Redis: either the auction does not exist or it has not been
  -- hydrated yet. The caller hydrates from Postgres and retries exactly once.
  return fail('AUCTION_NOT_LOADED')
end

-- ---------------------------------------------------------------------------
-- 1. Authorisation and liveness. Nothing here trusts the client.
-- ---------------------------------------------------------------------------
if a.status ~= 'ACTIVE' then return fail('AUCTION_NOT_ACTIVE') end

local endsAt = tonumber(a.endsAt)
if now >= endsAt then
  -- The clock ran out between the tap and the write. Close it here so the
  -- settlement job does not have to win a race with late bidders.
  redis.call('HSET', auctionKey, 'status', 'ENDED')
  redis.call('ZREM', indexKey, a.id)
  return fail('AUCTION_ENDED')
end

if a.sellerId == userId then return fail('SELLER_CANNOT_BID') end

if maxAmount == nil or maxAmount ~= math.floor(maxAmount) or maxAmount <= 0 then
  return fail('INVALID_AMOUNT')
end

-- ---------------------------------------------------------------------------
-- 2. Price arithmetic.
-- ---------------------------------------------------------------------------
local currentBid = tonumber(a.currentBid)
local increment  = tonumber(a.minIncrement)
local startPrice = tonumber(a.startPrice)
local leaderId   = a.leaderId
local bidCount   = tonumber(a.bidCount)
local version    = tonumber(a.version) + 1

if leaderId == nil then leaderId = '' end

-- First bid may match the start price; after that it must clear the increment.
local minNext = startPrice
if currentBid > 0 then minNext = currentBid + increment end

-- Stale tap: the price moved under the user's finger. Reject rather than
-- silently bidding at a price they never agreed to.
if declaredPrice >= 0 and declaredPrice ~= currentBid then
  return fail('STALE_BID', { price = currentBid, minNextBid = minNext, version = tonumber(a.version) })
end

if maxAmount < minNext then
  return fail('BID_TOO_LOW', { price = currentBid, minNextBid = minNext })
end

local existingMax = tonumber(redis.call('HGET', autoKey, userId) or '0')
if maxAmount <= existingMax then
  -- A ceiling can only ever be raised. Prevents a user quietly lowering their
  -- commitment, and makes repeated identical submissions a no-op.
  return fail('MAX_NOT_INCREASED', { price = currentBid, minNextBid = minNext })
end

local leaderMax = 0
if leaderId ~= '' then
  leaderMax = tonumber(redis.call('HGET', autoKey, leaderId) or '0')
end

-- Record the new ceiling before resolving, so the resolution below reads a
-- consistent view of every participant's maximum.
redis.call('HSET', autoKey, userId, maxAmount)

local events = {}
local function record(uid, amount, isAuto)
  bidCount = bidCount + 1
  events[#events + 1] = { userId = uid, amount = amount, isAuto = isAuto, at = now }
end

local newPrice, newLeader

if leaderId == '' then
  -- Opening bid: the price is the start price, not the bidder's ceiling.
  newLeader = userId
  newPrice = minNext
  record(userId, newPrice, false)

elseif leaderId == userId then
  -- The leader is raising their own ceiling. Correct behaviour is that the
  -- visible price does NOT move — they are already beating everyone else.
  newLeader = userId
  newPrice = currentBid

elseif maxAmount > leaderMax then
  -- Challenger outbids the standing leader. They pay one increment over the
  -- old leader's ceiling, capped by their own maximum.
  newLeader = userId
  newPrice = leaderMax + increment
  if newPrice > maxAmount then newPrice = maxAmount end
  if newPrice < minNext then newPrice = minNext end
  record(userId, newPrice, newPrice < maxAmount)

else
  -- Leader holds. Their proxy automatically answers the challenge up to, but
  -- never beyond, their private maximum. Ties go to whoever committed first.
  newLeader = leaderId
  record(userId, maxAmount, false) -- the challenger's losing bid is public
  newPrice = maxAmount + increment
  if newPrice > leaderMax then newPrice = leaderMax end
  if newPrice < minNext then newPrice = minNext end
  record(leaderId, newPrice, true) -- flagged as an automatic bid in history
end

-- ---------------------------------------------------------------------------
-- 3. Anti-sniping. A bid in the dying seconds pushes the deadline out, so the
--    auction ends when bidding stops rather than when the clock happens to.
-- ---------------------------------------------------------------------------
local extended = false
if (endsAt - now) <= snipeWindow then
  endsAt = now + snipeExtend
  extended = true
end

-- ---------------------------------------------------------------------------
-- 4. Commit. Every write below lands in the same atomic unit as the checks.
-- ---------------------------------------------------------------------------
redis.call('HSET', auctionKey,
  'currentBid', newPrice,
  'leaderId', newLeader,
  'bidCount', bidCount,
  'endsAt', endsAt,
  'version', version)
redis.call('ZADD', indexKey, endsAt, a.id)

local reserve = tonumber(a.reservePrice or '0')
local reserveMet = (reserve == 0) or (newPrice >= reserve)

local result = cjson.encode({
  ok = true,
  code = 'OK',
  price = newPrice,
  leaderId = newLeader,
  endsAt = endsAt,
  bidCount = bidCount,
  version = version,
  reserveMet = reserveMet,
  minNextBid = newPrice + increment,
  extended = extended,
  events = events,
})

-- Keep the receipt for five minutes: long enough to absorb any client retry.
if reqKey ~= '' then redis.call('SET', reqKey, result, 'EX', 300) end

return result

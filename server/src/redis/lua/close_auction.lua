--[[
  close_auction.lua — settle exactly once.
  ---------------------------------------------------------------------------
  Several server instances run the closer job, and all of them will notice the
  same expired auction at the same moment. This script flips ACTIVE -> ENDED
  atomically, so precisely one caller receives `ok=true` and goes on to write
  the winner, the order and the notifications. Everyone else gets ALREADY_CLOSED
  and does nothing.

  KEYS  1 auction:<id>   2 auctions:active
  ARGV  1 now (epoch ms)
  RETURNS JSON { ok, code, price, leaderId, bidCount, reserveMet, sellerId }
--]]

local auctionKey = KEYS[1]
local indexKey   = KEYS[2]
local now        = tonumber(ARGV[1])

local flat = redis.call('HGETALL', auctionKey)
local a = {}
for i = 1, #flat, 2 do a[flat[i]] = flat[i + 1] end

if a.id == nil then return cjson.encode({ ok = false, code = 'AUCTION_NOT_LOADED' }) end
if a.status ~= 'ACTIVE' then return cjson.encode({ ok = false, code = 'ALREADY_CLOSED' }) end
if now < tonumber(a.endsAt) then return cjson.encode({ ok = false, code = 'STILL_RUNNING' }) end

redis.call('HSET', auctionKey, 'status', 'ENDED', 'version', tonumber(a.version) + 1)
redis.call('ZREM', indexKey, a.id)

local price = tonumber(a.currentBid)
local reserve = tonumber(a.reservePrice or '0')

return cjson.encode({
  ok = true,
  code = 'CLOSED',
  price = price,
  leaderId = a.leaderId,
  bidCount = tonumber(a.bidCount),
  sellerId = a.sellerId,
  reserveMet = (reserve == 0) or (price >= reserve),
})

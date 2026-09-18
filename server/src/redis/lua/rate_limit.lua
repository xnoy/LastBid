--[[
  rate_limit.lua — sliding-window limiter.
  ---------------------------------------------------------------------------
  A sorted set of request timestamps per user. Old entries are trimmed, the
  remainder counted, and the new request admitted or refused — atomically, so
  a burst of parallel requests cannot all read "count = 0" at once.

  KEYS  1 rl:<scope>:<subject>
  ARGV  1 now (ms)  2 windowMs  3 maxPoints  4 unique member id
  RETURNS { allowed (1|0), remaining, retryAfterMs }
--]]

local key      = KEYS[1]
local now      = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxPoints = tonumber(ARGV[3])
local member   = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)
local used = redis.call('ZCARD', key)

if used >= maxPoints then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = windowMs
  if oldest[2] then retry = (tonumber(oldest[2]) + windowMs) - now end
  if retry < 0 then retry = 0 end
  return { 0, 0, retry }
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs)
return { 1, maxPoints - used - 1, 0 }

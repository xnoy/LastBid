# BidNova

**Bid. Compete. Own.**

A real-time auction marketplace: proxy bidding, anti-snipe extensions, live price
broadcast over WebSockets, livestream rooms, delivery tracking, and a
comparable-sales price estimator for sellers.

The name is a placeholder. It appears in `client/index.html`, `client/src/components/AppShell.tsx`,
the seed data and this file — changing it is a find-and-replace, not a refactor.

---

## What's in the box

| Area | Stack |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind, React Query, socket.io-client |
| Backend | Node 20, Express, Socket.IO, Prisma |
| Storage | PostgreSQL (system of record), Redis (hot auction state + Lua) |
| Realtime | Socket.IO with the Redis adapter, so multiple server instances share rooms |

Categories: **Fashion**, **Exclusive Electronics & Tech**, **Collectibles**,
**Entertainment**, plus **BidTok** (short-video discovery) and **BidTok Live**
(livestream rooms).

---

## Running it locally

**Prerequisites:** Node 20+, npm 10+, Docker (for Postgres and Redis). If you
already run Postgres and Redis yourself, skip step 1 and point `DATABASE_URL` /
`REDIS_URL` at them.

```bash
# 1. Start Postgres and Redis
docker compose up -d          # or: npm run infra:up

# 2. Configure the server
cp server/.env.example server/.env
#    then set JWT_SECRET to something long and random:
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Install, generate the Prisma client, migrate, seed
npm run setup

# 4. Run both apps
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:4000/api/health>

Vite proxies `/api` and `/socket.io` to port 4000 in development, so there is no
CORS setup to do while developing.

### Seeded accounts

`npm run seed` creates 16 listings across every category, two completed sales
with full delivery timelines, and two live rooms. Password for all accounts is
`bidnova123`.

| Email | Role |
| --- | --- |
| `devika_b@bidnova.test` | buyer, has active bids and an order to track |
| `aria_vault@bidnova.test` | seller, has running and sold lots |
| `admin@bidnova.test` | admin, can reach `/admin` |

### Other scripts

```bash
npm run build       # typecheck + build server (tsc) and client (vite build)
npm run typecheck   # types only, both workspaces
npm run seed        # re-seed (wipes and rebuilds demo data)
npm run start       # run the built server
npm run infra:down  # stop Postgres and Redis
```

---

## How the auction engine works

This is the part worth reading before changing anything.

### Everything price-related happens in one Lua script

`server/src/redis/lua/place_bid.lua` is the only place a price is allowed to
change. Redis runs Lua atomically, so the whole sequence — read the current
state, validate, compute the new price, write it back — happens with no other
bid interleaved. That removes the entire class of race conditions where two
bidders read the same price and both "win".

The script rejects a bid and returns a reason code when:

- the auction is not `ACTIVE`, or its clock has already run out
- the bidder is the seller (no self-bidding)
- the amount is not a positive integer number of paise
- the amount is below `currentBid + minIncrement`
- `declaredCurrentBid` (the price the client was looking at) no longer matches
  the real price — a **stale bid**, returned as `STALE_BID` so the UI can show
  the new number instead of silently placing a bid against an old one
- the bidder already holds a proxy ceiling and the new one is not higher

**Idempotency:** every bid carries a client-generated `requestId`. The script
caches its own result under that key for five minutes and replays it on a
repeat, so a double-tap, a retried request or a flaky connection cannot produce
two bids.

### Proxy bidding (the auto-bidder)

A bid is always "the maximum I am willing to pay", never "the price". The script
then sets:

```
price = min(winner_max, runner_up_max + increment)
```

which is the familiar eBay behaviour: you can win at well under your maximum,
and raising your own ceiling while already leading does **not** raise the price.
When someone else's bid is answered automatically by the leader's standing
maximum, the resulting bid is recorded with `isAuto: true` and shows up in the
history marked *automatic*.

**Maximums are never exposed.** `AutoBid` rows are only ever read back to their
owner via `GET /api/bids/auto/:auctionId`; no list endpoint, socket payload or
bid-history row contains anyone else's ceiling.

### Anti-sniping

A bid inside `ANTI_SNIPE_WINDOW_SECONDS` of the close pushes `endsAt` out by
`ANTI_SNIPE_EXTENSION_SECONDS`, inside the same atomic script. The auction page
tells the user when this happens rather than moving the clock silently.

### Closing an auction exactly once

`server/src/jobs/auctionCloser.ts` scans a Redis sorted set of active auctions
(`auctions:active`, scored by `endsAt`) every two seconds. Settlement runs
through `close_auction.lua`, which flips `ACTIVE → ENDED` atomically — so if
three server instances notice the same expiry at the same moment, exactly one
of them settles it, creates the order and notifies the parties.

Reserve prices are checked at settlement: met means `SOLD`, unmet means
`UNSOLD`. Bidders only ever see met/not-met, never the reserve amount.

### Bids do not travel over the socket

The socket is broadcast-only. Bids go over HTTP to `POST /api/bids` so there is
exactly one validation path, one rate limiter and one audit trail. Clients then
receive `auction:update` frames carrying a monotonic `version`; the client drops
any frame older than the one it has, so a reconnect or an out-of-order delivery
can never walk the displayed price backwards.

### Privacy in bid history

Bidders appear as a per-auction alias (`bidder_a1b2c3`), derived as a hash of
auction id + user id. The same person is consistent within one auction and
unlinkable across auctions.

---

## Project layout

```
server/
  prisma/schema.prisma        users, auctions, bids, autobids, orders, live sessions…
  src/redis/lua/              place_bid.lua, close_auction.lua, rate_limit.lua
  src/services/               auction, bid, settlement, order, notification
  src/services/pricing/       price estimator (swappable)
  src/services/streaming/     livestream provider (swappable)
  src/services/payments/      payment provider (swappable)
  src/routes/                 the HTTP API
  src/realtime/               Socket.IO wiring and the broadcast bus
  src/jobs/auctionCloser.ts   expiry scan + settlement trigger
client/
  src/pages/                  one file per route
  src/components/             AuctionCard, BidPanel, Countdown, OrderTimeline…
  src/hooks/                  useLiveAuction (socket mirror), useCountdown, useWatchlist
  src/shared/                 category tree + API types, mirrored from the server
```

---

## Connecting real services

Three integrations ship as clean interfaces with honest default implementations.
**None of them talks to an external service out of the box, and the UI says so
rather than pretending otherwise.**

### Price estimator — real statistics, not a model

`POST /api/ai/price-estimate` powers *Estimate fair market price* on the create
listing screen. The default provider (`PRICE_ESTIMATOR_PROVIDER=heuristic`) is
**not an AI model and does not call one**. It computes an interquartile range
over BidNova's own completed sales in the same subcategory and condition,
returns the sample size and a confidence figure derived from it, and lists the
comparables it used. With no sales history it says so and suggests nothing.

The UI labels the result *Statistical model*. To plug in a real model, set
`PRICE_ESTIMATOR_PROVIDER=http` plus `PRICE_ESTIMATOR_URL` / `PRICE_ESTIMATOR_API_KEY`;
`server/src/services/pricing/http.estimator.ts` is the adapter, and it must
return the same `PriceEstimateResult` shape. The label changes to
*External model* automatically.

### Livestreaming — interface only

`STREAM_PROVIDER=mock` creates live rooms with working chat, viewer counts,
bidding and countdowns, but **no video transport**. The room renders a panel
saying there is no feed connected instead of looping a fake one. Implement
`StreamProvider` in `server/src/services/streaming/` against Mux, LiveKit, IVS
or Agora; once `playbackUrl` is populated the same component plays it and the
placeholder disappears.

### Payments — mock, nothing is charged

`PAYMENT_PROVIDER=mock` moves an order from `PAYMENT_PENDING` to
`ORDER_CONFIRMED` so the delivery timeline is demonstrable. Every response
carries `charged: false`, the checkout screen states plainly that no payment is
taken, and **no card details are collected anywhere**. Implement
`PaymentProvider` in `server/src/services/payments/` to connect Razorpay,
Stripe or similar.

---

## Security notes

- Passwords are bcrypt-hashed (cost 12). Login returns an identical message for
  a wrong password and an unknown account.
- Every mutating endpoint re-checks ownership server-side. The React route
  guards are a convenience, not the control.
- All input is validated with Zod; errors come back in one
  `{ error: { code, message, details } }` envelope and never leak stack traces.
- Rate limits (bidding, registration, listing creation, chat, price estimates)
  run as a Redis sliding window, so they hold across instances.
- The client is never trusted for a price, a winner, a reserve, or a delivery
  state. It sends intent; the server decides.
- No secret is readable from the browser. `client/.env.example` contains only
  `VITE_API_URL` and `VITE_SOCKET_URL`, both of which are public by design.

---

## Delivery states

Orders move forward only, one step at a time, through:

`Payment pending → Order confirmed → Preparing → Shipped → In transit → Out for delivery → Delivered`

A replayed or forged request cannot move a delivered parcel back to *shipped*.
Buyers follow the timeline at `/orders/:id`; sellers advance it from the same
page.

---

## Known limitations

- Images are stored as URLs; there is no file upload pipeline.
- No email or push delivery — notifications are in-app only.
- Seller ratings are seeded, not earned; there is no post-sale review flow yet.
- The BidTok feed loads the 30 most recent listings that have a clip, with no
  personalisation.

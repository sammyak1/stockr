# Stockr — Inventory & Reservation System

A Next.js application for reserving inventory across multiple warehouses with concurrency-safe stock management.

## Live Demo

> Add your Vercel deployment URL here.

## Running Locally

### Prerequisites

- Node.js 18+
- A hosted Postgres instance (Supabase, Neon, or Railway — all have free tiers)

### Setup

```bash
git clone <your-repo-url>
cd stockr
npm install

# Copy env template and fill in your values
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://..."        # from your Postgres provider
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="your-random-secret"       # openssl rand -hex 32
```

### Migrations & Seed

```bash
# Run migrations (creates tables)
npx prisma migrate dev --name init

# Seed with sample products, warehouses, and stock
npm run db:seed
```

### Start Dev Server

```bash
npm run dev
# → http://localhost:3000
```

---

## How the Expiry Mechanism Works

### In production (Vercel Cron)

`vercel.json` schedules `POST /api/cron/expire-reservations` to fire **every minute**. The handler:

1. Queries for all `PENDING` reservations where `expiresAt < NOW()`
2. Decrements `StockLevel.reserved` for each (returning units to available stock)
3. Bulk-updates their status to `RELEASED`
4. All of the above runs inside a single Postgres transaction

**Trade-off**: There is up to ~60 seconds of lag between when a reservation expires and when the stock becomes available again. This is acceptable for most e-commerce use cases. A real production system requiring sub-second precision would use `pg_notify` + a persistent listener, or a job queue (Inngest, BullMQ) that can fire on a timer.

The cron endpoint is secured with a `Bearer` token (`CRON_SECRET`) to prevent unauthorized calls. Vercel automatically sends this header when configured in the project settings.

### In development

Run the cleanup manually via:
```bash
curl -X POST http://localhost:3000/api/cron/expire-reservations \
  -H "Authorization: Bearer your-cron-secret"
```

Or simply let reservations expire — the confirm endpoint also detects and releases expired reservations lazily on read.

---

## Concurrency Approach

The reservation endpoint (`POST /api/reservations`) uses **PostgreSQL row-level locking** (`SELECT ... FOR UPDATE`) inside a Prisma transaction.

```
Request A ──► BEGIN TRANSACTION
              SELECT * FROM StockLevel WHERE ... FOR UPDATE  ◄── locks row
              available = total - reserved = 1 ✓
              UPDATE StockLevel SET reserved = reserved + 1
              INSERT INTO Reservation ...
              COMMIT  ──► releases lock

Request B ──► BEGIN TRANSACTION
              SELECT * FROM StockLevel WHERE ... FOR UPDATE  ◄── WAITS (blocked by A)
              ...A commits...
              available = total - reserved = 0 ✗
              ROLLBACK ──► returns 409
```

Two simultaneous requests for the last unit serialize at the database layer. Exactly one succeeds; the other gets a 409. No application-level mutex or Redis lock needed.

The confirm and release endpoints also use `SELECT ... FOR UPDATE` to prevent double-processing race conditions.

---

## Idempotency (Bonus)

The `POST /api/reservations` endpoint supports the `Idempotency-Key` header.

**How it works:**
1. If an `Idempotency-Key` header is present, the key is stored alongside the reservation in the DB (unique constraint on `Reservation.idempotencyKey`).
2. Before processing, `withIdempotency()` checks `IdempotencyRecord` for a matching key.
3. If found, returns the cached status code + body immediately without creating a new reservation.
4. If not found, runs the handler, then saves the result to `IdempotencyRecord`.

This means if a client retries a `POST /api/reservations` after a network timeout (using the same `Idempotency-Key`), they get back the original reservation — not a duplicate.

---

## Trade-offs & What I'd Do Differently

**With more time:**

- **Pagination** on the product listing — fine for demo scale, would break with thousands of products.
- **Real-time stock updates** — currently the product page is fetched fresh on load but doesn't push updates. WebSockets or SSE would let the UI reflect another user's reservation without refresh.
- **Rate limiting** on the reservation endpoint — a bad actor could exhaust stock by creating and releasing reservations rapidly.
- **Proper order model** — right now "confirmed" just flips a status. A real system would create an `Order` record, integrate with a payment processor webhook, and then confirm the reservation.
- **Sub-minute expiry** — Vercel Cron minimum is 1 minute. A queue-based approach (Inngest, Trigger.dev) would allow scheduling exact expiry at `T + 15min`.
- **Monitoring** — no alerting on failed cron runs or high 409 rates. Would add structured logging + Sentry.

**Deliberate simplifications:**
- No authentication — any user can reserve any product. Acceptable for a demo.
- No payment integration — "confirm" is a no-op beyond status update.
- SQLite not used — the assignment requires a hosted Postgres instance.

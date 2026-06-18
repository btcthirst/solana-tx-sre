# Pre-flight Simulation

Cheap insurance. Simulation catches failures **before** you spend a fee or a
blockhash window, and it gives you the exact CU number for sizing the limit.

## What to simulate and read

`simulateTransaction` (or Helius RPC) against the latest state returns:

- `err` — if non-null, the tx **would fail**; do not send. Surface it.
- `logs` — the program log lines; the last meaningful one usually names the cause.
- `unitsConsumed` — feed straight into `compute-budget.md` to size the CU limit.
- `accounts` (optional) — post-execution account state if you request it.

## When to simulate

- **Before first send** of any non-trivial tx — always. Gate sending on `err == null`.
- **To size CU limit** — simulate, read `unitsConsumed`, add margin.
- **When debugging a custom error** — simulate to reproduce the log locally without
  paying or waiting for an on-chain failure.

## skipPreflight: the nuance

`skipPreflight: true` tells the RPC *not* to simulate before forwarding. It's a
double-edged setting:

- **Pro:** lower latency; avoids a redundant simulation when you've **already**
  simulated yourself and are now in a tight rebroadcast loop.
- **Con:** if you skip preflight *and* never simulated, you fly blind — you'll pay
  for and broadcast txs that were always going to fail.

Rule: **simulate once yourself, then** you may `skipPreflight` in the resend loop.
Never `skipPreflight` on a path that has never been simulated.

## Limits of simulation

Simulation runs against a recent state snapshot. Between simulate and execute, state
can move — an oracle updates, a pool's liquidity shifts, an account gets written.
So simulation:
- **Catches** logic errors, missing/wrong accounts, insufficient CU, bad params.
- **Does not catch** races, contention (`AccountInUse`), or price moves between
  sim and land (→ `sandwich-slippage.md`). That's why the CU margin and slippage
  guards exist.

## Verify

A clean simulation (`err == null`) plus a `unitsConsumed` that fits under your CU
limit is the green light to send. If real sends still fail after a clean sim,
the cause is timing/contention, not the tx itself — route back to `diagnostics.md`.

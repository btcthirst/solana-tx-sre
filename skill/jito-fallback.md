# Jito Bundle Fallback

The congestion-fallback control (10 pts). A regular send and a Jito bundle are
*different delivery channels*; having the second one is what keeps you landing when
the public path degrades.

> Scope: this file is about **landing reliability** via bundles, not running an MEV
> strategy. Atomic multi-tx execution and tip auctions are the parts that matter here.

## When a bundle helps

- **Network congestion** — the public mempool path is dropping your txs despite a
  fair fee. A bundle routed to the block engine can land when normal sends stall.
- **Atomicity** — you need several txs to execute **all-or-nothing, in order**
  (e.g. setup + action + cleanup). A bundle guarantees the group lands together or
  not at all.
- **Front-run sensitivity** — keeping a tx out of the public mempool reduces its
  exposure (see `sandwich-slippage.md`).

For a single, non-urgent tx in calm conditions, a bundle is overkill — use the
normal path. Fallback ≠ default.

## How bundles land (the tip)

- A bundle is an ordered list of signed txs submitted to the Jito block engine.
- It lands only if it includes a **tip** — a transfer to a current Jito **tip
  account** — that clears the competitive tip market for that slot.
- The tip is **separate** from the priority fee. Under-tipping is the #1 reason a
  bundle silently never lands. → `playbooks/jito-tip-too-low.md`
- Tip placement matters: put the tip transfer in the bundle per Jito's guidance so
  it's only paid if the bundle is included.

## Building a fallback path

1. Keep your normal send loop (`retry-and-blockhash.md`) as the primary.
2. Detect degradation: rising drop bucket, or you're in a known congestion window.
3. Switch the same logical operation to a bundle: include a tip sized from the
   recent tip market (don't hardcode), submit to the block engine, and poll bundle
   status.
4. Fall back *back* to normal sending when conditions calm — don't pay tips you
   don't need.

## Verify

Confirm the **bundle** landed (bundle status / the txs' signatures on-chain), not
just that you submitted it. If bundles still miss, the tip is the first suspect —
re-check it against the current market, then region/endpoint. →
`playbooks/jito-tip-too-low.md`

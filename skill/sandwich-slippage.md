# Sandwich & Slippage Protection (narrow scope)

MEV is a large field; this skill touches only the slice that shows up as a
**reliability/cost symptom**: trades that revert on slippage, or land at a worse
price because they were sandwiched. Full MEV strategy is out of scope — defer deeper
work to dedicated resources.

## How it presents as a "tx problem"

- A swap **reverts** with a slippage/guard error (e.g. Jupiter `0x1771`). Users read
  this as "my tx failed." Root cause is usually **price moved**, not delivery.
- A swap **lands but fills worse** than quoted. The tx "succeeded" yet the user lost
  value — a reliability problem in the outcome sense.

## Practical protections (in impact order)

1. **Set a real slippage tolerance.** Too tight ⇒ constant reverts; too loose ⇒
   sandwich room. Size it to the pair's volatility, not a blanket 0.5%/inf.
2. **Keep the tx out of the public mempool** for sensitive trades — route via a
   Jito bundle (`jito-fallback.md`) so a searcher can't see and wrap it.
3. **Fresh quotes + tight validity.** Quote immediately before send and keep the
   blockhash window short (`retry-and-blockhash.md`) so the price can't drift far
   between quote and land.
4. **Size for impact.** Large orders move price; split or use an aggregator's
   route that accounts for impact rather than eating it as "slippage."

## Diagnosing a slippage revert

```
Diagnosis:   slippage guard tripped (price moved between quote and execution)
             — this is a market/MEV symptom, not under-pricing or a stale blockhash
Evidence:    custom program error <e.g. 0x1771> + the swap program in logs
Prescribe:   1. re-quote right before send; tighten blockhash window
             2. for size/sensitivity, route via a private bundle
             3. set slippage to the pair's realistic volatility band
Verify:      revert rate on that route drops; realised price sits within tolerance
```

> Why this isn't a pillar: delivery controls (fees, CU, blockhash, retries) help
> *every* Solana app; sandwich protection mostly helps swappers. Kept here as one
> focused file so the skill stays sharp on its core promise: land more, pay less,
> debug fast.

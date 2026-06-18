# Priority Fees

The other top killer. The goal is **dynamic, percentile-based, urgency-aware**
pricing — not a constant, and not always-max.

## How the fee works

- Priority fee is set via `SetComputeUnitPrice(microLamports)` (per CU) and totals
  `CU_limit × CU_price ÷ 1e6` lamports, **on top of** the 5000 lamports/signature
  base fee.
- Validators order pending txs partly by fee-per-CU, so a fair price buys
  scheduling priority during contention. In calm conditions a tiny price lands fine.

## Estimating the right price

Two good sources — prefer the Helius estimate (ships in the kit) and cross-check:

1. **Helius `getPriorityFeeEstimate`** — returns level-based estimates (e.g.
   low/medium/high/veryHigh) and can be scoped to the **accounts your tx writes**,
   which is what actually matters under contention. Use the account-scoped estimate,
   not a global one.
2. **`getRecentPrioritizationFees` (RPC)** — returns recent per-slot fees; compute a
   percentile (P50–P75) over the relevant accounts. Good as a fallback / sanity check.

## A percentile strategy, not a constant

Map urgency to a percentile and let the value float with the network:

| Urgency | Target | Notes |
|---|---|---|
| Background / non-urgent | ~P50, account-scoped | cheapest that still lands off-peak |
| Normal user action | ~P75, account-scoped | default for most apps |
| Time-critical (liquidation, arb, mint) | P90+ or Helius `veryHigh`, **capped** | pay up, but cap so a fee spike can't drain you |

**Always cap.** A max CU price protects you from a momentary network spike turning
one tx into a catastrophic fee. The cap is a circuit breaker, not a target.

## Don't overpay (the other half of reliability)

- Pair every price decision with a correctly-sized **CU limit**
  (`compute-budget.md`) — price × limit is what you actually pay.
- Always-max ("just set it very high") is the most common overpay anti-pattern.
  If P75 lands, paying P99 is pure waste — measure it with the fee-efficiency
  metric in `measuring-reliability.md`.

## Verify

After deploying a percentile strategy, re-measure: landing rate should hold or
improve while median CU price paid drops toward the network percentile you targeted.

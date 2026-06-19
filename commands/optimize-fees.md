---
description: Tune priority fees and compute budget to land reliably without overpaying.
argument-hint: "[code path | 'live: <wallet>' | description of the tx]"
---

# /optimize-fees

Optimise the fee + compute setup for `$ARGUMENTS` to **land reliably and stop
overpaying**. From the solana-tx-sre skill (paths relative to its installed root,
`skills/solana-tx-sre/`), load `skill/priority-fees.md`, `skill/compute-budget.md`,
and `skill/measuring-reliability.md`.

## Steps
1. **Size the CU limit** from simulation (`unitsConsumed × ~1.15`). Flag an unset
   limit (silent 200k default) or an oversized one (headroom waste).
2. **Set a percentile fee strategy** — account-scoped P50/P75/P90+ by urgency, with
   a hard cap. Replace any static/always-max constant.
3. **If live data is available**, measure current fee-efficiency: paid CU price vs
   network percentile, and headroom waste. Quantify the overpay.
4. **Report** both sides:
   ```
   Compute limit:  <current → recommended>  (headroom: <waste>)
   Fee strategy:   <current → percentile + cap>
   [live] Overpay: <paid vs Pxx; est. waste>
   Net effect:     lands competitively at ~<lower> cost (re-measure to confirm)
   ```

## Rules
- Reliability is two-sided: don't trade overpay for landing or vice-versa.
- Always include the cap — it's the circuit breaker against fee spikes.
- Quote overpay only from measured data; otherwise describe the method to measure it.

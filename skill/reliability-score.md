# Reliability Score

A single, **transparent, reproducible** number (0–100) that grades how well a
sending setup is engineered to land transactions cheaply and reliably.

> The score is only credible if it is *derived*, never *vibed*. Always show the
> per-control breakdown that sums to the number. If you cannot inspect a control,
> mark it `unknown` and say so — do not guess it into the score.

## The rubric

Seven controls, weighted by their impact on landing rate and cost. Award full,
partial, or zero points per control based on what you observe in the code or runtime.

| # | Control | Weight | Full points when… | Zero when… |
|---|---|--:|---|---|
| 1 | **Fee strategy** | 20 | CU price set dynamically from a recent percentile (e.g. Helius estimate or `getRecentPrioritizationFees` P50–P75), adapted to urgency | No priority fee, or a hardcoded constant |
| 2 | **Compute budget** | 15 | CU *limit* set explicitly from simulation/measurement (+ small margin) | Unset (silent 200k/ix default) or a guessed static value |
| 3 | **Blockhash management** | 15 | Fresh blockhash fetched right before send; `lastValidBlockHeight` tracked; durable nonce where the flow needs longevity | Blockhash fetched far ahead of send or reused |
| 4 | **Retry / rebroadcast** | 20 | Same signed tx rebroadcast on an interval until confirmed or `lastValidBlockHeight` passes; `maxRetries:0` + own loop on a reliable path | Single `sendTransaction` with no rebroadcast |
| 5 | **Pre-flight simulation** | 10 | Simulate before send; surface logs/CU; gate on failure | Never simulates, or blindly `skipPreflight` everywhere |
| 6 | **Confirmation tracking** | 10 | Polls `getSignatureStatuses` to a defined commitment with a bounded timeout tied to blockhash validity | Fire-and-forget, or unbounded waits |
| 7 | **Congestion fallback** | 10 | Has a Jito-bundle (or staked-connection / Sender) path for congested windows | No fallback; same path in all conditions |
|   | **Total** | **100** | | |

## Bands

| Score | Band | Meaning |
|--:|---|---|
| 85–100 | **Production-grade** | Engineered for reliability; tune at the margins |
| 65–84 | **Solid, with gaps** | Lands most of the time; specific controls missing |
| 40–64 | **Fragile** | Works until the network gets busy, then degrades |
| 0–39 | **At risk** | Default/naive sending; expect frequent drops & overpay |

## How to compute it

1. Inspect the send path (code) and/or the runtime behaviour (data).
2. Score each of the 7 controls; write the points and the one-line reason.
3. Sum. Place in a band.
4. List the **point-losers in descending order** — that ordering *is* the
   prescription priority. Route each to its topic file/playbook.
5. If asked for a "projected" score, recompute the rubric **as if** the prescribed
   controls were added, and label it projected. The delta is honest because it is
   just the sum of the weights you'd recover — not a guessed landing percentage.

## Output shape

```
Reliability Score: 58/100  (Fragile)

  Fee strategy ............ 8/20   static CU price, not percentile-based
  Compute budget .......... 0/15   no CU limit set (silent 200k default)
  Blockhash mgmt .......... 15/15  fresh fetch before send, height tracked
  Retry/rebroadcast ....... 0/20   single send, no rebroadcast
  Simulation .............. 10/10  simulates and gates on failure
  Confirmation tracking ... 10/10  polls statuses with timeout
  Congestion fallback ..... 15/15  Jito fallback present
                            -----
                            58/100

Fix in this order (recovers the most points first):
  1. Retry/rebroadcast (+20)  → skill/retry-and-blockhash.md
  2. Compute budget   (+15)  → skill/compute-budget.md
  3. Fee strategy     (+12)  → skill/priority-fees.md

Projected after fixes: 100/100 (Production-grade)
  — this delta is the sum of recovered control weights, not a predicted landing %.
```

> Separation of concerns: the **score** grades the *setup* (what controls exist).
> The **landing rate** in `measuring-reliability.md` grades the *outcome* (from real
> data). Report both; never substitute one for the other.

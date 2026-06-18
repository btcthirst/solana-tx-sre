# Example: `/reliability-audit` output

A representative run on a hypothetical trading bot repo. Illustrative — the numbers in
the **live** section would come from real on-chain data via the Helius MCP; the static
score comes from the rubric in `skill/reliability-score.md`. Shown here so reviewers
can see the shape of the output without running it.

---

```
/reliability-audit https://github.com/acme/sol-arb-bot
```

```
Transaction Reliability Audit — acme/sol-arb-bot
Mode: both (static code audit + live runtime audit over signer Hx9…7Qd)

Reliability Score: 52/100  (Fragile)

  Fee strategy ............ 8/20   hardcoded 50_000 µLamports/CU constant, not percentile
  Compute budget .......... 0/15   no SetComputeUnitLimit (silent 200k/ix default)
  Blockhash mgmt .......... 15/15  fresh getLatestBlockhash before each send, height tracked
  Retry/rebroadcast ....... 0/20   single sendRawTransaction, no rebroadcast loop
  Simulation .............. 4/10   simulates only on first build, not before resend
  Confirmation tracking ... 10/10  polls getSignatureStatuses with a bounded timeout
  Congestion fallback ..... 15/15  Jito bundle path present for busy windows
                            -----
                            52/100

Findings (highest impact first):
  - No rebroadcast loop (−20) — a single send drops under contention; the tx is never
    re-sent within its validity window.                  → skill/retry-and-blockhash.md
  - No CU limit (−15) — relies on the 200k/ix default; complex routes risk
    "Computational budget exceeded" and lose scheduling priority.
                                                          → skill/compute-budget.md
  - Static fee (−12) — 50k constant ignores network state; overpays when calm,
    underpays (drops) when hot.                           → skill/priority-fees.md

Measured landing rate: 71.4%  (over 500 recent submits, client-side logs)
Failure buckets (28.6% of submits):
  dropped / under-priced ....... 51%   (no on-chain record; from send logs)
  stale blockhash / expired .... 22%
  custom_6001 (slippage) ....... 18%   → market/MEV, see sandwich-slippage.md
  ComputeBudgetExceeded ........  9%
Fee-efficiency (500 confirmed):
  median CU price paid ......... 50,000 µLamports/CU  (the hardcoded constant)
  network P75 (same window) .... 16,800 µLamports/CU  → ~3x overpay when calm
  median CU headroom ........... n/a   (no limit set — can't bound the spend)

Prescription (priority order):
  1. Add the rebroadcast loop (+20)  → skill/retry-and-blockhash.md
     Addresses the 51% dropped + 22% stale buckets (most failures are delivery, not logic).
  2. Set CU limit from simulation (+15)  → skill/compute-budget.md
     Clears the 9% ComputeBudgetExceeded bucket; restores scheduling priority.
  3. Switch to account-scoped P75 fee with a cap (+12)  → skill/priority-fees.md
     Cuts the ~3x calm-window overpay and prices competitively when hot.

Projected score after fixes: 99/100 (Production-grade)
  — this delta is the sum of recovered control weights (20+15+12), NOT a predicted
    landing %. Re-measure landing rate after deploying to confirm the buckets shrank.
```

> Note how the report keeps the **score** (setup) and the **landing rate** (outcome)
> separate, attributes failures to measured buckets, and labels the projection as
> recovered control-weights rather than a fabricated "71% → 97%".

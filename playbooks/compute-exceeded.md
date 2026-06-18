# Playbook: Compute Budget Exceeded

**Trigger:** error contains `Computational budget exceeded` / "exceeded CUs" /
"Program failed to complete" tied to compute, or "exceeded maximum number of
instructions."

## What it means
The tx consumed more compute units than its limit. Either the CU limit was unset
(silent **200,000 per instruction** default) and the real work needs more, or the
explicit limit was sized too low for current account state.

## Procedure
1. **Get the real number.** Simulate the exact tx (`simulateTransaction`) and read
   `unitsConsumed`, or read `meta.computeUnitsConsumed` from a failed run.
   → `skill/simulation.md`
2. **Set the limit explicitly** with `SetComputeUnitLimit`, sized to
   `ceil(unitsConsumed × 1.15)`. → `skill/compute-budget.md`
3. **Watch for state-dependent cost.** If consumption varies with account state
   (e.g. more accounts/iterations), simulate against realistic worst-case state and
   pad accordingly — don't size to the cheap path.
4. **Cap at the ceiling.** Max is **1,400,000 CU per tx**. If you genuinely need
   more, the work must be split across transactions — no limit value fixes a tx that
   needs >1.4M CU.
5. **Recheck the fee.** Raising the limit raises `limit × price`; confirm the fee is
   still acceptable and the price percentile is right. → `skill/priority-fees.md`

## Verify
Re-simulate: `unitsConsumed` sits under the new limit with margin intact, and the
tx now lands. The CU-exceeded bucket disappears from `skill/measuring-reliability.md`.

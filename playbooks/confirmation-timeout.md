# Playbook: Confirmation Timeout

**Trigger:** the tx was sent (and may even have landed on-chain), but the app's
confirmation logic times out or hangs, so the user sees "pending" forever.

## What it means
Usually a **confirmation-tracking bug**, not a delivery failure: the code waits on a
blockhash that already expired, polls the wrong commitment, or uses an unbounded
wait. Sometimes the tx genuinely never landed — distinguish the two first.

## Procedure
1. **Check on-chain reality.** Look up the signature (`getSignatureStatuses` /
   `getTransaction`). If it's confirmed on-chain, this is a tracking bug. If there's
   no record, treat it as a drop → `playbooks/transaction-dropped.md`.
2. **Bound the wait by blockhash validity.** Tie the confirmation timeout to
   `lastValidBlockHeight`, not an arbitrary fixed sleep. Once the height passes and
   there's no status, the tx is dead — stop waiting and rebuild.
   → `skill/retry-and-blockhash.md`
3. **Poll the right commitment.** Decide `processed` vs `confirmed` vs `finalized`
   deliberately. Waiting for `finalized` when the UX only needs `confirmed` looks
   like a hang. Poll `getSignatureStatuses` on an interval.
4. **Avoid deprecated blocking waits.** Prefer explicit status polling against the
   deadline over opaque "confirmTransaction and hope" patterns.
5. **Surface the real state to the user.** "Confirmed", "still trying (Xs left in
   window)", or "expired — resubmitting" — never an indefinite spinner.

## Verify
Confirmations resolve within the blockhash window or fail fast with a clear reason.
The confirmation-timeout bucket clears in `skill/measuring-reliability.md`, and no
tx is reported pending past its `lastValidBlockHeight`.

# Playbook: Transaction Dropped (no status, no record)

**Trigger:** you submitted a tx, got a signature back, but it never reaches any
status and never appears on-chain — it silently vanished.

## What it means
The tx was dropped before inclusion: either it was **under-priced** for current
contention, it was **not rebroadcast** and the single send didn't reach the leader,
or the RPC didn't forward/retain it. No on-chain record exists, so on-chain-only
metrics undercount these — count them client-side.

## Procedure
1. **Rule out expiry first.** If it's also throwing `BlockhashNotFound`, do that
   playbook — drops and expiry often co-occur.
2. **Add rebroadcast.** The dominant fix: resend the same signed tx on a ~2s cadence
   until confirmed or past `lastValidBlockHeight`. A single `sendTransaction` is not
   delivery. → `skill/retry-and-blockhash.md`
3. **Price for contention.** Set an account-scoped P75 CU price (cap it) so the tx
   is competitive when accounts are hot. → `skill/priority-fees.md`
4. **Size the CU limit** so it isn't dropped for an under-provisioned budget, and so
   it isn't deprioritised by an oversized one. → `skill/compute-budget.md`
5. **Use a reliable send path.** A staked connection / Helius Sender, or
   `maxRetries: 0` with your own loop, beats relying on a public RPC's opaque retries.
6. **Add a congestion fallback.** If drops cluster in busy windows, route through a
   Jito bundle during those windows. → `skill/jito-fallback.md`

## Verify
Client-side landing rate (`skill/measuring-reliability.md`) rises and the
dropped/under-priced bucket shrinks. Confirm via `getSignatureStatuses`, not by
assuming the send succeeded.

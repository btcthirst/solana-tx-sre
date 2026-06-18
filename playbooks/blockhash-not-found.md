# Playbook: BlockhashNotFound

**Trigger:** error contains `BlockhashNotFound` / "Blockhash not found", or txs
fail after sitting in a retry loop.

## What it means
The leader could not find your tx's `recentBlockhash` in its recent set — almost
always because the blockhash **expired** (older than 150 slots / ~60–90s) before the
tx was processed. Either the build/sign/send path was too slow, or a retry loop kept
resending a tx whose window had already passed.

## Procedure
1. **Confirm it's expiry, not a bad fetch.** Check how long elapsed between
   `getLatestBlockhash` and send. >~60s ⇒ expiry. Near-zero ⇒ suspect a misconfigured
   RPC/cluster (fetching from a different cluster than you send to).
2. **Fetch late, send fast.** Move `getLatestBlockhash` to *immediately* before
   signing. Don't fetch at app start and reuse.
3. **Track the deadline.** Capture `lastValidBlockHeight`; in the retry loop, stop
   the moment `getBlockHeight() > lastValidBlockHeight`. → `skill/retry-and-blockhash.md`
4. **Rebuild on death.** Past the deadline, get a fresh blockhash, **resign**, and
   restart the loop with the new signed tx.
5. **If the flow is inherently slow** (offline/multisig/queued signing), switch to a
   **durable nonce** so there's no 150-slot deadline. → `skill/retry-and-blockhash.md`
6. **Match commitment to cluster.** Fetch the blockhash from the same RPC/cluster you
   send to; a mismatched or lagging RPC can hand you a hash the target doesn't know.

## Verify
Re-measure (`skill/measuring-reliability.md`): the `BlockhashNotFound` /
stale-blockhash bucket should drop to ~zero. If it persists with near-zero elapsed
time, the cause is RPC/cluster mismatch, not timing — fix the endpoint.

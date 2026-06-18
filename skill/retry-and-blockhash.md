# Retry, Rebroadcast & Blockhash

The single highest-weighted control in the score (20 pts), and the cause behind most
`BlockhashNotFound` and "tx disappeared" reports.

## Why transactions need rebroadcasting

A submitted tx is not guaranteed to reach or be retained by the current leader.
During contention it can be dropped before inclusion. The fix is not "send harder"
once — it's **rebroadcast the same signed transaction** until it's confirmed or
provably dead.

## Blockhash lifetime (the hard deadline)

- A transaction's `recentBlockhash` is valid for **150 slots** (~60–90 seconds).
- `getLatestBlockhash` returns `lastValidBlockHeight` — the **last block height** at
  which the tx can still land. This is your retry deadline.
- Past that height, the tx is **dead**: it can never land, and resending it yields
  `BlockhashNotFound`. Stop, build a fresh tx with a new blockhash, resign, restart.

## The correct send loop

```
1. blockhash, lastValidBlockHeight = getLatestBlockhash(commitment="confirmed")
2. sign tx with that blockhash
3. sendRawTransaction(tx, { skipPreflight: <after you've simulated>, maxRetries: 0 })
4. loop every ~2s:
       - getSignatureStatuses([sig])  → confirmed? done.
       - else resend the SAME raw tx   (idempotent: same signature)
       - if getBlockHeight() > lastValidBlockHeight → tx is dead, break
5. on death: rebuild with fresh blockhash, resign, go to 1
```

Key points:
- **`maxRetries: 0` + your own loop** gives you control over cadence and the
  deadline, instead of relying on the RPC's opaque internal retries.
- **Resending the same signed tx is safe** — identical signature ⇒ the network
  dedupes; it cannot double-execute.
- **Never** retry past `lastValidBlockHeight`. Retrying a dead tx is the classic
  `BlockhashNotFound` loop. → `playbooks/blockhash-not-found.md`

## Durable nonces (when 60–90s isn't enough)

For flows that can't sign-and-send within the blockhash window — offline signing,
multisig collection (e.g. Squads), scheduled/queued execution — use a **durable
nonce** instead of a recent blockhash:

- Create a nonce account; use its stored nonce as the tx's `recentBlockhash`.
- The first instruction must be `advanceNonceAccount` (advances the nonce so the tx
  can't replay).
- The tx stays valid until the nonce is advanced — no 150-slot deadline.
- Trade-off: extra account + the discipline that each nonce is single-use. Use only
  where longevity is actually needed; recent blockhash is simpler for live sends.

## Verify

After deploying the loop: `BlockhashNotFound` should vanish from your failure
buckets (`measuring-reliability.md`), and dropped-tx counts fall because the
rebroadcast covers transient drops within the validity window.

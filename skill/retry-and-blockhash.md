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

## Reference implementation (web3.js v1)

> Shown with `@solana/web3.js` v1 (stable, ubiquitous). On the 2026 stack
> **`@solana/kit`** is the preferred client; the same methodology maps over — confirm
> exact method names via the solana-dev MCP (`skill/resources.md`). `signed` is an
> already-simulated, signed `VersionedTransaction` built with a fresh blockhash.

```ts
import { Connection, VersionedTransaction } from "@solana/web3.js";

async function sendAndConfirm(
  connection: Connection,
  signed: VersionedTransaction,
  lastValidBlockHeight: number,
): Promise<string> {
  const raw = signed.serialize();
  const opts = { skipPreflight: true, maxRetries: 0 }; // already simulated; we own retries
  const sig = await connection.sendRawTransaction(raw, opts);

  while (true) {
    const { value } = await connection.getSignatureStatuses([sig]);
    const status = value[0];
    if (status?.confirmationStatus === "confirmed" ||
        status?.confirmationStatus === "finalized") {
      if (status.err) throw new Error(`tx failed on-chain: ${JSON.stringify(status.err)}`);
      return sig;                                            // landed
    }
    if (await connection.getBlockHeight("confirmed") > lastValidBlockHeight) {
      throw new BlockhashExpiredError(sig);                  // dead → rebuild w/ fresh hash
    }
    await connection.sendRawTransaction(raw, opts);          // rebroadcast SAME signed tx
    await new Promise((r) => setTimeout(r, 2000));
  }
}

class BlockhashExpiredError extends Error {
  constructor(sig: string) { super(`blockhash expired before confirmation: ${sig}`); }
}
```

Resending the same `raw` is idempotent — identical signature, so the network dedupes
and it cannot double-execute. On `BlockhashExpiredError`, fetch a fresh blockhash,
**resign**, and call again.

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

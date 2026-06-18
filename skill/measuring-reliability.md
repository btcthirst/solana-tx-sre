# Measuring Reliability (from real on-chain data)

The score grades your *setup*; this grades your *outcome*. Numbers here must come
from actual data — this is what lets you say a real "72%" instead of a made-up one.

The kit ships the **Helius MCP** (DAS API, enhanced transactions, priority-fee
estimate, RPC). Prefer it for pulling history; plain RPC works too.

## 1. Landing rate

> **Landing rate = confirmed transactions ÷ submitted attempts**, over a window.

The honest definition counts **submitted** attempts, not just on-chain results — a
tx that dropped before landing left no on-chain record, so on-chain data alone
undercounts failures. Two measurement modes:

- **Client-side truth (best).** If the user logs every `sendTransaction` attempt
  and its final status, compute the rate directly from their logs. This captures
  drops. Ask for these logs first.
- **On-chain approximation.** Pull recent signatures for the signer
  (`getSignaturesForAddress` / Helius) and split by `err == null` vs `err != null`.
  This measures *on-chain failures* (e.g. CU exceeded, slippage) but **misses
  silent drops** — state that caveat whenever you use it.

## 2. Failure attribution (the bucket breakdown)

For each failed tx in the window, classify by `meta.err` and the last meaningful
`meta.logMessages` line. Aggregate into the buckets the diagnostics engine uses:

```
stale blockhash / expired   (BlockhashNotFound, or never-landed after height)
dropped / under-priced      (submitted, no status, no record)
CU exceeded                 (Computational budget exceeded)
account-in-use / contention (AccountInUse)
program/slippage error      (custom err e.g. 0x1771)
other
```

This breakdown is the input to the systemic branch in `diagnostics.md`. Without it,
do not assign failure percentages.

## 3. Fee-efficiency (the "am I overpaying?" metric)

Reliability is two-sided: landing *and* cost. Most setups overpay.

For confirmed txs in the window, read each tx's actual `fee` (lamports) and
`meta.computeUnitsConsumed`. Then:

- **CU price paid** ≈ `(fee − 5000 base) / computeUnitsConsumed` (microLamports/CU,
  base signature fee is 5000 lamports/signature).
- **Headroom waste** = `CU_limit_set − computeUnitsConsumed`. A large gap means the
  CU *limit* is oversized; even at a fair price you reserve fees you don't use, and
  an oversized limit can lower scheduling priority.
- **Overpay signal** = your paid CU price vs. the contemporaneous network percentile
  (compare to `getRecentPrioritizationFees` / Helius estimate for that slot range).
  Paying P95 when P75 was landing fine = burning money.

Report it plainly:
```
Fee-efficiency (last 500 confirmed):
  median CU price paid ...... 42,000 µLamports/CU
  network P75 (same window) . 18,000 µLamports/CU   → ~2.3x overpay
  median CU headroom ........ 210k unused of 400k limit → limit oversized
  est. monthly waste ........ <attempts × overpay × CU> — show the arithmetic
```

## Reference implementation

```ts
import { Connection, PublicKey } from "@solana/web3.js";

// On-chain failure buckets. NOTE: stale-blockhash / dropped txs usually never land,
// so they do NOT appear here — count those from client-side send logs (caveat above).
async function onChainFailureBuckets(connection: Connection, signer: PublicKey, limit = 500) {
  const sigs = await connection.getSignaturesForAddress(signer, { limit });
  const buckets: Record<string, number> = {};
  let confirmed = 0;

  for (const s of sigs) {
    if (!s.err) { confirmed++; continue; }
    const ie = (s.err as any)?.InstructionError?.[1];
    let key = "other";
    if (ie?.Custom !== undefined) key = `custom_${ie.Custom}`;   // e.g. slippage guard (6001 → 0x1771)
    else if (typeof ie === "string") key = ie;                  // e.g. "ComputeBudgetExceeded"
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return { onChainLandRate: confirmed / sigs.length, buckets, sampled: sigs.length };
}

// Fee-efficiency for one confirmed tx: microLamports/CU actually paid.
function cuPricePaid(feeLamports: number, computeUnitsConsumed: number, signatures = 1): number {
  const base = 5000 * signatures;                                // base fee per signature
  return ((feeLamports - base) * 1_000_000) / computeUnitsConsumed;
}
```

## 4. Define an SLO (optional, the SRE move)

Turn reliability into a target instead of a vibe:

- **SLI** — the metric: "fraction of submits confirmed within 2 blocks."
- **SLO** — the target: "99% of submits confirm within 2 blocks, weekly."
- **Error budget** — `1 − SLO` (here 1%). When the budget burns down, the
  diagnostics engine tells you *which bucket* is spending it.

This framing is what makes the skill an operations tool, not a guide: you measure,
you target, you attribute regressions to a bucket, you fix the biggest spender.

## Verification habit

After any prescribed fix, **re-measure the same window size** and compare buckets.
"Fixed" means the targeted bucket shrank in real data — not that the advice sounded
right.

import { Connection, PublicKey } from "@solana/web3.js";

// Mirror of skill/measuring-reliability.md — on-chain failure buckets + fee-efficiency.

export async function onChainFailureBuckets(
  connection: Connection,
  signer: PublicKey,
  limit = 500,
): Promise<{ onChainLandRate: number; buckets: Record<string, number>; sampled: number }> {
  const sigs = await connection.getSignaturesForAddress(signer, { limit });
  const buckets: Record<string, number> = {};
  let confirmed = 0;

  for (const s of sigs) {
    if (!s.err) {
      confirmed++;
      continue;
    }
    const ie = (s.err as any)?.InstructionError?.[1];
    let key = "other";
    if (ie?.Custom !== undefined) key = `custom_${ie.Custom}`;
    else if (typeof ie === "string") key = ie;
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return { onChainLandRate: confirmed / sigs.length, buckets, sampled: sigs.length };
}

export function cuPricePaid(feeLamports: number, computeUnitsConsumed: number, signatures = 1): number {
  const base = 5000 * signatures;
  return ((feeLamports - base) * 1_000_000) / computeUnitsConsumed;
}

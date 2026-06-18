import { Connection, VersionedTransaction } from "@solana/web3.js";

// Mirror of skill/retry-and-blockhash.md — bounded rebroadcast loop.

export class BlockhashExpiredError extends Error {
  constructor(sig: string) {
    super(`blockhash expired before confirmation: ${sig}`);
  }
}

export async function sendAndConfirm(
  connection: Connection,
  signed: VersionedTransaction,
  lastValidBlockHeight: number,
): Promise<string> {
  const raw = signed.serialize();
  const opts = { skipPreflight: true, maxRetries: 0 } as const;
  const sig = await connection.sendRawTransaction(raw, opts);

  while (true) {
    const { value } = await connection.getSignatureStatuses([sig]);
    const status = value[0];
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      if (status.err) throw new Error(`tx failed on-chain: ${JSON.stringify(status.err)}`);
      return sig;
    }
    if ((await connection.getBlockHeight("confirmed")) > lastValidBlockHeight) {
      throw new BlockhashExpiredError(sig);
    }
    await connection.sendRawTransaction(raw, opts);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

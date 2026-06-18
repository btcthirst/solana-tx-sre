import {
  Connection, NonceAccount, PublicKey, SystemProgram,
  TransactionInstruction, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";

// Mirror of skill/retry-and-blockhash.md — durable nonce build path.

export async function buildDurableTx(
  connection: Connection,
  noncePubkey: PublicKey,
  nonceAuthority: PublicKey,
  payer: PublicKey,
  ixs: TransactionInstruction[],
): Promise<VersionedTransaction> {
  const info = await connection.getAccountInfo(noncePubkey);
  if (!info) throw new Error("nonce account not found");
  const nonceAccount = NonceAccount.fromAccountData(info.data);

  const msg = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: nonceAccount.nonce, // the durable nonce, not a live blockhash
    instructions: [
      SystemProgram.nonceAdvance({ noncePubkey, authorizedPubkey: nonceAuthority }), // MUST be first
      ...ixs,
    ],
  }).compileToV0Message();
  return new VersionedTransaction(msg);
}

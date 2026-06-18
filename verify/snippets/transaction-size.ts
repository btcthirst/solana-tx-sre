import {
  AddressLookupTableAccount, Connection, PublicKey,
  TransactionInstruction, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";

// Mirror of skill/transaction-size.md — v0 transaction with Address Lookup Tables.

export async function buildV0WithLookups(
  connection: Connection,
  payer: PublicKey,
  ixs: TransactionInstruction[],
  lookupTableAddresses: PublicKey[],
): Promise<VersionedTransaction> {
  const resolved = await Promise.all(
    lookupTableAddresses.map((a) => connection.getAddressLookupTable(a)),
  );
  const luts = resolved
    .map((r) => r.value)
    .filter((v): v is AddressLookupTableAccount => v !== null);

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const msg = new TransactionMessage({
    payerKey: payer, recentBlockhash: blockhash, instructions: ixs,
  }).compileToV0Message(luts);
  return new VersionedTransaction(msg);
}

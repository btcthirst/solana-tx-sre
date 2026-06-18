import {
  ComputeBudgetProgram, Connection, PublicKey, TransactionInstruction,
  TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";

// Mirror of skill/compute-budget.md — size CU limit from simulation, set price.

export async function buildWithBudget(
  connection: Connection,
  payer: PublicKey,
  ixs: TransactionInstruction[],
  cuPriceMicroLamports: number,
): Promise<VersionedTransaction> {
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const probe = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer, recentBlockhash: blockhash, instructions: ixs,
    }).compileToV0Message(),
  );
  const sim = await connection.simulateTransaction(probe, { sigVerify: false });
  if (sim.value.err) throw new Error(`sim failed: ${JSON.stringify(sim.value.err)}`);
  const consumed = sim.value.unitsConsumed ?? 200_000;

  const cuLimit = Math.min(Math.ceil(consumed * 1.15), 1_400_000);

  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer, recentBlockhash: blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPriceMicroLamports }),
        ...ixs,
      ],
    }).compileToV0Message(),
  );
}

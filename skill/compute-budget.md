# Compute Budget

Wrong CU sizing is one of the top two silent killers (the other is fee strategy).
Two separate knobs, set by two separate instructions from the Compute Budget program.

## The two knobs

| Instruction | Sets | Default if unset |
|---|---|---|
| `SetComputeUnitLimit(units)` | Max CUs the tx may consume | **200,000 per instruction**, capped at **1,400,000 per tx** |
| `SetComputeUnitPrice(microLamports)` | Priority fee *rate*, per CU | 0 (no priority) — see `priority-fees.md` |

**Priority fee (lamports) = `CU_limit × CU_price` ÷ 1,000,000.** The *limit*, not
the consumed amount, is what you reserve and what the scheduler sees. This is why
an oversized limit costs you twice: wasted reserved fee **and** weaker scheduling.

## Sizing the limit correctly

1. **Simulate** the exact tx (`simulateTransaction`) and read
   `unitsConsumed` (or read `meta.computeUnitsConsumed` from a recent real run).
2. **Add a margin** — ~10–15% (or a small fixed pad) to absorb account-state
   variance between simulation and execution. Not 2×; that reintroduces the waste.
3. **Set the limit explicitly** to that value. Never ship the silent default and
   never ship a guessed round number.

```
limit ≈ ceil(unitsConsumed × 1.15)
```

## Common failure modes

- **Limit unset → `Computational budget exceeded`** when a real tx needs >200k for
  an instruction. Cause of many "works locally, fails in prod" reports.
  → `playbooks/compute-exceeded.md`
- **Limit oversized** → you reserve fee you never spend and may land *slower*.
  Detect via the headroom metric in `measuring-reliability.md`.
- **Limit set, price unset** → correctly bounded but no priority; drops under load.
  → `priority-fees.md`

## Reference implementation (web3.js v1)

```ts
import {
  ComputeBudgetProgram, Connection, TransactionMessage,
  VersionedTransaction, TransactionInstruction, PublicKey,
} from "@solana/web3.js";

async function buildWithBudget(
  connection: Connection,
  payer: PublicKey,
  ixs: TransactionInstruction[],
  cuPriceMicroLamports: number,            // from priority-fees.md
): Promise<VersionedTransaction> {
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  // 1. simulate to measure REAL consumption (see simulation.md)
  const probe = new VersionedTransaction(new TransactionMessage({
    payerKey: payer, recentBlockhash: blockhash, instructions: ixs,
  }).compileToV0Message());
  const sim = await connection.simulateTransaction(probe, { sigVerify: false });
  if (sim.value.err) throw new Error(`sim failed: ${JSON.stringify(sim.value.err)}`);
  const consumed = sim.value.unitsConsumed ?? 200_000;

  // 2. size the limit with a ~15% margin (not 2× — that reintroduces waste)
  const cuLimit = Math.min(Math.ceil(consumed * 1.15), 1_400_000); // respect the per-tx cap

  // 3. prepend the budget instructions (cheap; they configure the tx)
  return new VersionedTransaction(new TransactionMessage({
    payerKey: payer, recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPriceMicroLamports }),
      ...ixs,
    ],
  }).compileToV0Message());
}
```

## Ordering & placement

- Put the Compute Budget instructions **first** in the transaction; they configure
  the tx and are cheap.
- Account for their own (small, fixed) CU cost — it's negligible but real.
- One `SetComputeUnitLimit` and one `SetComputeUnitPrice` per tx; later ones don't
  stack, they replace.

## Verify

Re-simulate after setting the limit: `unitsConsumed` should sit comfortably under
your limit with the margin intact, and your fee math should match the
`fee` you observe on a real confirmed tx.

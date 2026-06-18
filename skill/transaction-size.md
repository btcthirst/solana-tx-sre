# Transaction Size & Address Lookup Tables

A reliability failure mode that isn't about fees or blockhash: the transaction is
simply **too big to send**. Common on complex DeFi routes (multi-hop swaps),
batched operations, and anything touching many accounts.

## The hard limit

- A serialized transaction must fit in **~1,232 bytes** (the packet payload limit).
- Every account referenced costs **32 bytes** in a legacy transaction. Signatures,
  the message header, instruction data, and the blockhash also consume the budget.
- Exceed it and the send fails before it ever lands — errors look like
  `Transaction too large: <n> > 1232`, encoding/serialization failures, or "too many
  account locks." This is a *build-time* failure, not a contention/expiry one.

## The fix: versioned transactions + Address Lookup Tables (ALTs)

- **Versioned (v0) transactions** can reference an **Address Lookup Table** — an
  on-chain account that stores a list of addresses. Instead of 32 bytes per account,
  a v0 tx references each looked-up account by a **1-byte index**, collapsing the
  per-account cost dramatically.
- This is how aggregators (e.g. Jupiter) fit long routes into one transaction.
- Workflow: create/extend an ALT with the accounts you reuse, then build a
  `VersionedTransaction` (`compileToV0Message({ addressLookupTableAccounts })`) that
  passes the resolved tables.

```ts
import {
  Connection, PublicKey, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";

async function buildV0WithLookups(
  connection: Connection,
  payer: PublicKey,
  ixs: any[],                       // your TransactionInstruction[]
  lookupTableAddresses: PublicKey[],
): Promise<VersionedTransaction> {
  const luts = (await Promise.all(
    lookupTableAddresses.map((a) => connection.getAddressLookupTable(a)),
  )).map((r) => r.value!).filter(Boolean);

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const msg = new TransactionMessage({
    payerKey: payer, recentBlockhash: blockhash, instructions: ixs,
  }).compileToV0Message(luts);     // ← resolves accounts through the lookup tables
  return new VersionedTransaction(msg);
}
```

> ALTs need a one-time setup (create + extend, which itself costs a tx and a slot for
> warm-up before use). Use them for **recurring** account sets — a route you build
> repeatedly — not for a one-off tx that already fits.

## When this is *not* the answer

- If the tx fits but still fails, it's not a size problem — return to
  `skill/diagnostics.md` (fees, blockhash, CU, contention).
- If a single route genuinely can't fit even with ALTs, the operation must be
  **split across transactions** (and may then need atomicity — see
  `skill/jito-fallback.md`).

## Verify

The serialized tx size drops under 1,232 bytes and it sends successfully. Confirm by
serializing and checking `tx.serialize().length`, and that the v0 message resolves
all accounts (no "address not found in lookup table" errors).

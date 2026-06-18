# verify/ — type-check harness

Every TypeScript snippet shown in the skill (`skill/*.md`) is mirrored here as a real,
compilable module and type-checked against `@solana/web3.js` in CI. This is how the
skill backs its "tested, accurate" claim: the reference code provably compiles.

```bash
cd verify
npm install
npm run typecheck   # tsc --noEmit
```

| Snippet file | Mirrors |
|---|---|
| `snippets/send-and-confirm.ts` | `skill/retry-and-blockhash.md` (rebroadcast loop) |
| `snippets/durable-nonce.ts` | `skill/retry-and-blockhash.md` (durable nonce) |
| `snippets/compute-budget.ts` | `skill/compute-budget.md` |
| `snippets/priority-fees.ts` | `skill/priority-fees.md` |
| `snippets/measuring.ts` | `skill/measuring-reliability.md` |
| `snippets/jito-bundle.ts` | `skill/jito-fallback.md` |
| `snippets/transaction-size.ts` | `skill/transaction-size.md` |

> Not installed by `install.sh` — this directory exists only to prove the snippets
> type-check. Keep the snippets here in sync with the prose if either changes.

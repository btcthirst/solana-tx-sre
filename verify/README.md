# verify/ — type-check harness (single-source)

The TypeScript shown in the skill is **not** copied here by hand. `npm run check`
extracts every ` ```ts ` block straight out of `skill/*.md` into `generated/` and
type-checks *those* against `@solana/web3.js`. So the artifact CI compiles is the
exact prose the model reads — there is no second copy to drift from.

```bash
cd verify
npm install
npm run check        # extract from skill/*.md → generated/ , then tsc --noEmit
```

- `npm run extract`   — regenerate `generated/` from `skill/*.md`
- `npm run typecheck` — `tsc --noEmit` over `generated/`
- `npm run check`     — both, in order (what CI runs)

`generated/` is git-ignored — it is a build artifact, rebuilt on every run. Edit the
code in the `.md` file; never edit `generated/`. A block that stops compiling fails
CI, which means the skill can no longer ship code that doesn't type-check.

| Source block (in `skill/`)        | Covers |
|---|---|
| `compute-budget.md`               | CU limit sizing from simulation |
| `priority-fees.md`                | Helius estimate + `getRecentPrioritizationFees` P75 |
| `retry-and-blockhash.md` (×2)     | rebroadcast loop + durable nonce |
| `measuring-reliability.md`        | on-chain failure buckets + fee-efficiency |
| `jito-fallback.md`                | bundle submit/poll |
| `transaction-size.md`             | versioned tx + Address Lookup Tables |

> Not installed by `install.sh` — this directory exists only to prove the shipped
> snippets type-check.

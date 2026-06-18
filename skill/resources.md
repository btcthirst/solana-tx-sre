# Resources & References

External docs to verify specifics against — APIs and limits change, so confirm the
exact parameter/endpoint names with the live docs (or the Helius MCP / solana-dev
MCP already in the kit) before relying on them.

## Official Solana

- Solana Docs — Transactions, Fees, Compute Budget, Retrying Transactions:
  https://solana.com/docs
- `getLatestBlockhash`, `getRecentPrioritizationFees`, `getSignatureStatuses`,
  `simulateTransaction`, `getTransaction` — RPC method reference:
  https://solana.com/docs/rpc
- Durable nonces guide: https://solana.com/developers/guides

## Helius (ships in the kit as an MCP)

- Priority Fee API (`getPriorityFeeEstimate`):
  https://docs.helius.dev
- Sender (low-latency / staked-connection sending) and enhanced transaction APIs.
- Use the Helius MCP to pull tx history and priority-fee estimates for live
  measurement (`skill/measuring-reliability.md`).

## Jito

- Block engine, bundles, and **current tip accounts** (always read the live list —
  do not hardcode): https://docs.jito.wtf
- Bundle submission and status endpoints; tip market guidance.

## Cross-references inside this skill

- Diagnosis entry point → `skill/diagnostics.md`
- Score rubric → `skill/reliability-score.md`
- Real-data measurement → `skill/measuring-reliability.md`
- Playbooks (per-error runbooks) → `playbooks/`

## Client SDKs (2026 stack)

- **`@solana/kit`** — the current preferred Solana client; the kit favours it for
  client/RPC code. Code samples in this skill use `@solana/web3.js` v1 for stability
  and ubiquity, but the *methodology* is SDK-agnostic and maps directly to
  `@solana/kit`. Confirm exact method names via the solana-dev MCP.
- **`@solana/web3.js`** — still widely deployed; the reference snippets target it.
- **`@solana/web3-compat`** — the bridge when crossing between legacy and kit code.
- **Helius SDK / RPC** — for `getPriorityFeeEstimate`, enhanced transactions, Sender.

## A note on accuracy

This skill encodes *methodology* (how to diagnose, measure, score, prescribe) that
stays stable even as exact API surfaces evolve. When a specific limit or endpoint is
quoted (e.g. 150-slot blockhash validity, 200k default CU/ix, 5000-lamport base
fee), treat it as accurate as of the 2026 stack but verify against the live docs
above before quoting it to a user as a guarantee.

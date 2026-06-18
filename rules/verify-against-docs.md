# Rule: verify volatile specifics against live docs

This skill encodes stable *methodology*, but exact API surfaces and market values
change. Do not quote a volatile specific as a guarantee without checking it.

Verify against the live sources in `skill/resources.md` (or the kit's Helius /
solana-dev MCP) before relying on:

- **API surfaces** — RPC method names/params, Helius `getPriorityFeeEstimate` request
  and response fields, Jito bundle/`sendBundle` endpoints.
- **Live market values** — current Jito **tip accounts** (never hardcode the list)
  and the going tip/fee market.
- **SDK specifics** — `@solana/kit` vs `@solana/web3.js` method equivalents; the
  reference snippets use web3.js v1 and the methodology maps over.

Stable constants you may state (still worth a sanity check): 150-slot blockhash
validity (~60–90s), 200,000 CU/instruction default, 1,400,000 CU/tx cap,
5,000-lamport base fee per signature, ~1,232-byte transaction size limit.

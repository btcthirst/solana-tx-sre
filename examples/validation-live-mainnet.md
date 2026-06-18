# Live validation on mainnet data (Level 2)

Real-data validation of the diagnostics engine: actual failed mainnet transactions
pulled via a Helius RPC, run through `skill/diagnostics.md`. This closes the
"works on real input" half of end-to-end validation; the "a fresh agent auto-routes
the installed skill" half is the manual pass in `docs/validation-checklist.md`.

> RPC redacted: `https://mainnet.helius-rpc.com/?api-key=***`. Captured 2026; exact
> signatures will age out of RPC history but the methodology and error semantics hold.

## Dataset (real, unmodified)

Recent signatures for two of the busiest mainnet programs:

| Account | Sampled | Failed | Failure shape |
|---|--:|--:|---|
| Jupiter v6 aggregator (`JUP6Lkb…VTaV4`) | 200 | **104** | 100% `InstructionError [_, {Custom: 6001}]` |
| pump.fun ecosystem (`6EF8rrec…wF6P`) | 200 | **178** | `Custom: 1` (72), `Custom: 3` (53), `Custom: 111` (32), `Custom: 7` (14), `Custom: 11` (7) |

Three findings fell straight out of the raw data and **validate the skill's design**:

1. **`Custom 6001` = `0x1771`** — exactly the slippage row in the diagnostics taxonomy.
2. **On-chain failures are dominated by program/custom guards** (slippage and
   program-specific reverts), i.e. *market/logic* outcomes — not delivery faults.
3. **No `BlockhashNotFound` / dropped txs appear at all** — because those never land,
   so they leave no on-chain record. This empirically confirms the silent-drop caveat
   in `skill/measuring-reliability.md`: delivery failures must be counted client-side,
   not from `getSignaturesForAddress`.

## Worked diagnosis A — Jupiter v6 (real tx)

```
signature: 4WFSeTLGLE3xpWMiMTL3cwNYG8Mi8LJetePH6yueDxmmH5pSxHyFq5NRDg6gSQVLL3zS4fyBL3Aah3hMLrv6GmQX
meta.err:  { InstructionError: [4, { Custom: 6001 }] }
fee:       6127 lamports
CU used:   185,930
last log:  "Program JUP6Lkb…VTaV4 failed: custom program error: 0x1771"
```

Engine output (per the diagnostics output contract):

```
Diagnosis:  Slippage guard tripped (custom 6001 / 0x1771) — price moved between quote
            and execution. Market/MEV symptom, NOT a delivery failure: the tx landed,
            ran, consumed 185,930 CU and paid 6127 lamports before the program reverted.
            (confidence: high — custom code + "0x1771" in logs are explicit)
Evidence:   InstructionError Custom 6001 at instruction 4; log line "custom program
            error: 0x1771"; non-zero CU + fee ⇒ it was included and executed.
Prescribe:  1. re-quote immediately before send; keep the blockhash window tight
               → skill/retry-and-blockhash.md
            2. for size/sensitivity, route privately via a Jito bundle
               → skill/jito-fallback.md, skill/sandwich-slippage.md
            3. set slippage to the pair's realistic volatility band
Expected:   revert rate on this route falls; no landing-rate change (never a delivery
            problem).
Verify:     track the custom_6001 bucket in measuring-reliability after tightening the
            quote→send window / going private.
```

## Worked diagnosis B — pump.fun ecosystem (real tx)

```
signature: 33rPpC7TctRmXumnHhi7dp7XiDyAycbaxh33YQTsnM21cZqAqw65ch6GsW8RBEUDHqeCFiH8B1mA57c8ZW6p1aYN
meta.err:  { InstructionError: [4, { Custom: 111 }] }
fee:       5580 lamports
CU used:   8,499
last log:  "Program 5kZmvKba…CMoz failed: custom program error: 0x6f"
```

```
Diagnosis:  Program-specific guard reverted (custom 111 / 0x6f) — a program-logic
            condition, not a delivery fault (tx landed, ran, paid a fee).
            (confidence: high for the *classification*; the exact guard meaning is
            program-specific — defer to that program's error table, not this skill)
Evidence:   InstructionError Custom 111; "custom program error: 0x6f"; CU + fee spent.
Prescribe:  This is out of the delivery-reliability lane. Classify into the
            program/custom bucket; hand the specific guard semantics to the program's
            own docs / a security skill. Delivery controls won't change this outcome.
Verify:     n/a for delivery — the bucket is tracked but the fix lives in the caller's
            program-interaction logic.
```

Note B is as important as A: the engine **correctly refuses to over-reach** — it
classifies a program-logic revert and *defers* rather than inventing a delivery fix.

## Conclusion

- ✅ Taxonomy validated on real data (`0x1771` slippage; custom-guard classification).
- ✅ Silent-drop caveat validated empirically (delivery failures absent from on-chain
  history → must be measured client-side).
- ✅ Scope discipline validated (defers program-logic reverts instead of guessing).
- ⏳ Remaining: Level 3 — install into a fresh Claude Code session and confirm the
  harness auto-loads and routes the skill (`docs/validation-checklist.md`).

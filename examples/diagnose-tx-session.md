# Example: `/diagnose-tx` sessions

Two short transcripts showing the diagnostic output contract from `skill/diagnostics.md`.
Illustrative.

---

## A. From an error string

```
/diagnose-tx "sending fails with BlockhashNotFound about half the time under load"
```

```
Diagnosis:  Blockhash expired before the leader processed the tx — a slow/contended
            send path, likely compounded by retrying past the validity window.
            (confidence: high — the error string is unambiguous)
Evidence:   BlockhashNotFound means the recentBlockhash aged out (>150 slots /
            ~60–90s) before processing. "Half the time under load" points to the
            build→sign→send path losing the race when the network is busy.
Prescribe:  1. Fetch the blockhash immediately before signing; track
               lastValidBlockHeight; stop retrying once block height passes it.
               → playbooks/blockhash-not-found.md, skill/retry-and-blockhash.md
            2. On expiry, rebuild with a fresh blockhash and resign (don't resend
               the dead tx — that's the BlockhashNotFound loop).
            3. If signing is inherently slow (offline/multisig/queued), switch to a
               durable nonce. → skill/retry-and-blockhash.md
Expected:   The stale-blockhash failures should approach zero — modelled: that bucket
            is exactly the BlockhashNotFound share you're seeing. Re-measure to confirm.
Verify:     Re-run measuring-reliability over the next ~200 sends; the
            BlockhashNotFound bucket should drop out. If it persists with near-zero
            elapsed time between fetch and send, the cause is an RPC/cluster mismatch
            instead — fix the endpoint.
```

---

## B. From a signature

```
/diagnose-tx 4xQ…u9F
```

```
(fetched via getTransaction)
  meta.err: { InstructionError: [3, { Custom: 6001 }] }
  logs: "...Program log: Error: slippage tolerance exceeded..."
  computeUnitsConsumed: 142,300   fee: 12,300 lamports

Diagnosis:  Slippage guard tripped (custom error 6001 / 0x1771) — the price moved
            between quote and execution. This is a market/MEV symptom, NOT a delivery
            failure: the tx landed and executed; the program rejected it on purpose.
            (confidence: high — the custom code + log line are explicit)
Evidence:   InstructionError Custom 6001 + "slippage tolerance exceeded" in logs; the
            tx consumed CUs and paid a fee, so it was included and ran.
Prescribe:  1. Re-quote immediately before send and keep the blockhash window tight
               so price can't drift far. → skill/retry-and-blockhash.md
            2. For size/sensitivity, route via a private Jito bundle so a searcher
               can't sandwich it. → skill/jito-fallback.md, skill/sandwich-slippage.md
            3. Set slippage to the pair's realistic volatility band — too tight
               causes constant reverts.
Expected:   Revert rate on this route falls; realised price sits within tolerance.
            (No landing-rate change — this was never a delivery problem.)
Verify:     Track the custom_6001 bucket in measuring-reliability; it should shrink
            after tightening the quote→send window and/or going private.
```

> Note: the engine refuses to treat a single signature as a "rate", correctly
> reclassifies a slippage revert as market/MEV rather than a delivery fault, and ties
> every claim to evidence it actually saw.

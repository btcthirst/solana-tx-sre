# Diagnostics Engine

The core of this skill. Turn a raw signal into `root cause → confidence → prescription`.
Do not skip to a fix before completing the diagnosis — an SRE finds the cause first.

## Inputs you can work from

Ask for whatever the user has; you can diagnose from any one of these:

- **A signature** — fetch it (`getTransaction` / Helius `getTransaction`) and read
  `meta.err`, `meta.logMessages`, `meta.computeUnitsConsumed`, fee, and the
  `recentBlockhash`'s age vs. the slot it landed in.
- **An error string / logs** — match against the taxonomy below.
- **A success rate** — e.g. "72% land" → run the *systemic* branch (it is almost
  never one cause; quantify the mix).
- **Code / a send path** — score it with `reliability-score.md`; missing controls
  *are* the diagnosis.

## Symptom → root-cause taxonomy

Match the user's symptom to a row. The "confidence" column is your prior **before**
you look at their data — adjust it once you see logs/signatures.

| Symptom / error (real string) | Likely root cause | Prior | Route |
|---|---|---|---|
| `BlockhashNotFound` | Blockhash expired before the leader processed it (slow build/sign/network, or polling with stale hash) | High | `playbooks/blockhash-not-found.md` |
| No signature status ever; tx "disappears" | Dropped before/at the leader — under-priced, or never forwarded by a lazy RPC | High | `playbooks/transaction-dropped.md` |
| `Transaction simulation failed` on send | Logic/account/CU error caught pre-flight — this is the RPC *saving* you | High | `skill/simulation.md` |
| "exceeded CUs" / `Computational budget exceeded` / `exceeded maximum number of instructions` | CU limit too low (or unset → 200k default) for actual consumption | High | `playbooks/compute-exceeded.md` |
| `AccountInUse` / repeated drops on a hot account | Write-lock contention on a popular account (oracle, AMM pool, mint) | Medium | `playbooks/account-in-use.md` |
| Jito bundle never lands; normal txs are fine | Tip below the market clearing tip, or sent to a non-tip account / wrong region | Medium | `playbooks/jito-tip-too-low.md` |
| Sent OK, but never "confirmed" in app | Confirmation tracking bug: blockhash already expired, or polling the wrong commitment | Medium | `playbooks/confirmation-timeout.md` |
| Custom program error `0x1771` (and similar) | Slippage/guard tripped (e.g. Jupiter) — usually a *price moved* / MEV issue, not delivery | Medium | `skill/sandwich-slippage.md` |
| "Land but cost a fortune" | Static or P99 fee, no CU-limit cap → overpaying | High | `skill/priority-fees.md` |
| `Transaction too large` / encoding fails / "too many account locks" | Tx exceeds ~1,232 bytes — too many accounts for a legacy tx | High | `skill/transaction-size.md` |

## The systemic branch — "success rate is X%"

A low success rate is a **distribution of causes**, not one bug. Resist naming a
single culprit. Instead:

1. **Measure before theorising.** Pull the last N attempts and bucket the failures
   by `meta.err` / drop type (see `skill/measuring-reliability.md`). You cannot
   prescribe weights you have not measured.
2. **Attribute.** Produce a breakdown, e.g.:
   ```
   Failures (28% of 500 attempts):
     stale blockhash / expired ........ 45%
     dropped (under-priced) ........... 35%
     CU exceeded ...................... 12%
     account-in-use (contention) ......  8%
   ```
3. **Prescribe per bucket**, biggest bucket first, routing each to its topic/playbook.
4. **Project conservatively.** State the assumption behind every projected gain
   ("removing the stale-blockhash bucket recovers ~the 45% of failures it causes").
   Never emit a single fabricated "→ 97%" without the arithmetic behind it.

## Output contract

Every diagnosis answer follows this shape (compact — fit it to the question):

```
Diagnosis:   <root cause>  (confidence: high/med/low — based on <what you saw>)
Evidence:    <the log line / signature field / measured bucket that proves it>
Prescribe:   1. <highest-impact fix>  → see <file>
             2. <next>
Expected:    <measured or clearly-modelled improvement, with the assumption stated>
Verify:      <how the user confirms the fix worked>
```

### Worked example

> **User:** "My bot's tx success rate is 72%, lots of BlockhashNotFound."

```
Diagnosis:   Two dominant causes — stale blockhash on a slow send path, plus a
             share of under-priced drops. (confidence: med until we bucket the data)
Evidence:    BlockhashNotFound implies the hash aged out (>~60–90s / 150 blocks)
             between fetch and leader processing.
Prescribe:   1. Fetch blockhash with `processed`/`confirmed` *immediately* before
                send; track lastValidBlockHeight; stop retrying past it.
                → skill/retry-and-blockhash.md + playbooks/blockhash-not-found.md
             2. Set an explicit CU limit from simulation, and a P75 CU price.
                → skill/compute-budget.md + skill/priority-fees.md
             3. Add a Jito-bundle fallback for congested windows.
                → skill/jito-fallback.md
Expected:    Stale-blockhash failures should approach zero (modelled: that bucket
             is the BlockhashNotFound share you measure). Re-measure to confirm.
Verify:      Re-run measuring-reliability.md over the next 200 sends; the
             BlockhashNotFound bucket should drop out and overall rate rise.
```

Note how the example **refuses** to promise an exact "72% → 97%" until the buckets
are measured. That discipline is what separates this skill from a fee guide.

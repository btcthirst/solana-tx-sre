---
description: Diagnose a failed or dropped Solana transaction from a signature, error, or logs.
argument-hint: "<signature | error string | pasted logs>"
---

# /diagnose-tx

Diagnose the transaction problem described in `$ARGUMENTS`. Load the solana-tx-sre
skill's `skill/diagnostics.md` and run the core loop. (Paths below are relative to
the installed skill root, `skills/solana-tx-sre/`.)

## Steps
1. **Gather evidence.** If `$ARGUMENTS` is a signature, fetch it (`getTransaction` /
   Helius) and read `meta.err`, `meta.logMessages`, `meta.computeUnitsConsumed`, fee,
   and blockhash age. If it's an error string or logs, match the taxonomy directly.
2. **Match** the symptom to the root-cause table in `skill/diagnostics.md`.
3. **Route** to the matching `playbooks/*.md` and follow its procedure.
4. **Answer in the output contract:**
   ```
   Diagnosis:  <root cause> (confidence + what you saw)
   Evidence:   <the proving log line / field>
   Prescribe:  1. <fix> → <file>   2. ...
   Expected:   <measured or clearly-modelled improvement, assumption stated>
   Verify:     <how to confirm>
   ```

## Rules
- Lead with the diagnosis, not a lecture.
- One signature is a data point, not a rate — if the user implies a systemic issue,
  switch to the systemic branch and ask for the data to bucket.
- No fabricated percentages.

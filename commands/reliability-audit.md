---
description: Audit a Solana sending setup for transaction-delivery reliability and produce a scored SRE report.
argument-hint: "[repo URL | path | 'live: <wallet/program>']"
---

# /reliability-audit

Run a **Transaction Reliability Audit** on the target in `$ARGUMENTS` (a repo URL, a
local path, or `live: <address>` for runtime data). Produce a security-audit-style
report for *operational* reliability.

Load `skill/reliability-score.md` and `skill/diagnostics.md` first.

## Two modes — declare which you ran

**Static (code) audit** — inspect the send path:
- Detect which of the 7 rubric controls are present/partial/absent (fee strategy, CU
  limit, blockhash mgmt, retry/rebroadcast, simulation, confirmation tracking,
  congestion fallback).
- Score with the rubric. Findings = missing/weak controls. **Do not** emit a
  predicted landing percentage — code can't reveal real landing rate.

**Live (runtime) audit** — when given `live:` or tx logs/history:
- Pull recent history (Helius MCP / RPC) per `skill/measuring-reliability.md`.
- Report the **real** landing rate, failure buckets, and fee-efficiency.
- Combine with the static score for a complete picture.

## Report format

```
Transaction Reliability Audit — <target>
Mode: static | live | both

Reliability Score: <N>/100  (<band>)
  <7-control breakdown, points + one-line reason each>

Findings (highest impact first):
  - <missing/weak control> — <why it costs landings or money> → <file>
  ...

[live mode only]
Measured landing rate: <real %>  (over <N> attempts)
Failure buckets:       <breakdown>
Fee-efficiency:        <paid vs network percentile; headroom waste>

Prescription (priority order):
  1. <fix> (+<pts>) → <file/playbook>
  2. ...

Projected score after fixes: <M>/100
  (delta = recovered control weights; NOT a predicted landing %)
```

## Rules
- Numbers come from data or the rubric. Never fabricate a landing %.
- If a control can't be inspected, mark it `unknown` and exclude from claims.
- Order findings by points recoverable / landing impact, not by file order.

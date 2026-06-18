# Solana Transaction SRE

> **An AI reliability engineer for Solana transactions.** It diagnoses delivery
> failures (symptom → root cause → fix), scores your setup against a transparent
> rubric, measures real landing rate and fee-efficiency from on-chain data, and
> prescribes production-grade fixes — to **land more transactions and pay less**,
> across any Solana app.

A skill for the [Solana AI Kit](https://github.com/solanabr/solana-ai-kit),
structured like [`solana-game-skill`](https://github.com/solanabr/solana-game-skill):
a progressive `SKILL.md` router over focused `.md` files, plus playbooks, commands,
and an agent.

---

## The problem

Failed and dropped transactions are the **#1 day-to-day pain on Solana** — and it
hits *everyone*: DeFi, NFT, GameFi, trading bots, payments, consumer apps. Builders
get `BlockhashNotFound`, silent drops, `Computational budget exceeded`, confirmation
hangs, and surprise fee bills.

The existing ecosystem ships **fragments**: Helius estimates priority fees and offers
Sender; Jito docs explain bundles; Solana docs explain compute budget. But there is
**no single skill that operates transactions like an SRE** — that takes a real signal
("my success rate is 72%") and returns a diagnosis, a score, and a prescription.

This skill is that missing operations layer.

## Why it's different (not "just best practices")

Three things make it a diagnostic *system*, not a doc summary:

1. **A diagnostic engine** — `symptom → root cause (with confidence) → prescription →
   expected improvement`. The center of the whole skill.
2. **A transparent Reliability Score (0–100)** — a *reproducible* weighted rubric over
   7 controls. Every score shows its per-control breakdown; nothing is "vibed."
3. **Real measurement** — landing rate, failure buckets, and fee-efficiency computed
   from **on-chain data** (via the Helius MCP already in the kit). It never fabricates
   a "72% → 97%" number; projections are tied to recovered control-weights or stated
   assumptions.

It is **horizontal**: unlike vertical skills (legal, LP, audit), transaction
reliability is something nearly every Solana project reaches for.

> Scope: transaction **delivery** reliability — landing, fees, compute, blockhash,
> retries, simulation, confirmation, Jito fallback. It is *not* a security/program
> auditor; it defers vulnerability review to the kit's security skills.

## What's inside

```
solana-tx-sre/
├── SKILL.md                     # entry point — progressive router + diagnostic intake
├── skill/
│   ├── diagnostics.md           # ★ core engine: symptom → cause → prescription
│   ├── reliability-score.md     # transparent 0–100 rubric (7 weighted controls)
│   ├── measuring-reliability.md # real landing rate, failure buckets, fee-efficiency, SLOs
│   ├── compute-budget.md        # CU limit & price sizing
│   ├── priority-fees.md         # dynamic percentile fee strategy
│   ├── retry-and-blockhash.md   # rebroadcast loop, blockhash lifetime, durable nonces
│   ├── simulation.md            # pre-flight simulation & skipPreflight nuance
│   ├── jito-fallback.md         # bundle fallback for congestion
│   ├── sandwich-slippage.md     # MEV-as-reliability (narrow scope)
│   ├── transaction-size.md      # tx size limit, versioned tx & Address Lookup Tables
│   └── resources.md             # external docs, SDK note & accuracy note
├── playbooks/                   # SRE runbooks keyed to real Solana errors
│   ├── blockhash-not-found.md
│   ├── transaction-dropped.md
│   ├── compute-exceeded.md
│   ├── account-in-use.md
│   ├── jito-tip-too-low.md
│   └── confirmation-timeout.md
├── commands/
│   ├── reliability-audit.md     # /reliability-audit — scored SRE report (static + live)
│   ├── diagnose-tx.md           # /diagnose-tx — diagnose a signature/error/logs
│   └── optimize-fees.md         # /optimize-fees — tune fees & compute without overpaying
├── agents/
│   └── tx-sre-engineer.md       # the SRE persona
├── rules/                       # enforceable operating rules
│   ├── diagnosis-first.md
│   ├── no-fabricated-numbers.md
│   └── verify-against-docs.md
├── examples/
│   ├── reliability-audit-report.md  # sample /reliability-audit output
│   ├── diagnose-tx-session.md       # sample /diagnose-tx transcripts
│   └── validation-live-mainnet.md   # engine run against real failed mainnet txs
├── verify/                      # CI type-check harness — every TS snippet compiles
│   └── snippets/*.ts            # mirrors of the skill's code, checked by tsc
├── .github/workflows/ci.yml     # tsc --noEmit + install.sh smoke test
├── install.sh                   # non-interactive installer (defaults)
├── install-custom.sh            # interactive installer
└── LICENSE                      # MIT
```

## Tested

Not just prose. CI (`.github/workflows/ci.yml`) runs on every push/PR:

- **`tsc --noEmit`** over `verify/snippets/*.ts` — every TypeScript snippet shown in
  the skill is mirrored as a real module and **provably compiles** against
  `@solana/web3.js`. Technical facts (150-slot blockhash validity, 200k CU/ix default,
  1.4M CU/tx cap, 5000-lamport base fee, Helius `getPriorityFeeEstimate`, Jito
  `sendBundle`/`getInflightBundleStatuses` + 1000-lamport tip floor) were verified
  against live Solana / Helius / Jito docs.
- **`install.sh` smoke test** — installs into a temp dir and asserts the layout.

## Example

```
You:  /diagnose-tx "success rate 72%, lots of BlockhashNotFound"

SRE:  Diagnosis:  stale blockhash on a slow send path + a share of under-priced
                  drops (confidence: med until we bucket the data)
      Evidence:   BlockhashNotFound ⇒ hash aged out (>150 slots / ~60–90s)
      Prescribe:  1. fetch blockhash right before send; track lastValidBlockHeight;
                     stop retrying past it  → skill/retry-and-blockhash.md
                  2. explicit CU limit from simulation + P75 fee
                     → skill/compute-budget.md, skill/priority-fees.md
                  3. Jito bundle fallback for congested windows
                     → skill/jito-fallback.md
      Expected:   stale-blockhash failures → ~0 (that's the BlockhashNotFound bucket
                  you measure); re-measure to confirm
      Verify:     re-run measuring-reliability over the next 200 sends
```

It refuses to promise an exact "→ 97%" until the buckets are measured — that
discipline is the point.

## Install

Requires `bash` and `git`. Works with **Claude Code** and **Codex**-style agent
configs that read `skills/`, `commands/`, and `agents/` directories.

```bash
git clone https://github.com/<your-org>/solana-tx-sre.git
cd solana-tx-sre

# non-interactive — installs skill + commands + agent into ~/.claude
./install.sh

# or choose target dir and components interactively
./install-custom.sh
```

The installer copies:
- `SKILL.md` + `skill/` + `playbooks/` → `~/.claude/skills/solana-tx-sre/`
- `commands/*.md` → `~/.claude/commands/`
- `agents/*.md` → `~/.claude/agents/`

Set `CLAUDE_DIR` to override the target (e.g. `CLAUDE_DIR=~/.codex ./install.sh`).
Pairs naturally with the kit's **Helius** and **solana-dev** MCP servers for live
data.

## Pairs with the kit

- **Helius MCP** — pull tx history & priority-fee estimates for live measurement.
- **solana-dev MCP** — verify current RPC/SDK specifics.
- Hands off security/program-logic review to **trailofbits / safe-solana-builder /
  qedgen**, tokenomics & GTM to **solana-new / colosseum**.

## License

MIT — see [LICENSE](./LICENSE). Built for the Solana AI Kit community challenge;
ready to be merged or submoduled into the standard kit.

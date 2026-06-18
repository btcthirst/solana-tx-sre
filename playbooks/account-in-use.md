# Playbook: AccountInUse / Write-lock Contention

**Trigger:** `AccountInUse`, or a specific tx type drops/fails disproportionately
around a popular account (an AMM pool, oracle, hot mint, shared PDA).

## What it means
Solana parallelises execution by locking the accounts a tx **writes**. When many txs
in a slot want a write-lock on the *same* account, only some win; the rest are
delayed or dropped. This is **contention**, not an under-pricing or expiry bug —
though under-pricing makes you lose the contention more often.

## Procedure
1. **Identify the hot account.** From the logs/tx, find which writable account is
   contended (usually a well-known shared account).
2. **Win the priority race.** Use an **account-scoped** priority-fee estimate for
   *that* account and pay an appropriate percentile — global estimates understate a
   hot account. → `skill/priority-fees.md`
3. **Reduce write footprint.** Only mark accounts writable that you actually write.
   Unnecessary write-locks invite contention you didn't need.
4. **Retry into the next slots.** Contention is per-slot; a rebroadcast loop lets you
   compete again in following slots within the blockhash window.
   → `skill/retry-and-blockhash.md`
5. **Consider atomic bundling** if your flow must touch the hot account alongside
   other txs in a precise order. → `skill/jito-fallback.md`
6. **Design-level (if it's yours):** if a self-inflicted PDA/account is the
   bottleneck, contention may signal a need to shard that hot account — note it, but
   that's a program-design change beyond delivery tuning.

## Verify
The `account-in-use` / contention bucket shrinks
(`skill/measuring-reliability.md`), and success around that account improves
during busy windows. If it persists despite a high account-scoped fee, the
bottleneck is structural (account design), not delivery.

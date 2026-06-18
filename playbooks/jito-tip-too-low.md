# Playbook: Jito Bundle Never Lands (tip too low)

**Trigger:** you submit Jito bundles but they don't land, while normal sends work.

## What it means
A bundle lands only if its **tip** clears the competitive tip market for that slot.
The tip is separate from the priority fee. Under-tipping is the most common cause of
a bundle that silently never lands; wrong tip account or region/endpoint are the
next suspects.

## Procedure
1. **Confirm it's the bundle, not the txs.** Each tx in the bundle must itself be
   valid (simulate them — `skill/simulation.md`). A bad tx sinks the whole bundle.
2. **Size the tip from the live market**, not a hardcoded constant. The floor is
   **1,000 lamports**, but that's rarely competitive under load — pay a percentile for
   your urgency, and cap it. → `skill/jito-fallback.md`
3. **Pay to a current tip account.** Use a tip account from Jito's **live** list;
   stale/hardcoded addresses won't be recognised as tips. → `skill/resources.md`
4. **Place the tip correctly.** Put the tip transfer in the bundle per Jito's
   guidance so it's only paid if the bundle is included, and so it's attributed to
   the bundle.
5. **Check region/endpoint.** Submitting to the wrong block-engine region adds
   latency that can cost you the slot. Use the appropriate endpoint.
6. **Poll bundle status** (`getInflightBundleStatuses` → Invalid | Pending | Failed |
   Landed), not just tx status, to see whether it was accepted.

## Verify
Bundle status shows landed and the bundled txs' signatures appear on-chain. If
bundles still miss at a competitive tip, re-check the tip account list and region
before raising the tip further.

# Jito Bundle Fallback

The congestion-fallback control (10 pts). A regular send and a Jito bundle are
*different delivery channels*; having the second one is what keeps you landing when
the public path degrades.

> Scope: this file is about **landing reliability** via bundles, not running an MEV
> strategy. Atomic multi-tx execution and tip auctions are the parts that matter here.

## When a bundle helps

- **Network congestion** — the public mempool path is dropping your txs despite a
  fair fee. A bundle routed to the block engine can land when normal sends stall.
- **Atomicity** — you need several txs to execute **all-or-nothing, in order**
  (e.g. setup + action + cleanup). A bundle guarantees the group lands together or
  not at all.
- **Front-run sensitivity** — keeping a tx out of the public mempool reduces its
  exposure (see `sandwich-slippage.md`).

For a single, non-urgent tx in calm conditions, a bundle is overkill — use the
normal path. Fallback ≠ default.

## How bundles land (the tip)

- A bundle is an ordered list of signed txs submitted to the Jito block engine.
- It lands only if it includes a **tip** — a transfer to a current Jito **tip
  account** — that clears the competitive tip market for that slot.
- The tip is **separate** from the priority fee. Under-tipping is the #1 reason a
  bundle silently never lands. → `playbooks/jito-tip-too-low.md`
- Tip placement matters: put the tip transfer in the bundle per Jito's guidance so
  it's only paid if the bundle is included.

## Building a fallback path

1. Keep your normal send loop (`retry-and-blockhash.md`) as the primary.
2. Detect degradation: rising drop bucket, or you're in a known congestion window.
3. Switch the same logical operation to a bundle: include a tip sized from the
   recent tip market (don't hardcode), submit to the block engine, and poll bundle
   status.
4. Fall back *back* to normal sending when conditions calm — don't pay tips you
   don't need.

## Reference implementation

> Verified against docs.jito.wtf: block-engine endpoint
> `https://mainnet.block-engine.jito.wtf/api/v1/bundles` (+ regional hosts),
> `sendBundle` (≤ 5 txs, atomic, sequential), `getTipAccounts` (8 stable accounts —
> still fetch them), `getInflightBundleStatuses` (Invalid | Pending | Failed | Landed),
> minimum tip **1,000 lamports**. Confirm current values before relying on them.

```ts
import { Connection, PublicKey, SystemProgram, VersionedTransaction } from "@solana/web3.js";

const BLOCK_ENGINE = "https://mainnet.block-engine.jito.wtf/api/v1/bundles";

async function jitoRpc(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(BLOCK_ENGINE, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`jito ${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

// Fetch the live tip-account list — never hardcode it.
async function randomTipAccount(): Promise<PublicKey> {
  const accounts: string[] = await jitoRpc("getTipAccounts", []);
  return new PublicKey(accounts[Math.floor(Math.random() * accounts.length)]);
}

// The tip is just a SOL transfer to a tip account, included in the bundle.
// Size it from the live market; floor is 1000 lamports. Add this ix to one of your txs.
function tipInstruction(payer: PublicKey, tip: PublicKey, lamports: number) {
  return SystemProgram.transfer({ fromPubkey: payer, toPubkey: tip, lamports });
}

// Submit up to 5 signed txs atomically; returns a bundle id.
async function sendBundle(signed: VersionedTransaction[]): Promise<string> {
  const encoded = signed.map((t) => Buffer.from(t.serialize()).toString("base64"));
  return jitoRpc("sendBundle", [encoded, { encoding: "base64" }]);
}

// Poll until the bundle lands or fails — confirm the BUNDLE, not just submission.
async function awaitBundle(bundleId: string, timeoutMs = 30_000): Promise<"Landed"> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await jitoRpc("getInflightBundleStatuses", [[bundleId]]);
    const status = res?.value?.[0]?.status;
    if (status === "Landed") return "Landed";
    if (status === "Failed" || status === "Invalid") throw new Error(`bundle ${bundleId}: ${status}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`bundle ${bundleId}: status poll timed out`);
}
```

## Verify

Confirm the **bundle** landed (`getInflightBundleStatuses` → `Landed`, or the txs'
signatures on-chain), not just that you submitted it. If bundles still miss, the tip
is the first suspect — re-check it against the current market (floor 1,000 lamports),
then region/endpoint. → `playbooks/jito-tip-too-low.md`

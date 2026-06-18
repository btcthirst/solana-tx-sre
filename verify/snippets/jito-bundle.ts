import {
  PublicKey, SystemProgram, TransactionInstruction, VersionedTransaction,
} from "@solana/web3.js";

// Mirror of skill/jito-fallback.md — bundle submission via the Jito block engine.

const BLOCK_ENGINE = "https://mainnet.block-engine.jito.wtf/api/v1/bundles";

async function jitoRpc(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(BLOCK_ENGINE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: any; error?: unknown };
  if (json.error) throw new Error(`jito ${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

export async function randomTipAccount(): Promise<PublicKey> {
  const accounts: string[] = await jitoRpc("getTipAccounts", []);
  return new PublicKey(accounts[Math.floor(Math.random() * accounts.length)]!);
}

export function tipInstruction(payer: PublicKey, tip: PublicKey, lamports: number): TransactionInstruction {
  return SystemProgram.transfer({ fromPubkey: payer, toPubkey: tip, lamports });
}

export async function sendBundle(signed: VersionedTransaction[]): Promise<string> {
  const encoded = signed.map((t) => Buffer.from(t.serialize()).toString("base64"));
  return jitoRpc("sendBundle", [encoded, { encoding: "base64" }]);
}

export async function awaitBundle(bundleId: string, timeoutMs = 30_000): Promise<"Landed"> {
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

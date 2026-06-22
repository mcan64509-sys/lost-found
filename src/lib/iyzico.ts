import crypto from "crypto";

const BASE_URL = process.env.NEXT_PUBLIC_IYZICO_SANDBOX === "true"
  ? "https://sandbox-api.iyzipay.com"
  : "https://api.iyzipay.com";

function makeAuth(uri: string, body: Record<string, unknown>) {
  const apiKey = process.env.IYZICO_API_KEY!;
  const secretKey = process.env.IYZICO_SECRET_KEY!;
  const rnd = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rnd + uri + JSON.stringify(body))
    .digest("hex");
  const token = Buffer.from(`apiKey:${apiKey}&randomKey:${rnd}&signature:${signature}`).toString("base64");
  return { authorization: `IYZWSv2 ${token}`, rnd };
}

async function post(uri: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { authorization, rnd } = makeAuth(uri, body);
  const res = await fetch(`${BASE_URL}${uri}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": authorization,
      "x-iyzi-rnd": rnd,
      "x-iyzi-client-version": "iyzipay-node-2.0.69",
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

export type IyzicoResult = Record<string, unknown>;

export function createCheckoutForm(body: IyzicoResult): Promise<IyzicoResult> {
  return post("/payment/iyzipos/checkoutform/initialize/auth/ecom", body);
}

export function retrieveCheckoutForm(token: string): Promise<IyzicoResult> {
  return post("/payment/iyzipos/checkoutform/auth/ecom/detail", { locale: "tr", token });
}

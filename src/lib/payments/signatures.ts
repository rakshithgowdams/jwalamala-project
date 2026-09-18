import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyPaymentSignature(
  body: string | Uint8Array,
  signature: string,
  secret: string,
) {
  if (!secret || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
export function checkoutMessage(
  providerId: string,
  paymentId: string,
  recurring: boolean,
) {
  return recurring
    ? paymentId + "|" + providerId
    : providerId + "|" + paymentId;
}

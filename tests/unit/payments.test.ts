import { it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyPaymentSignature,
  checkoutMessage,
} from "@/lib/payments/signatures";
import { supportSchema, defaultSupport } from "@/lib/payments/schema";
it("verifies raw webhook bytes and rejects altered payloads or malformed signatures", () => {
  const secret = "test-secret",
    body = '{"event":"payment.captured"}',
    signature = createHmac("sha256", secret).update(body).digest("hex");
  expect(verifyPaymentSignature(body, signature, secret)).toBe(true);
  expect(verifyPaymentSignature(body + " ", signature, secret)).toBe(false);
  for (const sig of ["", signature.slice(1), "é".repeat(64)])
    expect(verifyPaymentSignature(body, sig, secret)).toBe(false);
});
it("uses different signed field order for orders and subscriptions", () => {
  expect(checkoutMessage("order_1", "pay_1", false)).toBe("order_1|pay_1");
  expect(checkoutMessage("sub_1", "pay_1", true)).toBe("pay_1|sub_1");
});
it("prevents enabling payments without terms, publisher and refund details", () => {
  expect(supportSchema.parse(defaultSupport)).toEqual(defaultSupport);
  expect(
    supportSchema.safeParse({ ...defaultSupport, enabled: true }).success,
  ).toBe(false);
});

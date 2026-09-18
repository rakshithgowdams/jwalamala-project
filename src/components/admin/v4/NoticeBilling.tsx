"use client";
import { useState } from "react";
import { saveNoticeBilling } from "@/app/admin/notice-billing/actions";
export function NoticeBilling({
  notices,
}: {
  notices: { id: string; title_kn: string }[];
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await saveNoticeBilling(
            Object.fromEntries(new FormData(e.currentTarget)),
          );
          setMessage(
            r.error || "Billing saved. Editorial approval remains separate.",
          );
        } catch {
          setMessage("Could not save billing.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field wide">
        Notice
        <select name="notice_id" required>
          {notices.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title_kn}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Amount (INR)
        <input
          name="amount"
          type="number"
          min="1"
          max="1000000"
          step="0.01"
          required
        />
      </label>
      <label className="field wide">
        Razorpay payment link
        <input name="payment_url" type="url" required />
      </label>
      <label className="field">
        Payment review
        <select name="status">
          <option value="pending">Awaiting payment</option>
          <option value="paid">Verified paid</option>
          <option value="waived">Fee waived</option>
        </select>
      </label>
      <label className="field">
        Provider payment reference
        <input name="payment_reference" maxLength={200} />
      </label>
      <p className="notice wide">
        Verify payment in your provider dashboard before marking paid. Send the
        payment link to the submitter through your usual contact channel.
      </p>
      <button className="button button-ember" disabled={busy}>
        Save billing
      </button>
      <p role="status">{message}</p>
    </form>
  );
}

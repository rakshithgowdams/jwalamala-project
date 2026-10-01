"use client";
import { useState } from "react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { Captcha } from "@/components/forms/Captcha";
import { advertisingCopy } from "@/content/advertising";
import { businessCategories } from "@/lib/ads/business";

export function BusinessAdForm({
  districts,
}: {
  districts: { id: string; name: string }[];
}) {
  const { locale } = useUiStrings();
  const copy = advertisingCopy(locale),
    f = copy.form;
  const [token, setToken] = useState(""),
    [reset, setReset] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return (
    <form
      className="v4-form business-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/business-ads/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...Object.fromEntries(
                [...data.entries()].filter(
                  ([name]) => name !== "formats" && name !== "policy",
                ),
              ),
              formats: data.getAll("formats"),
              policy: data.has("policy"),
              token,
            }),
          });
          setMessage(response.ok ? f.sent : f.failed);
          if (response.ok) form.reset();
        } catch {
          setMessage(f.failed);
        } finally {
          setToken("");
          setReset((r) => r + 1);
          setBusy(false);
        }
      }}
    >
      {!key && <p className="notice">{f.unavailable}</p>}
      <label className="field">
        {f.businessName}
        <input
          name="name_kn"
          required
          maxLength={150}
          autoComplete="organization"
        />
      </label>
      <label className="field">
        {copy.businessType}
        <select name="category" required defaultValue="">
          <option value="" disabled>
            {copy.businessType}
          </option>
          {businessCategories.map((category) => (
            <option key={category} value={category}>
              {copy.categories[category]}
            </option>
          ))}
        </select>
      </label>
      <div className="business-form-row">
        <label className="field">
          {f.district}
          <select name="district_id" required defaultValue="">
            <option value="" disabled>
              {f.district}
            </option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {f.town}
          <input name="town" maxLength={150} autoComplete="address-level2" />
        </label>
      </div>
      <label className="field">
        {f.offer}
        <input
          name="offer_kn"
          required
          maxLength={160}
          aria-describedby="offer-hint"
        />
        <small id="offer-hint">{f.offerHint}</small>
      </label>
      <div className="business-form-row">
        <label className="field">
          {f.phone}
          <input
            name="phone"
            type="tel"
            required
            inputMode="tel"
            pattern="\+?[0-9][0-9 \-]{7,19}"
            autoComplete="tel"
          />
        </label>
        <label className="field">
          {f.whatsapp}
          <input
            name="whatsapp"
            type="tel"
            inputMode="tel"
            pattern="\+?[0-9][0-9 \-]{7,19}"
          />
        </label>
      </div>
      <label className="field">
        {f.website}
        <input name="website" type="url" pattern="https://.*" maxLength={500} />
      </label>
      <div className="business-form-row">
        <label className="field">
          {f.contactName}
          <input
            name="contact_name"
            required
            maxLength={100}
            autoComplete="name"
          />
        </label>
        <label className="field">
          {f.email}
          <input
            name="contact_email"
            type="email"
            required
            autoComplete="email"
          />
        </label>
      </div>
      <fieldset className="field business-form-choices">
        <legend>{f.formats}</legend>
        {(
          [
            ["shop_card", f.formatShop],
            ["banner", f.formatBanner],
            ["sponsored_article", f.formatSponsored],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="checkbox"
              name="formats"
              value={value}
              defaultChecked={value === "shop_card"}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="business-form-row">
        <label className="field">
          {f.duration}
          <select name="duration" defaultValue="month">
            <option value="week">{f.week}</option>
            <option value="month">{f.month}</option>
            <option value="quarter">{f.quarter}</option>
          </select>
        </label>
        <label className="field">
          {f.start}
          <input name="start_date" type="date" required min={today} />
        </label>
      </div>
      <label className="field">
        {f.message}
        <textarea name="message" rows={4} maxLength={2000} />
      </label>
      <p className="meta">{f.photoLater}</p>
      <p className="meta">{f.privacy}</p>
      <label className="business-form-policy">
        <input type="checkbox" name="policy" required />
        {f.policy}
      </label>
      <div hidden>
        <label>
          Website URL
          <input name="website_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Captcha onToken={setToken} reset={reset} />
      <button className="button button-ember" disabled={!key || !token || busy}>
        {busy ? f.submitting : f.submit}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}

"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";
import Script from "next/script";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  submissionSchema,
  type SubmissionInput,
} from "@/lib/validation/submission";

import { getBrowserClient } from "@/lib/supabase/client";
declare global {
  interface Window {
    turnstile?: {
      reset?: (id: string) => void;
      remove?: (id: string) => void;
      render: (
        container: string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
        },
      ) => string;
    };
  }
}
export function ContactForm() {
  const { kn } = useUiStrings();

  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionInput>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { email: "", link: "", token: "" },
  });
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <form
      className="form-grid"
      onSubmit={handleSubmit(async (values) => {
        setMessage("");
        try {
          const db = getBrowserClient();
          if (!db) {
            setMessage(kn.unavailable);
            return;
          }
          const { error } = await db.functions.invoke("submit-news", {
            body: values,
          });
          setMessage(error ? kn.unavailable : kn.submitted);
        } catch {
          setMessage(kn.unavailable);
        }
      })}
    >
      {!key && <p className="notice field wide">{kn.unavailable}</p>}
      {[
        ["name", kn.name, "text"],
        ["phone", kn.phone, "tel"],
        ["town", kn.town, "text"],
        ["email", kn.email, "email"],
        ["event_date", kn.eventDate, "date"],
        ["link", kn.link, "url"],
      ].map(([name, label, type]) => (
        <label className="field" key={name}>
          {label}
          <input
            type={type}
            {...register(name as keyof SubmissionInput)}
            aria-invalid={!!errors[name as keyof SubmissionInput]}
          />
          {errors[name as keyof SubmissionInput] && (
            <span className="form-message">{kn.validation}</span>
          )}
        </label>
      ))}
      <label className="field wide">
        {kn.message}
        <textarea {...register("message")} aria-invalid={!!errors.message} />
        {errors.message && (
          <span className="form-message">{kn.validation}</span>
        )}
      </label>
      <div className="field wide">
        <div id="turnstile" />
        {key && (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            onReady={() => {
              window.turnstile?.render("#turnstile", {
                sitekey: key,
                callback: (token) => setValue("token", token),
                "expired-callback": () => setValue("token", ""),
              });
            }}
          />
        )}
        <button className="button button-ember" disabled={!key || isSubmitting}>
          {isSubmitting ? kn.submitting : kn.submit}
        </button>
        {errors.token && <p className="form-message">{kn.validation}</p>}
        <p role="status">{message}</p>
      </div>
    </form>
  );
}

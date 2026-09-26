"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { intlLocale, pickText } from "@/lib/i18n/content";

import { useState, useEffect } from "react";
import type { Poll } from "@/lib/v4/types";
import { percentage } from "@/lib/v4/engagement";

export function PollCard({ poll, closed }: { poll: Poll; closed: boolean }) {
  const { kn, v4: t, locale } = useUiStrings();

  const [choice, setChoice] = useState<number[]>([]),
    [results, setResults] = useState<
      { option_index: number; votes: number }[] | null
    >(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!closed || poll.is_seed) return;
    const controller = new AbortController();
    fetch("/api/polls/vote?id=" + poll.id, { signal: controller.signal })
      .then(async (r) => {
        if (r.ok) setResults((await r.json()).results);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [closed, poll.id, poll.is_seed]);
  const total = results?.reduce((n, r) => n + Number(r.votes), 0) || 0;
  const question = pickText(
    locale,
    poll.question_kn,
    poll.question_en,
    poll.question_hi,
  );
  const englishOptions =
    poll.options_en?.length === poll.options.length ? poll.options_en : null;
  const hindiOptions =
    poll.options_hi?.length === poll.options.length ? poll.options_hi : null;
  const options = poll.options.map((option, index) =>
    pickText(locale, option, englishOptions?.[index], hindiOptions?.[index]),
  );

  return (
    <section className="utility-panel">
      <h2>{question}</h2>
      {poll.is_seed && <p className="notice">{t.samplePoll}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!choice.length) return;
          setBusy(true);
          try {
            if (poll.is_seed) {
              setResults(
                choice.map((index) => ({ option_index: index, votes: 1 })),
              );
              setMessage(t.localOnly);
            } else {
              const response = await fetch("/api/polls/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  poll_id: poll.id,
                  option_indexes: choice,
                }),
              });
              if (response.status === 409) {
                const result = await fetch("/api/polls/vote?id=" + poll.id);
                if (result.ok) setResults((await result.json()).results);
                setMessage(t.voteFailed);
                return;
              }
              if (!response.ok) throw Error();
              setResults((await response.json()).results);
            }
          } catch {
            setMessage(t.voteFailed);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!!results || closed || busy}>
          <legend className="sr-only">{question}</legend>
          {options.map((option, index) => (
            <label className="poll-option" key={index}>
              <input
                type={poll.multiple_choice ? "checkbox" : "radio"}
                name={"poll-" + poll.id}
                checked={choice.includes(index)}
                onChange={() =>
                  setChoice((c) =>
                    poll.multiple_choice
                      ? c.includes(index)
                        ? c.filter((v) => v !== index)
                        : [...c, index]
                      : [index],
                  )
                }
                required={!poll.multiple_choice}
              />
              {option}
            </label>
          ))}
        </fieldset>
        {results ? (
          <div aria-live="polite">
            {options.map((option, index) => {
              const count = Number(
                results.find((r) => r.option_index === index)?.votes || 0,
              );
              return (
                <div className="poll-result" key={index}>
                  <span>
                    {option} · {percentage(count, total)}%
                  </span>
                  <progress
                    value={count}
                    max={Math.max(total, 1)}
                    aria-label={option}
                  />
                </div>
              );
            })}
            <p>
              {poll.multiple_choice ? kn.totalChoices : t.totalVotes}: {total}
            </p>
          </div>
        ) : (
          <button
            className="button button-ember"
            disabled={!choice.length || busy || closed}
          >
            {closed ? t.ended : t.vote}
          </button>
        )}
        <p className="meta">
          {t.deadline}:{" "}
          <time dateTime={poll.ends_at}>
            {new Intl.DateTimeFormat(intlLocale(locale), {
              dateStyle: "medium",
              timeZone: "Asia/Kolkata",
            }).format(new Date(poll.ends_at))}
          </time>
        </p>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}

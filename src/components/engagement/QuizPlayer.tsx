"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";
import type { Quiz } from "@/lib/v4/types";
import { scoreQuiz } from "@/lib/v4/engagement";

export function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const { v4: t, kn } = useUiStrings();

  const [answers, setAnswers] = useState<number[]>([]),
    [done, setDone] = useState(false),
    [message, setMessage] = useState("");
  const score = scoreQuiz(quiz.questions, answers);
  return (
    <section className="utility-panel">
      <h1>{quiz.title_kn}</h1>
      {quiz.is_seed && <p className="notice">{kn.demoArticle}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setDone(true);
        }}
      >
        {quiz.questions.map((q, i) => (
          <fieldset key={i} disabled={done}>
            <legend>
              {i + 1}. {q.question}
            </legend>
            {q.options.map((o, j) => (
              <label key={j} className="poll-option">
                <input
                  required
                  type="radio"
                  name={"q" + i}
                  checked={answers[i] === j}
                  onChange={() =>
                    setAnswers((current) => {
                      const next = [...current];
                      next[i] = j;
                      return next;
                    })
                  }
                />
                {o}
              </label>
            ))}
            {done && (
              <p
                className={answers[i] === q.answer ? "quiz-correct" : "notice"}
              >
                {t.answer}: {q.options[q.answer]} — {q.explanation}
              </p>
            )}
          </fieldset>
        ))}
        {!done && (
          <button className="button button-ember">{t.showScore}</button>
        )}
      </form>
      {done && (
        <div role="status">
          <h2>
            {t.score}: {score} / {quiz.questions.length}
          </h2>
          <div className="article-actions">
            <button
              className="button button-outline"
              onClick={() => {
                setAnswers([]);
                setDone(false);
              }}
            >
              {t.tryAgain}
            </button>
            <button
              className="button button-ember"
              onClick={async () => {
                const text =
                  quiz.title_kn + " · " + score + "/" + quiz.questions.length;
                try {
                  if (navigator.share)
                    await navigator.share({
                      title: quiz.title_kn,
                      text,
                      url: location.href,
                    });
                  else {
                    await navigator.clipboard.writeText(
                      text + " " + location.href,
                    );
                    setMessage(kn.copied);
                  }
                } catch {
                  setMessage(t.failed);
                }
              }}
            >
              {kn.share}
            </button>
          </div>
          {message}
        </div>
      )}
    </section>
  );
}

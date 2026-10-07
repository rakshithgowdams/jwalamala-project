"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/email";
export function PasswordField({
  id = "password",
  label,
  value,
  onChange,
  disabled,
  isNew = false,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isNew?: boolean;
}) {
  const { kn } = useUiStrings();

  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label || kn.password}</label>
      <div className="password-input">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={isNew ? "new-password" : "current-password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={isNew ? MIN_PASSWORD_LENGTH : undefined}
          maxLength={128}
          disabled={disabled}
          aria-describedby={isNew ? id + "-hint" : undefined}
        />
        <button
          type="button"
          className="icon-button"
          disabled={disabled}
          aria-label={visible ? kn.hidePassword : kn.showPassword}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {isNew && (
        <span className="meta" id={id + "-hint"}>
          {kn.passwordHint}
        </span>
      )}
    </div>
  );
}

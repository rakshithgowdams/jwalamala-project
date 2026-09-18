# Login setup

The app now offers email/password sign-in, account creation, password recovery, Google sign-in, and the existing phone OTP option. A Gmail address works as the email identifier; the password field is for the user's **Jwalamala password**. Google authentication takes place on Google's page.

## App configuration

Set these existing entries in the local `.env`, then rebuild/restart the app:

```dotenv
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=<your Supabase API URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase public anon key>
```

Supabase credentials are now present, but the configured project still needs the application schema initialized. NEXT_PUBLIC_DEMO_MODE=true intentionally disables live login and database actions. After applying the reviewed schema and configuring providers, set NEXT_PUBLIC_DEMO_MODE=false and rebuild. Do not put Google client secrets or Supabase service-role keys in `NEXT_PUBLIC_` variables.

## Email and password

Enable Email authentication and configure confirmation settings in Supabase. The app requests email confirmation when the provider requires it and never claims a pending signup is signed in. Set the provider's minimum password length to at least 8 to match the form.

Allow the app's callback URL in Supabase Auth URL Configuration:

- `http://127.0.0.1:3000/auth/callback**`
- `http://localhost:3000/auth/callback**` if you also use localhost.

Use the same hostname throughout an authentication attempt. Configure the intended site URL and appropriate callback allow-list entries before production use.

Default confirmation links support the PKCE callback when opened in the requesting browser. For confirmation/recovery across browsers, these email template links use the implemented token-hash callback:

Confirm signup:
```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">Confirm email</a>
```

Reset password:
```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Template variables follow [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

These templates assume the app's supplied RedirectTo, which already contains a next query parameter. Recovery leads to the authenticated `/account/password` page. Local Supabase captures email in Mailpit; production email delivery needs SMTP configuration. See [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords).

## Google

Create a Google OAuth web client and configure its app origins. Set its authorized redirect URI to the **Supabase Auth callback**, not the app's callback. For local Supabase, this is `http://127.0.0.1:54321/auth/v1/callback`. For hosted Supabase, copy the callback URL from the Google provider settings.

Enable Supabase's Google provider with the Google client ID and secret. For local Supabase, merge the following into its generated config:

```toml
[auth.external.google]
enabled = true
client_id = "<Google web client ID>"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

Keep the secret in the local Supabase process environment. Configure Google's audience/test users for the intended users. The app's button requests Google sign-in through Supabase, then exchanges the returned PKCE code for session cookies. See [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Verification status

- App build, unit tests, UI tests and screenshots are tracked in PROGRESS.md.
- Unit tests mock the Auth provider and verify requests, confirmation states, failures, recovery routing and callback restrictions.
- Live Google consent, email delivery, password sign-in and session persistence require configured providers and have not been verified.
- Existing migrations already create reader profiles for new Auth users. No migration, provider account, deployment, or live email send was performed by this change.

# Login App pixel redesign implementation plan

Keep Login App a three-screen auth utility. `/` sends signed-out visitors to `/login` and signed-in visitors to `/dashboard`. Signed-in visitors who open `/login` or `/signup` go straight to `/dashboard`. The Account screen keeps the `/dashboard` URL.

## Screen design

Use one cool ceramic surface with ink text and cobalt as the brand accent. On desktop, place the Login App wordmark and lock artwork to the left and slightly above the form on the right, using one continuous surface. On mobile, stack the brand above the form and scale the artwork down so both fields and the primary button are visible at `390×844` with the keyboard closed. The screen can scroll naturally when the keyboard opens or an error adds height.

Use Pixelify Sans for the wordmark and page headings, and Geist for everything else. Start with 16px control text and 14px helper text. Use squared fields, a visible keyboard focus ring, and a cobalt button with a shallow stepped shadow that compresses on press. Build the original lock artwork on a shared pixel grid using the existing cobalt icon as the reference. Keep all three sprites the same size and use one brief entrance based on Scrolltide’s `patterns/reveals.md`. Render the form and artwork on first paint, animate only the decorative artwork, and use its static state for reduced motion. [Existing icon](../../../app/icon.svg)

| Route | Screen | Primary action | Artwork |
| --- | --- | --- | --- |
| `/login` | **Log in**, email, password, **Show password**, and a signup link below the form | **Log in** | Closed lock |
| `/signup` | **Sign up**, email, password with existing length guidance, **Show password**, and a login link below the form | **Create account** | Key beside lock |
| `/dashboard` | **Account**, the signed-in email, and an inline message if logout fails | **Log out** | Open lock |

## 1. Verify auth on the upgraded stack

Files to change are `package.json`, `package-lock.json`, `next.config.mjs`, and `lib/auth.js`.

- [x] Use an isolated PostgreSQL instance with a local `DATABASE_URL`. Run the current app through signup, login, protected routing, and logout to establish a baseline. Save a disposable account and session to check after the upgrade.
- [x] Pin Next.js `16.4.6` and matching `react` and `react-dom` `19.3.1` as the initial candidates. Use a supported Node release that meets Next.js’s `>=20.9.0` requirement. Move `pg` to the top-level `serverExternalPackages` config. Await `cookies()` for session creation, lookup, and destruction. Preserve the database schema, session token format, cookie options, and auth API contracts.
- [x] Run `npm ci` and `npm run build`. Exercise signup, login, and logout on the upgraded app against the disposable database, including a pre-upgrade account and session. Verify the redirect rules above, cookie issuance and clearing, and that refreshing `/dashboard` after logout sends the visitor to `/login`. Check the HTTP-only, same-site, and production Secure attributes. Finish this step before introducing UI changes.

## 2. Build the shared Astryx frame and forms

Files to change are `app/layout.js`, `app/globals.css`, `components/AuthForm.js`, and the package manifests. Add `components/AuthShell.js` for the shared brand and layout, with the three lock sprites under `public/`.

- [x] Add matching Astryx Core, CLI, and Neutral theme `0.7.17`, with compatible StyleX `0.19.2`. Run `astryx init` and use the precompiled Next.js setup. Apply the ceramic, ink, cobalt, focus, spacing, and corner treatments through theme tokens. Load only Pixelify Sans and Geist. Update the root metadata description, which currently names MySQL.
- [x] Scaffold Astryx **Basic Login** (`login`) as a working reference. Use its credential-form hierarchy and spacing for the shared `AuthShell`. Adapt the shell for the agreed offset desktop layout and mobile stack. Pass the route’s sprite and content to the shell, and keep one `h1` and one primary button per screen.
- [x] Keep `AuthForm({ mode })` as the client component for both credential flows. Use Astryx `Field` with native inputs wherever the higher-level `TextInput` cannot preserve `required`, `minLength`, or `maxLength`. Preserve field labels, signup guidance, email and mode-specific password autofill, and the existing submit endpoints. Use `CheckboxInput` for password visibility and `Button` for submission. During a request, show the pending state and prevent repeat submits, including Enter. Announce failed credentials, duplicate signup, and network errors inline, and allow retry without clearing entered values.
- [x] Check initial render, toggling visibility, native validation, autofill, pending submit, and failed submissions on both auth screens. Confirm that the form is usable before the sprite animation ends, with keyboard focus in the same order as the visible form.

## 3. Build Account and handle logout failures

Files to change are `app/dashboard/page.js` and `components/LogoutButton.js`. Keep the server-side session check on the page.

- [x] Render the Account title in both the page and metadata. Reuse `AuthShell` with the open lock and signed-in email. Allow a long email to wrap on narrow screens.
- [x] Make `LogoutButton` redirect to `/login` after a successful logout response. For an HTTP or network failure, keep the Account screen visible, announce “Couldn’t log out. Try again.” inline, and re-enable the button. Clear that error on retry and prevent duplicate requests while one is pending.
- [x] Check a failed request followed by a successful retry. On failure, confirm that the URL, signed-in email, and retry button remain on the screen. On success, confirm that the existing session is cleared and protected routes redirect to `/login`.

## 4. Verify the finished flow

- [x] Run `npm ci` and `npm run build` from the final lockfile. Exercise signup, duplicate signup, invalid login, successful login, authenticated and signed-out redirects, and logout on the upgraded app using disposable PostgreSQL.
- [x] Inspect all three screens at desktop size and `390×844` from the top through the last reachable content. Check the first paint, field and button placement, keyboard focus, autofill, readable inline errors, pending states, and the static reduced-motion rendering. Check natural scrolling with the software keyboard, email wrapping, and the absence of horizontal overflow. Verify that all above-the-fold text is at least 13px and that labels, action text, and focus indicators meet contrast requirements.

## Verification record

Implemented in local commit `be34a85`. The production build and disposable PostgreSQL auth checks passed. Chromium verification covered 1440×900, 390×844, and 320×568, including keyboard focus, native email autofill, password visibility, pending and error states, retry, reduced motion, and pre-hydration layout. Mobile keyboard testing used a contracted browser viewport. Password-manager behavior was checked by submitting browser-populated credentials.

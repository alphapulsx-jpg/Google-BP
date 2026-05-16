# Free launch checklist (Forms + Gmail, no Zapier / no server v1)

Use this for a **one-page** flow: pay on Stripe → land on the same site → embedded **Google Form** → team gets **Gmail** when someone submits.

## 1. Google Form

1. In [Google Forms](https://forms.google.com), create your intake questionnaire (business name, service area, listing link, etc.).
2. **Responses** tab (top): optionally click **Link to Sheets** if you want a spreadsheet copy of answers.
3. Still under **Responses**, open the **⋮** (three dots) menu → **Get email notifications for new responses** and ensure notifications reach **alphapulsx@gmail.com** (add that address as a collaborator on the form if needed, or rely on the form owner’s inbox forwarding to that address — pick one clear inbox for ops).

## 2. Embed the form on the landing page

1. In the form editor: **Send** → **&lt;&gt;** (embed) → copy the embed URL (it ends with `viewform?embedded=true`).
2. In **`index.html`**, find the **“Order form goes live with your link”** placeholder under **`#intake`**. Replace that placeholder block with your real **`<iframe …>`** from Google (and optional “Open form in new tab” link using the same form path segment from the embed URL).

For a plain-English owner checklist (Stripe, Form, Doc, Apps Script), see **`docs/setup-what-you-need.md`**.

## 3. Stripe Payment Link (no secret keys in the repo)

1. In Stripe Dashboard, create a **Payment Link** for **$129.99** (or your live price).
2. Set **After payment** → **Redirect** to your public page with the intake anchor, for example:

   `https://alphapulsx-jpg.github.io/Google-BP/#intake`

3. Optional: include Stripe’s session placeholder so the URL carries a reference (handy for support). Example:

   `https://alphapulsx-jpg.github.io/Google-BP/?session_id={CHECKOUT_SESSION_ID}#intake`

   The site’s `app.js` scrolls to `#intake` when `session_id` (or `checkout_session_id`) appears in the query string. **This is client-side only:** the presence of `session_id` in the URL does **not** cryptographically prove payment without a **Stripe webhook** or server-side session lookup. For an MVP / honest flow, Stripe’s receipt email + your redirect is usually enough; add a webhook later if you need verified “paid before form” gating.

4. On **`#pay-cta`** in **`index.html`**, set **`data-stripe-url="https://buy.stripe.com/…"`** to your live Payment Link (the pay buttons read this attribute; they stay disabled until it is set and all three checkboxes are checked).

**Never** commit Stripe **secret** keys, `.env` files, or webhook signing secrets to this public static repo.

## 4. Smoke test

1. Open the live GitHub Pages URL.
2. Complete a **test** card payment (if using Stripe test mode) or a small real payment.
3. Confirm redirect lands on **`#intake`**, the **intake form** (embedded iframe after you replace the placeholder) loads, submit a test response, and **alphapulsx@gmail.com** receives the notification.

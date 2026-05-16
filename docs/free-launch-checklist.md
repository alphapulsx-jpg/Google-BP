# Free launch checklist (1-question Form + Stripe email, no Zapier v1)

Use this for a **one-page** impulse-buy flow: pay on Stripe → land on `#intake` → paste **one** identifier → confirm on a **1-question** Google Form → team gets **Gmail** on submit.

## 1. Google Form (one question)

1. In [Google Forms](https://forms.google.com), create a form with **one** required short-answer question: **Listing link or business name + city**.
2. **Do not** add an email field — Stripe collects email at checkout.
3. **Optional:** add a second short-answer field **`session_id`** (for linking to Sheet rows); keep it out of the visible title or label it “Order reference (auto-filled)”.
4. **Responses** → **Link to Sheets** (recommended).
5. **Responses** → **⋮** → **Get email notifications for new responses** → **alphapulsx@gmail.com** (or forward form-owner inbox there).

## 2. Wire prefill IDs into the landing page

1. In the form editor: **⋮** → **Get pre-filled link** → note `entry.XXXXXXXX` for the listing question (and session field if used).
2. In **`app.js`**, set:
   - `GOOGLE_FORM_BASE` → `https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform`
   - `ENTRY_LISTING` → your listing field entry id (without `entry.` prefix in the constant — code adds `entry.`).
   - `ENTRY_SESSION` → session field entry id (optional).

The **`#intake`** section already has **`#listing-id`** + **Submit** (no iframe).

## 3. Stripe Payment Link

1. Create Payment Link for **$129.99**.
2. **After payment** → **Redirect**:
   ```
   https://alphapulsx-jpg.github.io/Google-BP/?session_id={CHECKOUT_SESSION_ID}#intake
   ```
3. Set **`data-stripe-url`** on **`#pay-cta`** in **`index.html`** to your live `https://buy.stripe.com/…` link.

**Never** commit Stripe secret keys or `whsec_…` to this repo.

## 4. Stripe email (customer)

- Stripe sends the **receipt** to the email entered at checkout — that is **`customer_email`** for fulfillment.
- Form responses do **not** need to duplicate email.

## 5. Smoke test

1. Open live GitHub Pages URL.
2. Test payment (Stripe test mode or small live charge).
3. Confirm redirect to **`#intake`** with optional `session_id` in the URL.
4. Paste a test listing link → **Submit** → prefilled Form opens → submit once.
5. Confirm **alphapulsx@gmail.com** gets the Form notification and (if linked) a Sheet row.

For full automation (webhook + Sheet merge), see **`docs/automation-full-stack.md`** and **`docs/owner-checklist.md`**.

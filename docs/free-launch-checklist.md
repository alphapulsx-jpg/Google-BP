# Free launch checklist — scan-first, one page

Impulse flow: **paste Maps link → free scan → pay $129.99 → kit by email** (~90s when automation is live).

See **`docs/TODO.md`** for your full prioritized list.

---

## 1. Push the site (required)

These must be on `main` for GitHub Pages:

- `index.html`, `app.js`, `styles.css`
- `sample-triumph-report.html`, `sample-triumph-brochure.html` (example deliverable)
- Optional: `deliverables/`, `automation/generate-kit.mjs`

Enable **GitHub Pages** → branch **`main`**, folder **`/` (root)**.

**Local preview:** double-click **`start5173.bat`** → http://localhost:5173/

---

## 2. Stripe Payment Link ($129.99)

1. Create Payment Link for **$129.99** (one-time).
2. **After payment** redirect:
   ```
   https://alphapulsx-jpg.github.io/Google-BP/?session_id={CHECKOUT_SESSION_ID}#checkout
   ```
3. In **`index.html`**, set on **`#pay-cta`**:
   ```html
   data-stripe-url="https://buy.stripe.com/YOUR_LIVE_LINK"
   ```
4. Until this is set, pay stays disabled; customers see a hint to email you after scan + checkboxes.

**Never** commit Stripe secret keys or `whsec_…`.

---

## 3. Smoke test (live site)

1. Open the live URL (not `file://`).
2. Paste a **Google Maps** share link (e.g. Triumph Heating Kelowna) → **Show what I’m losing →**
3. Confirm **scan results** appear and **checkout** section unlocks below.
4. Check both boxes → pay opens Stripe in a new tab.
5. After test payment, confirm redirect with `?session_id=…` lands on **#checkout**.
6. Open **Example deliverable** in footer — brochure + report load.

---

## 4. Deliver a paid order (until webhook automation)

1. Get customer **Maps URL** (from scan metadata, email, or Form).
2. Create or edit a profile under **`automation/listing-profiles/`** (copy `triumph-heating-kelowna.json`).
3. Run:
   ```bash
   node automation/generate-kit.mjs automation/listing-profiles/CLIENT.json deliverables/CLIENT-SLUG
   ```
4. Email **`kit-report.html`** + **`kit-brochure.html`** to Stripe **customer_email** (Print → PDF optional).
5. Mark order **SENT** in your Sheet.

---

## 5. Optional: Google Form backup

Only if Checkout does not pass `listing_identifier` yet:

1. One required question: **Listing link or business name + city** (no email field).
2. Optional **`session_id`** field (prefilled from URL after pay).
3. Wire **`mergeFormResponseBySessionId_`** in **`automation/Code.gs`** on form submit.

---

## 6. Full automation (later)

**`docs/owner-checklist.md`** + **`docs/automation-full-stack.md`** — webhook, Sheet, Doc template, approval gate, Gmail send.

---

## Links

- Live site: https://alphapulsx-jpg.github.io/Google-BP/
- Sample report: https://alphapulsx-jpg.github.io/Google-BP/sample-triumph-report.html
- Support: alphapulsx@gmail.com

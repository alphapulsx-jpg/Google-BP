# Your to-do list — Google listing kit

**Last updated:** May 2026 · reflects scan-first landing + local kit generator.

Use this as the single checklist. Detailed how-tos stay in linked docs.

---

## Done on your machine (agent / repo)

- [x] One-page impulse funnel (scan → results → checkout)
- [x] Triumph Heating sample kit (`sample-triumph-report.html`, `sample-triumph-brochure.html`)
- [x] Local generator: `node automation/generate-kit.mjs`
- [x] Quality pass: profile completeness labels, checkout hidden until scan, neutral hero example, Stripe-not-ready messaging
- [x] `start5173.bat` for local preview

---

## You — launch blockers (do these first)

### 1. Publish the site

- [ ] **Commit and push** to `main` at minimum:
  - `index.html`, `app.js`, `styles.css`
  - `sample-triumph-report.html`, `sample-triumph-brochure.html`
  - `deliverables/` (optional but recommended)
  - `automation/generate-kit.mjs` + `automation/listing-profiles/`
- [ ] Confirm GitHub Pages: **Settings → Pages → `main` / root**
- [ ] Smoke-test live URLs:
  - https://alphapulsx-jpg.github.io/Google-BP/
  - https://alphapulsx-jpg.github.io/Google-BP/sample-triumph-report.html

### 2. Stripe ($129.99)

- [ ] Create **Payment Link** for **$129.99** (one-time)
- [ ] **After payment redirect:**
  ```
  https://alphapulsx-jpg.github.io/Google-BP/?session_id={CHECKOUT_SESSION_ID}#checkout
  ```
- [ ] Paste live link into `index.html` on **`#pay-cta`**: `data-stripe-url="https://buy.stripe.com/…"`
- [ ] Test: scan → check boxes → pay button opens Stripe (not greyed out)
- [ ] Pass **`listing_identifier`** in Payment Link metadata or Checkout custom field (from `sessionStorage` — wire when you add server; until then Form merge is backup)

### 3. Fulfillment (pick one path)

**Path A — Manual (fastest revenue)**

- [ ] On each sale: run  
  `node automation/generate-kit.mjs automation/listing-profiles/triumph-heating-kelowna.json deliverables/CLIENT-SLUG`  
  (create a new JSON profile per client from their Maps URL)
- [ ] Email **kit-report.html** + **kit-brochure.html** (or PDF print) to Stripe customer email within **5 business days** max (policy); aim for **~90 minutes** until automation is live
- [ ] Log orders in a Google Sheet: `session_id | email | listing | status | sent`

**Path B — Apps Script automation (scale)**

- [ ] Follow **`docs/owner-checklist.md`** (Sheet, template Doc, webhook, approval gate)
- [ ] Deploy **`automation/Code.gs`** as Web App; set Script Properties (no secrets in git)
- [ ] Stripe webhook → `checkout.session.completed` → Sheet row → generate Doc → you approve → `sendAfterApproval()`
- [ ] Replace stub generation with **Places API + OpenAI** (or run `generate-kit.mjs` output into Doc)

---

## You — quality & trust (before ads / outreach)

- [ ] Run a **real** Triumph scan on the live site with their Maps URL; confirm scores feel plausible
- [ ] Remove or hide footer **“Example deliverable”** if you don’t want buyers seeing a sample
- [ ] Read **`sample-triumph-report.html`** once as a customer — fix any typo in your first paid kit template
- [ ] Add **refund policy** line to Stripe Payment Link description (match landing: link guarantee + delivery SLA)
- [ ] Do **not** promise live Google scraping on the landing page until backend does it — free scan is **indicative** until Places API is wired

---

## You — growth (after checkout works)

- [ ] Cold outreach: **`docs/outreach.md`** — lead with free scan link
- [ ] Optional: Google Form backup for `listing_identifier` + `session_id` — **`docs/free-launch-checklist.md`**
- [ ] Track in Sheet: visits → scans → paid → delivered
- [ ] Goal: **3 sales × $129.99 ≈ $390** in first 30 days (`docs/design.md`)

---

## You — later (not blocking launch)

- [ ] Places API: real listing snapshot in scan + kit (replace mock scores in `app.js`)
- [ ] Auto-refund when Maps link invalid (`refundCheckoutSession_` in Apps Script)
- [ ] PDF export of brochure (browser Print → PDF is fine for v1)
- [ ] Owner approval email to **alphapulsx@gmail.com** before customer send
- [ ] `sitemap.xml` — add `/sample-triumph-report.html` if you want it indexed (usually **no**)

---

## Quick commands

```bash
# Preview site locally
start5173.bat
# → http://localhost:5173/

# Generate a kit from a profile JSON
node automation/generate-kit.mjs

# Copy to root samples after regenerating Triumph
copy deliverables\triumph-heating-kelowna\kit-report.html sample-triumph-report.html
copy deliverables\triumph-heating-kelowna\kit-brochure.html sample-triumph-brochure.html
```

---

## Doc map

| Doc | Use when |
|-----|----------|
| **`docs/TODO.md`** | This list |
| **`docs/free-launch-checklist.md`** | Stripe + Form + smoke test |
| **`docs/owner-checklist.md`** | Full Apps Script automation |
| **`docs/automation-full-stack.md`** | Architecture + webhook flow |
| **`docs/setup-what-you-need.md`** | Stripe URL on `#pay-cta` |

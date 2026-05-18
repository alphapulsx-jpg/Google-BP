# Your to-do list — automated delivery only

**Product:** Pay → Stripe webhook → **Google Doc + PDF email** (~90s).  
**Not** HTML on GitHub Pages for customers. See **`automation/README.md`**.

---

## Done in repo (code ready to deploy)

- [x] **`automation/PlacesScan.gs`** — real Google Places API scan + deterministic completeness score
- [x] **`automation/Code.gs`** — scan JSONP, checkout, webhook → Doc + PDF email
- [x] Landing calls **`?action=scan`** — **no fake scores** (errors if API not configured)
- [x] Scoring doc — **`docs/scoring.md`**

---

## You must deploy (in order)

### 1. Google backend

- [ ] Create **Sheet** + **Doc template** (placeholders from `doc-template-placeholders.md`)
- [ ] Paste **`automation/Code.gs`** + **`automation/PlacesScan.gs`** into Apps Script
- [ ] Set **Script properties**: `GOOGLE_PLACES_API_KEY` (**required**), Stripe keys, Sheet ID, template Doc ID, `AUTO_SEND_TO_CUSTOMER=true`
- [ ] **Deploy Web app** (Me / Anyone) → copy URL
- [ ] Set on site: `data-checkout-api="YOUR_WEB_APP_URL"` on `<body>` in `index.html` → **push**

### 2. Stripe

- [ ] Create **$129.99** price (or use built-in 12999 cents in script)
- [ ] **Webhook** → same Web app URL, event `checkout.session.completed`, `whsec_…` in Script properties
- [ ] Test mode: pay with test card → confirm **email with Doc link + PDF**

### 3. Verify auto-delivery

- [ ] Run `testFulfillSampleListing()` in Apps Script editor (sends to your Google account email)
- [ ] One live test payment with a real Maps URL
- [ ] Sheet row: `FULFILLED` / `SENT`, customer receives Gmail

### 4. GitHub Pages

- [ ] Push latest `index.html` + `app.js` with `data-checkout-api` filled in
- [ ] Remove reliance on static Payment Link unless you want it as fallback (`data-stripe-url`)

---

## Optional

- [ ] `OPENAI_API_KEY` in Script properties for richer paste blocks
- [ ] Time trigger: `sendAfterApproval` every 5 min if `AUTO_SEND_TO_CUSTOMER=false`
- [ ] Delete or ignore `sample-triumph-*.html` on Pages (not customer-facing)

---

## Do not use for paying customers

- Emailing `kit-report.html` / `sample-triumph-*.html`
- Expecting GitHub Pages to send mail or run webhooks
- Static Stripe Payment Link **without** listing in metadata (use Checkout API path above)

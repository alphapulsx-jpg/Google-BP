# Automation (production path)

**Customer delivery = Google Doc + PDF by email after Stripe payment.**  
GitHub Pages only hosts the landing page. **Apps Script** is the brain.

HTML files under `deliverables/` and `sample-triumph-*.html` are **dev previews only** — not what buyers receive.

## Deploy (one time)

1. Enable **Google Places API (New)** in Google Cloud → create API key → Script property **`GOOGLE_PLACES_API_KEY`**
2. Add **`PlacesScan.gs`** and **`Code.gs`** to the same Apps Script project
3. Create a **Google Sheet** (orders log) with headers:  
   `session_id | customer_email | listing_identifier | status | doc_url | approved | sent | notes`
2. Create a **Google Doc** template — see **`doc-template-placeholders.md`**
3. New **Apps Script** project (bound to Sheet or standalone) → paste **`Code.gs`**
4. **Project Settings → Script properties** (never commit these):

| Property | Example |
|----------|---------|
| `STRIPE_SECRET_KEY` | `sk_live_…` or `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_ID` | `price_…` for $129.99 **or** leave empty to use built-in $129.99 `price_data` |
| `CHECKOUT_SUCCESS_URL` | `https://alphapulsx-jpg.github.io/Google-BP/?session_id={CHECKOUT_SESSION_ID}#checkout` |
| `CHECKOUT_CANCEL_URL` | `https://alphapulsx-jpg.github.io/Google-BP/#scan-form` |
| `SHEET_ID` | Sheet ID |
| `SHEET_NAME` | `Orders` |
| `TEMPLATE_DOC_ID` | Template Doc ID |
| `OWNER_NOTIFY_EMAIL` | `alphapulsx@gmail.com` |
| `AUTO_SEND_TO_CUSTOMER` | `true` (email Doc + PDF automatically) |
| `OPENAI_API_KEY` | optional — richer copy if set |

5. **Deploy → Web app** — Execute as **Me**, Who has access: **Anyone**
6. Copy the **Web app URL** → set on landing page: `data-checkout-api="https://script.google.com/macros/s/…/exec"`
7. **Stripe → Webhooks** → endpoint = same URL, event **`checkout.session.completed`**, signing secret → `STRIPE_WEBHOOK_SECRET`

## Flow

1. Customer scans on site → **JSONP** to **`?action=scan&listing=…`** → real Places completeness score + issues
2. Pay → **`?action=create_checkout&listing=…`** → Stripe Checkout (listing in **metadata**)
3. Stripe webhook → validate Maps link → generate kit → copy template Doc → fill placeholders → export **PDF** → **Gmail** to customer (if `AUTO_SEND_TO_CUSTOMER=true`)
4. Invalid Maps link → **automatic refund** + Sheet status `INVALID_LISTING`

## Local dev (optional)

`node automation/generate-kit.mjs` mirrors content shape for testing — **do not** email HTML to customers.

# What you need before go-live (owner checklist)

Plain-English setup for the Google listing kit landing page, payments, intake, and optional automation. Work through each section in order; check items off as you finish them.

---

## Stripe (you create)

- [ ] **Stripe account** — sign up at [stripe.com](https://stripe.com); complete identity and business verification if Stripe asks (required for many live businesses).
- [ ] **Payment Link** — one-time charge **$129.99 USD**; clear product name and short description (matches the landing page offer).
- [ ] **Success redirect URL** — after payment, send customers back to the intake section of your live site, for example:
  - `https://YOUR_USERNAME.github.io/YOUR_REPO/#intake`
  - Optional: add Google Form **prefill** query parameters so the session or email carries into the form (document the exact URL in your internal notes once prefill is configured).
- [ ] **Webhook** — after Google Apps Script is deployed (see below), add Stripe’s **webhook endpoint URL** (the Web App URL) in the Stripe Dashboard; subscribe to the events your script expects (e.g. `checkout.session.completed`).
- [ ] **Webhook signing secret** — copy the **`whsec_…`** value from Stripe; store it only in **Apps Script → Project Settings → Script properties** as `STRIPE_WEBHOOK_SECRET`. **Never** paste it into GitHub, the public site, or email.

**What to send the build / tech contact**

- Publishable keys are sometimes used in custom checkout; for this project a **Payment Link** is enough. Send the **Payment Link URL** (or confirm it is set on the site).
- **Never** put the **secret** API key or the webhook signing secret in the repo or in client-side HTML.

**Connect the landing page**

- On the main checkout button (`#pay-cta` in `index.html`), set **`data-stripe-url="https://buy.stripe.com/…"`** to your live Payment Link (must start with `https://buy.stripe.com/`). The script copies this to the mobile sticky button. Until this is set, the buttons stay disabled even when the three checkboxes are checked.

---

## Google Form (you create)

- [ ] **Questions** aligned with the product intake spec: see **[`intake.md`](intake.md)** (fields, optional extras, disqualify rules).
- [ ] **Email** — require a response email on the form (or an explicit email question marked required).
- [ ] **Optional session field** — add a short answer or hidden field for Stripe/session prefill from the success URL. To get prefill parameter names, use Google’s **prefilled link** tool on the form, pick each field, and note `entry.XXXXXXXX` in the generated URL; use those keys in your redirect query string.
- [ ] **Notifications** — turn on **email notifications for new responses** to **alphapulsx@gmail.com** (or your operations inbox).

**What to send the build / tech contact**

- **Form embed URL** (for an iframe) and the **form ID** segment you use in embed links (`…/d/e/FORM_ID/…`).

**Replace the on-page placeholder**

- When the form is ready, replace the placeholder block in **`index.html`** (the “Order form goes live with your link” box under `#intake`) with your embedded form **iframe** and optional “Open in new tab” link, using Google’s **Send → embed HTML** instructions.

---

## Google Doc template (you create)

- [ ] **One branded Google Doc** that will be copied per order, with placeholders your Apps Script replaces, for example:
  - `{{business_name}}`
  - `{{maps_url}}`
  - `{{service_area}}`
  - `{{top_services}}`
  - `{{phone}}`
  - `{{hours}}`
  - `{{brand_voice}}`
  - `{{customer_email}}`
  - `{{session_id}}` (if you pass it through)
- [ ] File **stored in Drive** on the same Google account that owns the Apps Script project.
- [ ] **Template document ID** — from the Doc’s URL (`…/document/d/DOC_ID/edit`); this value goes in Script properties as `TEMPLATE_DOC_ID`.

**What to send the build / tech contact**

- **Link to the template Doc** and confirmation that automation may **make a copy** of that file via script (same Google account as the deployed script).

---

## Apps Script (you deploy from `automation/Code.gs`)

- [ ] **New Apps Script project** — create a project, paste in the code from **[`../automation/Code.gs`](../automation/Code.gs)**.
- [ ] **Script properties** — in **Project Settings → Script properties**, set at least:
  - `STRIPE_WEBHOOK_SECRET` — webhook signing secret (`whsec_…`).
  - `SHEET_ID` — target Google Sheet.
  - `SHEET_NAME` — tab name (e.g. `Orders`), if your code expects it.
  - `TEMPLATE_DOC_ID` — template Doc ID above.
  - `OWNER_NOTIFY_EMAIL` — where you want internal alerts (e.g. **alphapulsx@gmail.com**); property name in code is `OWNER_NOTIFY_EMAIL` (see comments at top of `Code.gs`).
- [ ] **Deploy as Web App** — **Execute as: Me**, **Who has access: Anyone** (Stripe posts without a Google login). Copy the **Web app URL** and paste it into Stripe’s webhook settings.

**What to send the build / tech contact**

- The **Web app URL** only (it is not a secret). Secrets stay in Script properties.

---

## Deliverables definition (pick one for v1)

**Version 1 recommendation:** deliver the kit as a **Google Doc link** (copy of the template, shared appropriately) plus any **PDF export** you choose to attach or generate from that Doc. Pick a single primary handoff (“you’ll get a Doc” *or* “you’ll get a PDF”) so the landing page, auto-reply, and script all match.

**48-hour wording vs automation**

- The site promises kit delivery in **48 hours** after the customer’s completed intake, subject to your refund line for delays. **Honest automation note:** clock starts when the system has what it needs (successful payment + complete form); manual approval steps, missing listing links, or Stripe/Form outages can add delay — keep support email visible and align marketing copy with what the script and humans actually do.

---

## Related docs

- **[`automation-full-stack.md`](automation-full-stack.md)** — architecture and security.
- **[`owner-checklist.md`](owner-checklist.md)** — numbered technical setup.
- **[`free-launch-checklist.md`](free-launch-checklist.md)** — static GitHub Pages launch steps.

# Owner checklist — full automation (Stripe + Apps Script + Sheet approval)

Complete these in order. Replace placeholders with your real IDs; **never** paste secrets into the git repo.

## 1. Google account and Drive

1. Use the Google account that will **own** the kit business (e.g. **alphapulsx@gmail.com**).
2. Create a folder in Drive, e.g. **“Listing kit automation”**.
3. Create a **Google Doc** to be your **master template** (headings, boilerplate, merge tokens if you use them). Note its **Document ID** from the URL: `https://docs.google.com/document/d/DOCUMENT_ID/edit`.

## 2. Google Sheet (order log)

1. Create a new **Google Sheet** in that folder.
2. Add a header row with at least these columns (names can match your Script):

   | session_id | customer_email | listing_identifier | status | doc_url | approved | sent | notes |

3. Use **consistent** types for **`approved`** and **`sent`**: e.g. checkboxes or TRUE/FALSE.
4. Open **Extensions → Apps Script** (or link a standalone project) and paste code from **`automation/Code.gs`** in this repo, then adjust column indices / sheet name to match your sheet.

## 3. Script Properties (secrets and config)

In the Apps Script editor: **Project Settings → Script properties** (or set once via **Project Settings** UI). Add at least:

| Property | Example / notes |
|----------|-----------------|
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard → Webhooks → **Signing secret** (`whsec_…`). **Do not commit.** |
| `SHEET_ID` | From the Sheet URL. |
| `TEMPLATE_DOC_ID` | Template Doc ID from Drive URL. |
| `OWNER_NOTIFY_EMAIL` | e.g. `alphapulsx@gmail.com` — who gets “please review” mail. |
| `STRIPE_API_VERSION` | Optional; note which API version you use when parsing `customer_email` fields. |

Optional: `OPENAI_API_KEY`, `AI_INSERT_MODE`, folder IDs, etc.

## 4. Stripe Payment Link

1. In **Stripe Dashboard**, create or edit your **Payment Link** for **$129.99**.
2. Set **after payment redirect** to your GitHub Pages URL including **`#intake`** and **`{CHECKOUT_SESSION_ID}`** in the query string (see **`docs/automation-full-stack.md`**).
3. In **`index.html`** (this repo), replace the placeholder buy link with your live Payment Link when ready.

## 5. Stripe webhook → Apps Script

1. Deploy the Script as a **Web App** first (step 6) so you have a **POST URL**.
2. In Stripe: **Developers → Webhooks → Add endpoint**.
3. Paste the **Web App URL**.
4. Select event **`checkout.session.completed`** (add others only if your code handles them).
5. Copy the endpoint **Signing secret** into Script Property **`STRIPE_WEBHOOK_SECRET`**.

## 6. Deploy Apps Script as Web App

1. In Apps Script: **Deploy → New deployment**.
2. Type: **Web app**.
3. **Execute as:** your Google account (**me**).
4. **Who has access:** **Anyone** (anonymous) is typical so Stripe can POST; your code **must** reject requests that fail **signature verification**. If you cannot deploy “Anyone,” use a proxy (advanced).
5. Copy the **Web App URL** and paste it into Stripe webhooks (step 5).
6. After code changes, use **Deploy → Manage deployments → Edit** (new version) so the live URL updates.

**Optional hardening:** Stripe publishes webhook IP ranges; enforcing allowlists inside Apps Script alone is limited — signature verification is the standard control.

## 7. Google Form (1 question) and prefill

1. Create intake Form with **one** visible question: **listing link or business name + city**. **No email field** (Stripe is authoritative).
2. Optional second field: **`session_id`** (prefilled from success URL via **`app.js`**).
3. **Get pre-filled link** → map `entry.…` IDs into **`app.js`** (`YOUR_FORM_ID`, `YOUR_ENTRY_ID`, `YOUR_SESSION_ENTRY_ID`).
4. **`index.html`** already ships on-page **`#listing-id`** + Submit — no iframe. See **`docs/free-launch-checklist.md`**.
5. Implement **`mergeFormResponseBySessionId_`** (stub in **`automation/Code.gs`**) on Form submit trigger when ready.

## 8. Triggers (approval → send)

Choose one or combine:

- **Time-driven:** Every 5–15 minutes run **`sendAfterApproval()`** to pick rows with **approved** and not **sent**.
- **onEdit:** Simpler for low volume; can fire often — debounce carefully in code.
- **Custom menu:** **“Send to customer”** runs **`sendAfterApproval()`** for selected row.

Install triggers via **Triggers** (clock) in the Apps Script UI.

## 9. Gmail / Gmail API

- For **`GmailApp.sendEmail`**, the executing user must be able to send mail; usually **no separate Gmail API enablement** is required beyond what the Apps Script project prompts.
- If you use **Advanced Gmail Service** or **OAuth scopes** beyond the default, enable **Gmail API** in **Google Cloud console** linked to the Apps Script project and add the scope in **appsscript.json** — only if your code requires it.

## 10. Test end-to-end

1. Use **Stripe test mode** and **Stripe CLI** or Dashboard “Send test webhook” to hit your Web App.
2. Confirm a **new Sheet row** appears with correct **`session_id`** and email.
3. Confirm **Doc** copy and **owner** email (if implemented).
4. Set **approved**, run **send**, confirm **customer** receives mail in test (use your own email as buyer).

## 11. Go live

1. Switch Stripe to **live** keys and **live** webhook + **live** signing secret in Script Properties.
2. Redeploy Web App if needed.
3. Monitor Sheet and Stripe Dashboard for failed webhooks.

When in doubt, re-read **`docs/automation-full-stack.md`** for architecture and security notes.

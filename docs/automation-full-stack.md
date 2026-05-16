# Full automation stack (Google-first, approval gate)

This document describes an **end-to-end automated** path for the Google listing kit: customer pays with Stripe, your backend records the sale, a **Google Doc** is created from a template, you (**alphapulsx@gmail.com** or whichever account owns the automation) **review and edit** before anything goes to the client, and only after explicit **approval** does the customer receive email with their link.

**Plain English truth:** **GitHub Pages** is static hosting. It **cannot** receive Stripe webhooks, verify Stripe signatures, or send email on your behalf. For a **100% automated** payment path you need a **server** that Stripe can POST to. On a **Google-only free tier** stack, the practical choice is a **Google Apps Script Web App** (POST endpoint) or a **Cloud Function** (more setup). This repo recommends **Apps Script** so everything stays in one Google account: Sheets, Docs, Forms, Gmail, and Script.

---

## Flow A — Recommended (approval gate in Google Sheet)

This is the default design: **payment → webhook → Sheet row → Doc generation → owner review → approval column → customer email**. No manual copy-paste of Stripe payloads; the only “manual” steps are **choices you make on purpose** (edit the Doc, flip **Approved** to YES, or use a Sheet menu).

### Step 1 — Customer pays (Stripe Payment Link)

The customer completes checkout on Stripe’s hosted page (Payment Link). Stripe sends a **`checkout.session.completed`** event (and others) to endpoints you configure.

### Step 2 — Stripe webhook → Apps Script Web App (POST)

You deploy Apps Script as a **Web App** with a URL that accepts **POST** requests. In the Stripe Dashboard you add that URL as a **webhook endpoint** and choose the events you need (at minimum **`checkout.session.completed`**).

The Script’s `doPost` handler:

1. Reads the **raw body** and the **`Stripe-Signature`** header.
2. **Verifies the webhook signature** using your **signing secret** (whsec_…) so only Stripe can trigger your logic. Store that secret in **Script Properties**, never in this git repo.
3. Parses the JSON and checks **`type`** (e.g. `checkout.session.completed`).
4. Extracts **`session.id`**, **customer email** (from `customer_details.email` or `customer_email` depending on API version), and **paid** time.
5. **Appends one row** to a **Google Sheet** (your “order log”), for example:

   | session_id | customer_email | paid_at | status | doc_url | approved | sent | notes |
   |------------|----------------|---------|--------|---------|----------|------|-------|
   | cs_… | buyer@… | ISO timestamp | `AWAITING_REVIEW` or `NEEDS_GENERATION` | (filled after Doc exists) | FALSE | FALSE | |

   **`status`** meaning (you can rename columns to taste):

   - **`NEEDS_GENERATION`**: row exists; Doc not created yet (or failed — use **notes**).
   - **`AWAITING_REVIEW`**: Doc created; owner has not approved customer send.
   - After customer email goes out, you can set **`status`** to **`SENT`** and **`sent`** to **TRUE**.

### Step 3 — Create the Google Doc from a template

Either **in the same `doPost` flow** (after the row is written) or from a **time-driven trigger** / **manual menu** that processes rows with `NEEDS_GENERATION`:

1. **Copy** a **template Doc** in Drive (you store **`TEMPLATE_DOC_ID`** in Script Properties).
2. **Rename** the copy to include **`session_id`** (easy support lookups).
3. **Share policy (choose one and document it for yourself):**
   - **Owner-only until approval (recommended):** New Doc is shared **only** with your owner Google account (the account that runs the script). The customer **does not** get the Doc link until **`Approved`** is **TRUE** and **`sendAfterApproval`** runs.
   - **Optional “customer view later”:** After approval, either send a **view** link to the Doc or attach/export **PDF** via email — your product decision.

4. Write the **Doc URL** back to the Sheet row (`doc_url`).

### Step 4 — Optional: OpenAI (or other) drafting in the Doc

If you use an external API (e.g. OpenAI) from Apps Script with **`UrlFetchApp`**:

- Store the **API key** in Script Properties, not in git.
- Draft text can be inserted as **plain body** or you can use **suggestions / comments** depending on what the Docs API or your workflow supports; **owner choice** should be explicit in your Script (e.g. a property `AI_INSERT_MODE=suggestions|body`).

This step is **optional**; the approval gate still applies.

### Step 5 — Notify owner to review (GmailApp)

After the Doc exists (and optionally after AI draft), send **Gmail** to **alphapulsx@gmail.com** (example owner inbox):

> **Subject:** Review: listing kit [session_id]  
> **Body:** Open the Doc: [link]. When ready for the customer, set **`Approved`** to **YES** on the Sheet row (or use the Sheet custom menu **“Send to customer”** if you implement that).

**Oversight model:** Nothing goes to the customer until **you** either:

- Set **`Approved`** to **TRUE** / **YES** on that row, **or**
- Run an explicit **authorized** action (menu item) that marks approval and sends — still **your** explicit choice.

### Step 6 — On approval: email customer (GmailApp)

When **`Approved`** is **TRUE** and **`Sent`** is still **FALSE**:

- A function such as **`sendAfterApproval()`** (triggered by **`onEdit`**, a **time-based** trigger every few minutes, or a **custom menu**) sends **GmailApp** email to **`customer_email`** with the **Doc link** and/or **PDF** export link.
- Then set **`Sent`** to **TRUE** so you never double-email.

**Never send** customer-facing delivery email until **`Approved`** is set — **unless** you deliberately add an **opt-in** “auto-send after N hours” feature. Treat that as **dangerous**; **default off** and document it clearly if you ever add it.

---

## Flow B — Simpler fallback (not 100% payment-automated)

**Form submit only:** You can embed **Google Forms** on GitHub Pages (`#intake`) and get an email on each response. That does **not** by itself prove payment. Someone could open the form without paying. Use Flow B only as a **fallback** or for testing — not as the default for “paid customer only.”

---

## Why GitHub Pages is not enough for Stripe or email

| Need | GitHub Pages | Apps Script Web App |
|------|----------------|---------------------|
| Host static HTML/CSS | Yes | Not the primary use |
| Receive Stripe **POST** webhooks | **No** (no server) | **Yes** |
| Verify **Stripe-Signature** | **No** | **Yes** (in `doPost`) |
| Send **Gmail** | **No** | **Yes** (`GmailApp`) |
| Write **Sheets** / **Docs** | **No** | **Yes** |

So: **Pages = marketing + form embed**. **Apps Script (or Cloud Function) = automation brain.**

---

## Security

- **Stripe webhook signing secret:** Store in **File → Project settings → Script properties** (or **PropertiesService.getScriptProperties()** in code). **Never** commit `whsec_…`, API keys, or passwords to git.
- **Web App deployment:** “Execute as **me**” is normal so the script can access **your** Sheet/Docs/Drive. **Who has access:** Stripe must POST anonymously — typically **“Anyone”** can invoke **if** you **verify every request** with the signing secret and reject bad signatures. Optionally add **IP awareness** (Stripe publishes IP ranges; enforcing in Script is awkward — Cloud Armor / proxy is heavier; many small shops rely on signature verification only).
- **Least privilege:** Template Doc and Sheet should live in a Drive folder owned by the automation account; share customer links only after approval.

---

## Why not Zapier? (Optional)

**Zapier** (or Make, IFTTT, etc.) can connect Stripe → Google Sheets → Gmail. Reasons you might still prefer **Apps Script**:

- **Cost and caps** on free tiers of middleware.
- **All data in Google** + one place to read code.
- **Custom approval logic** (Sheet columns, menus) without fighting Zapier step limits.

Zapier is a valid alternative if you prefer no code.

---

## Limitations (be honest with yourself)

- **Payment Link redirect** to `yoursite.github.io/Google-BP/#intake` **does not prove payment.** The browser lands on a URL anyone can bookmark. **Proof of payment** comes from the **webhook** (or from your manually checking Stripe). Always treat the Sheet row created by the webhook as the source of truth for “paid.”
- **Apps Script quotas:** UrlFetch, email, and trigger runtime have daily limits; fine for low volume, watch dashboards as you scale.
- **Signature verification** must use the **raw** POST body exactly as Stripe sent it; do not parse JSON before verifying.

---

## Customer UX: redirect + embedded Form + session prefill

1. **Stripe Payment Link:** Set **success URL** to your site with Stripe’s placeholder **`{CHECKOUT_SESSION_ID}`**, e.g.  
   `https://alphapulsx-jpg.github.io/Google-BP/#intake?session_id={CHECKOUT_SESSION_ID}`  
   (Exact query parameter name is your choice; Stripe replaces the placeholder after checkout.)

2. **Landing page (`index.html`):** The **`#intake`** section embeds the Google Form in an **iframe**. Optionally use a tiny script (if you add one) to read **`session_id`** from the URL and **not** trust it for “paid” — only for **prefilling** the Form so rows line up with webhook data.

3. **Google Forms prefill:** Use a **prefilled link** pattern with **`entry.XXXXXXXX=VALUE`** for a **short answer** or **hidden** field where **`XXXXXXXX`** is the field’s entry id (inspect the Form’s prefill link from **Get pre-filled link** in Google Forms). The **owner must map** each `entry.…` id once.

4. **Webhook + Form:** The webhook remains authoritative for **email** and **payment**; the Form collects **business details**. Matching **`session_id`** in the Sheet (webhook row vs form row) can be done by merging on **`session_id`** in Script or by vlookup-style formulas — document your chosen merge in the Sheet.

---

## Stub implementation in repo

See **`automation/Code.gs`** for copy-paste stubs (`doPost`, `createKitDoc`, `sendAfterApproval`). Copy into the Apps Script editor bound to your Sheet or as a standalone project, then set Script Properties and deploy the Web App.

---

## Summary checklist (high level)

1. Stripe Payment Link + webhook → Apps Script URL.  
2. Script verifies signature → Sheet row.  
3. Script creates Doc from template → owner notified.  
4. Owner edits Doc; sets **Approved**.  
5. Script sends Gmail to customer; marks **Sent**.  

That is **100% automated** fulfillment with **owner oversight by choice** — no default manual Stripe copy-paste.

# Intake (post-payment) — single field

## Principle
- **Customer email:** authoritative from **Stripe** (`checkout.session.completed` → `customer_email`). Do **not** collect email on the Form.
- **Listing identifier:** one value only — **Google Maps listing link** (preferred) **or** **business name + city**.
- **No marketing prose** from the customer; AI generates copy from the listing snapshot.

## Google Form (1 question + optional hidden)
Create a Form with **exactly one** visible question:

| Field | Type | Required |
|-------|------|----------|
| Listing link or business name + city | Short answer | Yes |

**Optional (recommended for automation):** hidden or short-answer field **`session_id`**, prefilled from the Stripe success URL (`?session_id={CHECKOUT_SESSION_ID}`) via the landing page JS.

Do **not** add an email question — Stripe receipt email is the source of truth.

## On-page capture (`index.html` + `app.js`)
1. Customer lands on `#intake` after Stripe redirect.
2. They paste into **`#listing-id`** and click **Submit**.
3. JS opens a prefilled Form URL:  
   `https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?entry.YOUR_ENTRY_ID=` + value  
   (+ optional `entry.YOUR_SESSION_ENTRY_ID=` from query string).

Replace **`YOUR_FORM_ID`** and **`YOUR_ENTRY_ID`** in `app.js` after you use **Get pre-filled link** in Google Forms.

## Stripe Payment Link redirect
```
https://yoursite.github.io/Google-BP/?session_id={CHECKOUT_SESSION_ID}#intake
```

## Not required
- Google Business Profile manager invite or shared login
- Business hours, services list, brand voice, or competitor names (AI infers from listing)

## Stop / disqualify (auto-reply template)
- Wrong geography → refund.
- Wrong industry (outside ICP) → refund.
- Cannot identify listing from the single identifier → refund or one email asking for Maps link only.

## Auto-response email (short)
- Thanks — we have your **Stripe receipt email**.
- **Delivery in 48 hours** after your listing identifier is received (one field, ~10 seconds).
- You **apply all changes** yourself from the kit; no manager login.
- Support: **alphapulsx@gmail.com**

# Google-BP

Google Business Page Business — repo specs live in `docs/`. This repository includes a **static landing page** at the root for the **$129.99** DIY Google Business Profile kit (printable brochure + written report; customer applies changes).

## GitHub Pages

Enable GitHub Pages for this site:

1. Open the repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**.
4. Save. After the first deploy (usually within a minute or two), the site is available at:

   **`https://alphapulsx-jpg.github.io/Google-BP/`**

The repo includes an empty **`.nojekyll`** file at the root so GitHub Pages serves static assets predictably (no Jekyll processing).

## SEO / AI crawlers

For search engines, chatbots, and **llms.txt** consumers, the repo root includes:

- **`robots.txt`** — allows all crawlers and points to the sitemap.
- **`sitemap.xml`** — homepage URL with lastmod for indexing.
- **`llms.txt`** — short, plain-text summary of the offer, policy, and canonical URL.

Structured data (JSON-LD), canonical URL, and Open Graph / Twitter tags live in **`index.html`**. Keep **GitHub Pages** set to deploy **from the `main` branch** and folder **`/ (root)`** so these files are served at the site root (same folder as `index.html`).

## Stripe Payment Link (required before go-live)

The primary checkout button in **`index.html`** reads your live URL from **`data-stripe-url`** on **`#pay-cta`** (must look like `https://buy.stripe.com/…`). Paste your **Stripe Payment Link** for **$129.99** there. Set the link’s **after-payment redirect** to your site’s intake section (`#intake`). Until `data-stripe-url` is set, the pay buttons stay disabled even when the three confirmation boxes are checked.

For Forms, Gmail notifications, and the static-site launch order, see **`docs/free-launch-checklist.md`** and **`docs/intake.md`**.

## Full automation (Google only)

**Owner-facing setup (checkboxes, what to send us):** **[`docs/setup-what-you-need.md`](docs/setup-what-you-need.md)**

GitHub Pages **cannot** verify Stripe webhooks or send mail. For a **100% automated** payment path with an **owner approval gate** before the customer is emailed, use **Google Apps Script** (Web App) + **Sheets** + **Docs** + **Gmail** — see:

- **[`docs/automation-full-stack.md`](docs/automation-full-stack.md)** — architecture (Flows A/B), security, limitations, customer UX (redirect + Form prefill).
- **[`docs/owner-checklist.md`](docs/owner-checklist.md)** — numbered setup (Stripe webhook, Web App deploy, Sheet columns, template Doc, triggers).
- **[`automation/Code.gs`](automation/Code.gs)** — stub to copy into the Apps Script editor (`doPost`, `createKitDoc`, `sendAfterApproval`); secrets only in **Script Properties**, never in git.

## Local preview

Open `index.html` in a browser, or from the repo root:

```bash
npx --yes serve -l 3000
```

Then visit `http://localhost:3000`.

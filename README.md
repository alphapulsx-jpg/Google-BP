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

## Stripe Payment Link (required before go-live)

The primary CTA in `index.html` uses a **placeholder** Stripe URL:

`https://buy.stripe.com/test_replace_me`

Replace that URL with your real **Stripe Payment Link** priced at **$129.99** in `index.html` (search for `test_replace_me`). In the Stripe dashboard, set the payment link’s **after-payment redirect** to your intake form (see `docs/intake.md`).

## Local preview

Open `index.html` in a browser, or from the repo root:

```bash
npx --yes serve -l 3000
```

Then visit `http://localhost:3000`.

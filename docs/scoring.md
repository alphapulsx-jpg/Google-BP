# Profile completeness score (real data)

## Source

- **Google Places API (New)** — `searchText` + `place` details
- Same function for **free scan** and **paid kit** (`runListingScan_` in `automation/PlacesScan.gs`)
- **No random numbers**, no hash-based mock scores

## What the score measures

**Profile completeness (0–100)** — field coverage on the listing Google returns, **not** star rating.

| Signal | Max pts | From API |
|--------|---------|----------|
| Phone | 10 | `nationalPhoneNumber` |
| Website | 10 | `websiteUri` |
| Address | 8 | `formattedAddress` |
| Hours | 12 | `regularOpeningHours.periods` |
| Photos | 22 | `photos.length` × 2 (cap 22) |
| Description | 18 | `editorialSummary` / `generativeSummary` length |
| Primary category | 12 | `primaryType` not generic |
| Operational | 5 | `businessStatus === OPERATIONAL` |
| Reviews on file | 5 | `userRatingCount` |

## “With kit applied” score

Deterministic: **before + sum(recoverable points for top gaps)**, capped at **96**.

Each gap documents missing data and how many points the kit targets (e.g. add photos → up to 22 pts recoverable).

## Top 3 issues

The three gaps with the **highest recoverable points**, written from **actual missing fields** (e.g. real photo count, real description length).

## Requirements

1. Script property **`GOOGLE_PLACES_API_KEY`** (Places API enabled in Google Cloud)
2. Landing **`data-checkout-api`** = deployed Apps Script web app URL
3. Scan endpoint: `?action=scan&listing=…&callback=…` (JSONP from static site)

Without the API key, the site shows an error — **it will not show fake scores**.

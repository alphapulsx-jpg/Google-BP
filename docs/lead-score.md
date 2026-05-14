# Lead scoring & sourcing

## Principles
- Prefer **Google Places API** (or licensed export) over brittle scraping.
- **Human approves** weekend batch before outreach/spend.

## Inputs (columns)
- place_id, name, address, phone, website, types, rating, user_ratings_total, maps_url

## Score 0–100 (example weights — tune weekly)
- **+30** Missing/weak primary category OR services list empty
- **+20** <20 photos (threshold tunable)
- **+15** Description <300 chars or generic
- **+10** Hours missing/inconsistent
- **+10** No Q&A answered (if visible)
- **+15** “Established elsewhere” proxy: site present + phone answers + reviews on GBP low but not zero — **manual verify**
- **−40** Outside **[region]**
- **−30** Wrong category types (not **[trade]**)
- **−20** Brand-new GBP with **0 reviews** unless other strong proof

## Buckets
- **A (70+):** outreach first
- **B (50–69):** second pass
- **C:** ignore this month

## Weekly workflow (60 min max)
1. Refresh list → score → sort A
2. Spot-check 10 rows for false positives
3. Export top **N** to `outreach.md` queue

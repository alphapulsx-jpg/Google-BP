# Google Doc template — placeholders

Create one Google Doc in Drive with these **exact** tokens (double curly braces). Apps Script replaces them on each paid order.

## Header

- `{{BUSINESS_NAME}}`
- `{{CITY_REGION}}`
- `{{LISTING_URL}}`
- `{{PREPARED_DATE}}`
- `{{SESSION_ID}}`

## Snapshot

- `{{COMPLETENESS_BEFORE}}` — e.g. `74`
- `{{COMPLETENESS_AFTER}}` — e.g. `92`
- `{{STRENGTHS}}`

## Issues (ranked)

- `{{ISSUE_1_TITLE}}` / `{{ISSUE_1_WHY}}` / `{{ISSUE_1_WHERE}}`
- `{{ISSUE_2_TITLE}}` / `{{ISSUE_2_WHY}}` / `{{ISSUE_2_WHERE}}`
- `{{ISSUE_3_TITLE}}` / `{{ISSUE_3_WHY}}` / `{{ISSUE_3_WHERE}}`

## Paste blocks (customer copies into Google Business Profile)

- `{{DESCRIPTION_PASTE}}`
- `{{SERVICES_PASTE}}`
- `{{QA_BLOCK}}`
- `{{POSTS_BLOCK}}`

## Brochure / ops

- `{{PHOTO_CHECKLIST}}`
- `{{COMPETITOR_NOTE}}`

Copy the template Doc ID into Script Property **`TEMPLATE_DOC_ID`**.

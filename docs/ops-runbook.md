# Ops runbook



## Naming

- Drive folder: `GBP-{{YYYY-MM-DD}}-{{BusinessSlug}}`



## States

`Paid → Info received → Report delivered → Closed`



## Cadence

- **Daily (~10 min):** check payments + new intake rows; trigger agent draft for any form completed in last 24h

- **Per delivery:** agent generates brochure + report from template → optional human spot-check → email within **48h** of completed form



## SLA (internal)

- **Customer promise:** brochure + written report in **48 hours** after short post-pay form.

- **Customer time:** **~5 minutes** for the form; applying copy-paste steps is on their schedule.

- **Build:** primarily **agent-generated**; human review optional before send.

- **Refund trigger:** not delivered within **5 business days** of completed form (see `design.md`).



## If intake is incomplete

- Email script: ask for listing link, or business name + city, or up to 3 screenshots to confirm the profile.



## If client scope creeps

- Reply: "That's outside the $129.99 DIY kit; I can quote separately or you can handle with your web person."



## Quality bar (non-negotiable)

- Brochure artifact + Google Doc with paste-ready blocks and numbered steps

- No unverifiable claims in suggested profile text

- Customer clearly understands **they** apply every change (no implied manager access)



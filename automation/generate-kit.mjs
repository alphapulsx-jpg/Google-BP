#!/usr/bin/env node
/**
 * Local kit generator — proves the listing → scan → deliverable pipeline.
 * Usage: node automation/generate-kit.mjs [profile-json] [output-dir]
 *
 * Production: Apps Script calls OpenAI with listing snapshot; this script uses
 * curated public data + templates for demo / QA without API keys.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function isValidMapsUrl(value) {
  const v = String(value).toLowerCase();
  return (
    v.includes("maps.google.com") ||
    v.includes("google.com/maps") ||
    v.includes("goo.gl/maps") ||
    v.includes("maps.app.goo.gl")
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function copyBlock(text) {
  return `<pre class="copy">${escapeHtml(text.trim())}</pre>`;
}

function loadProfile(profilePath) {
  const raw = readFileSync(profilePath, "utf8");
  return JSON.parse(raw);
}

function buildPosts(p) {
  const areas = p.service_areas.slice(0, 4).join(", ");
  return [
    {
      title: "Furnace tune-up season",
      body: `Book your fall furnace tune-up in ${areas}. Family-owned since ${p.since_year}. Licensed & insured · Bryant Factory Authorized Dealer. Call ${p.phone_primary} or schedule online.`,
    },
    {
      title: "24/7 emergency HVAC",
      body: `No heat? No cool air? Triumph offers 24/7 emergency HVAC in the Central Okanagan. ${p.phone_primary} — West Kelowna · Kelowna · surrounding communities.`,
    },
    {
      title: "Heat pump rebates",
      body: `Considering a heat pump? Ask Triumph about installation, rebates, and financing. NATE-certified techs · ${p.credentials[4]}. ${p.website}`,
    },
    {
      title: "VIP membership",
      body: `2 yearly inspections · priority scheduling · 10% off repairs. Join the Triumph VIP Club — peace of mind for your home comfort. Learn more on our site.`,
    },
    {
      title: "AC ready for summer",
      body: `AC install, repair & maintenance in Kelowna & West Kelowna. Ductless mini-splits available. Schedule service: ${p.booking_url}`,
    },
  ];
}

function buildQa(p) {
  return [
    {
      q: "Are you licensed and insured in BC?",
      a: `Yes. Triumph Heating & Air Conditioning is licensed, bonded, and insured in British Columbia. Gas Licence No. LGA0201999.`,
    },
    {
      q: "Do you offer emergency service?",
      a: `Yes — 24/7 emergency HVAC service for the Central Okanagan. Call ${p.phone_primary}.`,
    },
    {
      q: "What brands do you install?",
      a: `We are a Bryant Factory Authorized Dealer and service all makes and models for repair and maintenance.`,
    },
    {
      q: "Do you offer financing?",
      a: `Yes — residential and commercial financing available. Apply online via our website or ask when you schedule.`,
    },
    {
      q: "What areas do you serve?",
      a: `We serve Kelowna, West Kelowna, and the greater Central Okanagan. See triumphheatandair.com/service-areas for details.`,
    },
    {
      q: "Do you install heat pumps?",
      a: `Yes — heat pump installation, service, and maintenance. Ask about current rebates and warranty: 5-year labour & 10-year parts on new installs.`,
    },
  ];
}

function formatPreparedDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function descriptionPaste(p) {
  const hours = p.hours_display || p.hours_regular.replace(/^Monday–Friday\s+/i, "Mon–Fri ");
  const desc = `${p.business_name} — family-owned HVAC in the Central Okanagan since ${p.since_year}. Furnace & AC repair, installation, heat pumps, ductless mini-splits, hot water tanks, and commercial HVAC. Bryant Factory Authorized Dealer · NATE-certified technicians · licensed, bonded & insured (Gas Licence LGA0201999). ${p.hours_emergency}. ${hours} · Schedule: ${p.booking_url} · ${p.phone_primary}`;
  return desc.length > 750 ? desc.slice(0, 747) + "…" : desc;
}

function blurbAfter(p) {
  return `Licensed Bryant dealer · 24/7 emergency · family-owned since ${p.since_year}. Full services, suburbs, and fresh posts so your ${p.public_signals.review_count_estimate} reviews convert to more calls.`;
}

function servicesPaste(p) {
  return p.services_primary.map((s) => `• ${s}`).join("\n");
}

function buildBrochureHtml(p, preparedLabel) {
  const b = p.scan_before;
  const a = p.scan_after;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(p.business_name)} — Listing kit brochure</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Fraunces:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --teal: #0d5c63; --teal-ink: #0a4a50; --gold: #e8b84a; --ink: #1a1f1e; --muted: #5c6563; --paper: #faf8f4; --line: #e2ddd4; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "DM Sans", system-ui, sans-serif; color: var(--ink); background: var(--paper); line-height: 1.45; }
    .page { max-width: 8.5in; margin: 0 auto; padding: 0.6in; }
    @media print { .page { page-break-after: always; } .no-print { display: none; } }
    .cover { background: linear-gradient(145deg, var(--teal) 0%, #134e4a 100%); color: #f4f0e6; border-radius: 12px; padding: 1.5rem 1.75rem; margin-bottom: 1.25rem; }
    .cover h1 { font-family: Fraunces, Georgia, serif; font-size: 1.65rem; margin: 0.5rem 0 0.25rem; }
    .cover .meta { opacity: 0.9; font-size: 0.95rem; }
    .cover .tag { display: inline-block; margin-top: 0.75rem; padding: 0.35rem 0.65rem; background: rgba(232,184,74,0.2); border: 1px solid rgba(232,184,74,0.5); border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin: 1rem 0; }
    .metric { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 0.65rem; text-align: center; font-size: 0.8rem; }
    .metric strong { display: block; font-size: 1.1rem; color: var(--teal-ink); }
    .metric .after { color: #15803d; }
    .mock { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1rem 0; }
    .mock article { border-radius: 8px; padding: 0.85rem; font-size: 0.85rem; line-height: 1.45; }
    .mock--after p:last-child { margin-bottom: 0; }
    .mock--before { background: #f5f0ea; border: 1px dashed #c4b8a8; }
    .mock--after { background: #ecfdf5; border: 1px solid #86efac; }
    .mock h3 { margin: 0 0 0.35rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
    .wins { margin: 0; padding-left: 1.1rem; }
    .wins li { margin-bottom: 0.35rem; }
    .footer { margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1px solid var(--line); font-size: 0.75rem; color: var(--muted); }
    .btn { display: inline-block; margin-bottom: 1rem; padding: 0.5rem 1rem; background: var(--teal); color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="page">
    <p class="no-print"><a class="btn" href="kit-report.html">Open full report (paste blocks) →</a></p>
    <header class="cover">
      <p class="meta">Google Listing Kit · Prepared ${escapeHtml(preparedLabel)}</p>
      <h1>${escapeHtml(p.business_name)}</h1>
      <p class="meta">${escapeHtml(p.city_region)}</p>
      <span class="tag">DIY paste-ready · Maps profile only</span>
    </header>
    <p class="meta" style="margin:0 0 0.75rem;font-size:0.8rem">Profile completeness (not star rating)</p>
    <ul class="metrics" aria-label="Profile completeness before and after">
      <li class="metric"><span>Complete</span><strong>${b.score} → <span class="after">${a.score}</span></strong></li>
      <li class="metric"><span>Services</span><strong>${b.services_listed} → <span class="after">${a.services_listed}</span></strong></li>
      <li class="metric"><span>Photos</span><strong>${b.photos_estimate} → <span class="after">${a.photos_estimate}</span></strong></li>
      <li class="metric"><span>Q&amp;A</span><strong>${b.qa_answered} → <span class="after">${a.qa_answered}</span></strong></li>
    </ul>
    <div class="mock">
      <article class="mock--before">
        <h3>Before (snapshot)</h3>
        <p><strong>${escapeHtml(p.short_name)}</strong><br />HVAC contractor · ${escapeHtml(p.public_signals.rating_estimate)} · ${escapeHtml(p.public_signals.review_count_estimate)}</p>
        <p>Strong reviews — profile still missing suburb keywords, full services list, and fresh posts.</p>
      </article>
      <article class="mock--after">
        <h3>After (target)</h3>
        <p><strong>${escapeHtml(p.business_name)}</strong><br />HVAC contractor · Licensed Bryant dealer · 24/7 emergency</p>
        <p>${escapeHtml(blurbAfter(p))}</p>
      </article>
    </div>
    <h2>Top 3 wins in this kit</h2>
    <ol class="wins">
      ${p.issues_ranked.map((i) => `<li><strong>${escapeHtml(i.title)}</strong> — ${escapeHtml(i.why)}</li>`).join("")}
    </ol>
    <p class="footer">Listing: ${escapeHtml(p.listing_identifier.slice(0, 80))}… · Generated by automation demo · Page 1 of 2 — see report for paste blocks</p>
  </div>
  <div class="page">
    <h2>Photo shot list (next 30 days)</h2>
    <ul class="wins">
      <li>Branded van at #7-1385 Stevens Rd (storefront)</li>
      <li>Technician at furnace tune-up (face + uniform)</li>
      <li>Heat pump outdoor unit install (before/after)</li>
      <li>Bryant equipment badge close-up</li>
      <li>Commercial rooftop unit (if applicable)</li>
      <li>Happy homeowner with thermostat (signed release)</li>
    </ul>
    <h2>Next step</h2>
    <p>Open <strong>kit-report.html</strong> for copy-paste description, services, Q&amp;A, and 5 Google posts. Apply in Google Business Profile yourself — no password shared.</p>
    <p class="footer">${escapeHtml(p.business_name)} · ${escapeHtml(p.phone_primary)} · ${escapeHtml(p.website)}</p>
  </div>
</body>
</html>`;
}

function buildReportHtml(p, preparedLabel) {
  const posts = buildPosts(p);
  const qa = buildQa(p);
  const desc = descriptionPaste(p);
  const services = servicesPaste(p);

  const steps = p.issues_ranked
    .map(
      (issue, idx) => `
    <section class="step">
      <h2>${idx + 1}. ${escapeHtml(issue.title)}</h2>
      <p><strong>Why:</strong> ${escapeHtml(issue.why)}</p>
      <p><strong>Where:</strong> ${escapeHtml(issue.where)}</p>
    </section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(p.business_name)} — Listing kit report</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Fraunces:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: "DM Sans", system-ui, sans-serif; max-width: 46rem; margin: 0 auto; padding: 1.5rem; color: #1a1f1e; line-height: 1.5; background: #faf8f4; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; }
    h2 { font-size: 1.1rem; margin-top: 1.75rem; color: #0d5c63; }
    .meta { font-size: 0.9rem; color: #5c6563; }
    .copy { background: #fff; border: 1px solid #e2ddd4; border-left: 4px solid #0d5c63; padding: 0.75rem 1rem; font-size: 0.85rem; white-space: pre-wrap; word-break: break-word; }
    .score { display: flex; gap: 1.5rem; margin: 1rem 0; font-weight: 700; }
    .issue { background: #fff7ed; border-left: 4px solid #ea580c; padding: 0.5rem 0.75rem; margin: 0.5rem 0; }
    @media print { .no-print { display: none; } }
    a.btn { display: inline-block; margin-bottom: 1rem; padding: 0.5rem 1rem; background: #0d5c63; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <p class="no-print"><a class="btn" href="kit-brochure.html">← Brochure</a></p>
  <h1>${escapeHtml(p.business_name)}</h1>
  <p class="meta">Google listing kit · Prepared ${escapeHtml(preparedLabel)} · Session ${escapeHtml(p.session_id_demo)}</p>

  <h2>1) Snapshot (before)</h2>
  <p><strong>Maps link:</strong> <a href="${escapeHtml(p.listing_identifier)}">${escapeHtml(p.listing_identifier)}</a></p>
  <p><strong>Address:</strong> ${escapeHtml(p.address)} · <strong>Phone:</strong> ${escapeHtml(p.phone_primary)}</p>
  <div class="score">
    <span>Profile completeness: ${p.scan_before.score}/100 → target ${p.scan_after.score}/100 (not star rating)</span>
  </div>
  <p><strong>Strengths:</strong> ${p.public_signals.strengths.map(escapeHtml).join("; ")}</p>
  <p class="meta">Sources: ${p.data_sources.map(escapeHtml).join(" · ")}</p>

  <h2>2) Issues found (ranked)</h2>
  ${p.issues_ranked.map((i, n) => `<div class="issue"><strong>${n + 1}. ${escapeHtml(i.title)}</strong><br />${escapeHtml(i.why)}</div>`).join("")}

  <h2>3) Step-by-step DIY</h2>
  ${steps}

  <h2>4) Business description — paste this</h2>
  ${copyBlock(desc)}

  <h2>5) Services — add or align these</h2>
  ${copyBlock(services)}

  <h2>6) Q&amp;A bank</h2>
  ${qa.map((row) => `<h3>Q: ${escapeHtml(row.q)}</h3><p><strong>A (paste):</strong></p>${copyBlock(row.a)}`).join("")}

  <h2>7) Five Google posts</h2>
  ${posts.map((post, i) => `<h3>Post ${i + 1}: ${escapeHtml(post.title)}</h3>${copyBlock(post.body)}`).join("")}

  <h2>8) Competitor note</h2>
  <p>${escapeHtml(p.competitor_note)}</p>

  <h2>Photo checklist (30 days)</h2>
  <ul>
    <li>Storefront / unit #7 at Stevens Rd</li>
    <li>Van wrap + licence number visible</li>
    <li>3 job-site before/after sets (furnace, AC, heat pump)</li>
    <li>Team photo (uniforms)</li>
    <li>VIP / maintenance reminder graphic</li>
  </ul>

  <p class="meta">Definition of done: category, description, services, attributes, Q&amp;A, posts, and photo plan updated in GBP — or items marked N/A with reason.</p>
</body>
</html>`;
}

function main() {
  const profilePath = resolve(process.argv[2] || join(__dirname, "listing-profiles", "triumph-heating-kelowna.json"));
  const outDir = resolve(process.argv[3] || join(ROOT, "deliverables", "triumph-heating-kelowna"));

  const started = Date.now();
  const p = loadProfile(profilePath);

  if (!isValidMapsUrl(p.listing_identifier)) {
    console.error("INVALID_LISTING: not a Google Maps URL");
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const preparedLabel = formatPreparedDate(generatedAt);
  const brochure = buildBrochureHtml(p, preparedLabel);
  const report = buildReportHtml(p, preparedLabel);

  writeFileSync(join(outDir, "kit-brochure.html"), brochure, "utf8");
  writeFileSync(join(outDir, "kit-report.html"), report, "utf8");

  const elapsedMs = Date.now() - started;
  const manifest = {
    status: "GENERATED",
    business_name: p.business_name,
    listing_identifier: p.listing_identifier,
    session_id: p.session_id_demo,
    generated_at: generatedAt,
    elapsed_ms: elapsedMs,
    sla_target_seconds: 90,
    sla_met: elapsedMs < 90000,
    outputs: {
      brochure: "kit-brochure.html",
      report: "kit-report.html",
    },
    scan: { before: p.scan_before, after: p.scan_after },
    pipeline: [
      "validateListingIdentifier",
      "fetchPublicListingSnapshot",
      "rankIssues",
      "renderBrochureHtml",
      "renderReportHtml",
      "writeManifest",
    ],
  };

  writeFileSync(join(outDir, "generation-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log("OK", outDir);
  console.log("  brochure:", join(outDir, "kit-brochure.html"));
  console.log("  report:  ", join(outDir, "kit-report.html"));
  console.log("  manifest:", join(outDir, "generation-manifest.json"));
  console.log("  elapsed: ", elapsedMs + "ms (SLA 90s:", manifest.sla_met + ")");
}

main();

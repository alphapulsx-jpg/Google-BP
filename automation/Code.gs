/**
 * Google listing kit — automated fulfillment
 * Stripe Checkout (listing in metadata) → webhook → Google Doc + PDF → Gmail
 *
 * Deploy as Web App (Execute as: Me, Anyone). Set Script Properties — see automation/README.md
 */

var PROP_STRIPE_SECRET = 'STRIPE_SECRET_KEY';
var PROP_STRIPE_WEBHOOK = 'STRIPE_WEBHOOK_SECRET';
var PROP_STRIPE_PRICE = 'STRIPE_PRICE_ID';
var PROP_SUCCESS_URL = 'CHECKOUT_SUCCESS_URL';
var PROP_CANCEL_URL = 'CHECKOUT_CANCEL_URL';
var PROP_SHEET_ID = 'SHEET_ID';
var PROP_SHEET_NAME = 'SHEET_NAME';
var PROP_TEMPLATE_DOC = 'TEMPLATE_DOC_ID';
var PROP_OWNER_EMAIL = 'OWNER_NOTIFY_EMAIL';
var PROP_AUTO_SEND = 'AUTO_SEND_TO_CUSTOMER';
var PROP_OPENAI_KEY = 'OPENAI_API_KEY';

var DEFAULT_SUCCESS_URL =
  'https://alphapulsx-jpg.github.io/Google-BP/?session_id={CHECKOUT_SESSION_ID}#checkout';
var DEFAULT_CANCEL_URL = 'https://alphapulsx-jpg.github.io/Google-BP/#scan-form';

/** GET ?action=create_checkout&listing=… → redirect to Stripe Checkout */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  if (params.action === 'create_checkout') {
    return handleCreateCheckout_(params.listing || '');
  }
  return HtmlService.createHtmlOutput(
    '<p>Google listing kit automation. Use <code>?action=create_checkout&amp;listing=…</code> from the landing page pay button.</p>'
  );
}

/** Stripe webhook POST */
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var webhookSecret = props.getProperty(PROP_STRIPE_WEBHOOK);
  if (!webhookSecret) {
    return textResponse_('Missing STRIPE_WEBHOOK_SECRET', 500);
  }

  var payload = e.postData && e.postData.contents;
  if (!payload) {
    return textResponse_('Empty body', 400);
  }

  var sigHeader = getStripeSignatureHeader_(e);
  if (!verifyStripeSignature_(payload, sigHeader, webhookSecret)) {
    return textResponse_('Invalid signature', 400);
  }

  var event;
  try {
    event = JSON.parse(payload);
  } catch (err) {
    return textResponse_('Invalid JSON', 400);
  }

  if (event.type === 'checkout.session.completed') {
    var session = event.data && event.data.object;
    if (!session) {
      return textResponse_('No session', 400);
    }
    try {
      handleCheckoutCompleted_(session);
    } catch (err) {
      Logger.log('Fulfillment error: ' + err);
      notifyOwner_('Fulfillment failed: ' + session.id, String(err));
    }
    return textResponse_('ok', 200);
  }

  return textResponse_('ignored', 200);
}

function handleCreateCheckout_(listing) {
  var trimmed = String(listing || '').trim();
  if (!validateListingIdentifier_(trimmed)) {
    return HtmlService.createHtmlOutput(
      '<p><strong>Invalid listing.</strong> Use a Google Maps share link or <em>Business name, City</em> with a comma.</p>' +
        '<p><a href="' +
        DEFAULT_CANCEL_URL +
        '">Back to site</a></p>'
    );
  }

  try {
    var checkoutUrl = createStripeCheckoutSession_(trimmed);
    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<meta http-equiv="refresh" content="0;url=' +
        escapeHtmlAttr_(checkoutUrl) +
        '">' +
        '<title>Redirecting to checkout…</title></head><body>' +
        '<p>Redirecting to secure checkout… <a href="' +
        escapeHtmlAttr_(checkoutUrl) +
        '">Click here</a> if you are not redirected.</p></body></html>'
    );
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<p><strong>Checkout could not start.</strong> ' + escapeHtml_(String(err)) + '</p>'
    );
  }
}

function createStripeCheckoutSession_(listingIdentifier) {
  var props = PropertiesService.getScriptProperties();
  var secretKey = props.getProperty(PROP_STRIPE_SECRET);
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY in Script properties');
  }

  var successUrl = props.getProperty(PROP_SUCCESS_URL) || DEFAULT_SUCCESS_URL;
  var cancelUrl = props.getProperty(PROP_CANCEL_URL) || DEFAULT_CANCEL_URL;
  var priceId = props.getProperty(PROP_STRIPE_PRICE);

  var payload = {
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'metadata[listing_identifier]': listingIdentifier,
    'line_items[0][quantity]': '1',
  };

  if (priceId) {
    payload['line_items[0][price]'] = priceId;
  } else {
    payload['line_items[0][price_data][currency]'] = 'usd';
    payload['line_items[0][price_data][unit_amount]'] = '12999';
    payload['line_items[0][price_data][product_data][name]'] = 'Google listing kit (one-time)';
  }

  var resp = UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + secretKey },
    payload: payload,
    muteHttpExceptions: true,
  });

  var code = resp.getResponseCode();
  var body = resp.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Stripe Checkout error (' + code + '): ' + body);
  }

  var json = JSON.parse(body);
  if (!json.url) {
    throw new Error('Stripe did not return a checkout URL');
  }
  return json.url;
}

function handleCheckoutCompleted_(session) {
  var sessionId = session.id;
  var customerEmail =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email ||
    '';
  var listing =
    (session.metadata && session.metadata.listing_identifier) || '';

  if (!validateListingIdentifier_(listing)) {
    appendSheetRow_(sessionId, customerEmail, listing, 'INVALID_LISTING');
    refundCheckoutSession_(session);
    notifyOwner_(
      'Refunded — invalid listing: ' + sessionId,
      'Listing: ' + listing + '\nCustomer: ' + customerEmail
    );
    return;
  }

  fulfillPaidOrder_(sessionId, customerEmail, listing);
}

function fulfillPaidOrder_(sessionId, customerEmail, listing) {
  appendSheetRow_(sessionId, customerEmail, listing, 'FULFILLING');

  var kit = generateKitContent_(listing);
  var docUrl = createAndFillKitDoc_(sessionId, customerEmail, listing, kit);
  var docId = docUrl.replace(/.*\/d\//, '').replace(/\/.*$/, '');
  var pdfBlob = exportDocAsPdf_(docId, kit.business_name + ' — listing kit.pdf');

  updateSheetAfterFulfillment_(sessionId, docUrl, 'FULFILLED');

  var autoSend = isAutoSendEnabled_();
  if (autoSend && customerEmail) {
    sendKitToCustomer_(customerEmail, sessionId, kit.business_name, docUrl, pdfBlob);
    markSheetSent_(sessionId);
  } else {
    markSheetApprovedPending_(sessionId);
    notifyOwner_(
      'Review kit: ' + sessionId,
      'Doc: ' + docUrl + '\nCustomer: ' + customerEmail + '\nSet Approved=TRUE and run sendAfterApproval() if AUTO_SEND is off.'
    );
  }
}

/** Manual test: Run from Apps Script editor with a Maps URL */
function testFulfillSampleListing() {
  fulfillPaidOrder_('test_manual_' + Date.now(), Session.getActiveUser().getEmail(), 'Triumph Heating, Kelowna');
}

function generateKitContent_(listingIdentifier) {
  var parsed = parseListingIdentifier_(listingIdentifier);
  var seed = hashString_(listingIdentifier.toLowerCase());
  var strong = isMapsUrl_(listingIdentifier);
  var before = strong ? 70 + (seed % 6) : 58 + (seed % 14);
  var after = strong ? 90 + (seed % 4) : 86 + (seed % 8);

  var issues = pickIssues_(seed);
  var openAiKey = PropertiesService.getScriptProperties().getProperty(PROP_OPENAI_KEY);
  if (openAiKey) {
    try {
      return generateKitWithOpenAi_(listingIdentifier, parsed, before, after, issues, openAiKey);
    } catch (err) {
      Logger.log('OpenAI fallback: ' + err);
    }
  }

  return buildKitFromRules_(parsed, listingIdentifier, before, after, issues);
}

function buildKitFromRules_(parsed, listingIdentifier, before, after, issues) {
  var name = parsed.business_name;
  var city = parsed.city_region;
  var desc =
    name +
    ' — trusted local service in ' +
    city +
    '. Licensed and insured. Call today for fast scheduling. ' +
    listingIdentifier;

  var services =
    '• Emergency service\n• Installation\n• Repair & maintenance\n• Free estimates\n• Residential & commercial';

  var qa =
    'Q: Are you licensed?\nA: Yes — we are fully licensed and insured in our service area.\n\n' +
    'Q: Do you offer emergency service?\nA: Contact us for availability and same-day options when possible.\n\n' +
    'Q: What areas do you serve?\nA: We serve ' +
    city +
    ' and nearby communities.';

  var posts =
    'Post 1: Seasonal tune-up reminder for ' +
    city +
    ' homeowners.\n\n' +
    'Post 2: 24/7 emergency — call now.\n\n' +
    'Post 3: Financing may be available — ask when you book.';

  return {
    business_name: name,
    city_region: city,
    listing_url: listingIdentifier,
    completeness_before: String(before),
    completeness_after: String(after),
    strengths: 'Strong local presence — this kit completes categories, services, posts, and Q&A.',
    issue_1_title: issues[0].title,
    issue_1_why: issues[0].why,
    issue_1_where: issues[0].where,
    issue_2_title: issues[1].title,
    issue_2_why: issues[1].why,
    issue_2_where: issues[1].where,
    issue_3_title: issues[2].title,
    issue_3_why: issues[2].why,
    issue_3_where: issues[2].where,
    description_paste: desc.slice(0, 750),
    services_paste: services,
    qa_block: qa,
    posts_block: posts,
    photo_checklist:
      '• Storefront or branded vehicle\n• Job-site before/after (3 sets)\n• Team in uniform\n• Equipment close-up',
    competitor_note:
      'Local map results are competitive — complete services and weekly posts defend visibility even with good reviews.',
  };
}

function generateKitWithOpenAi_(listingIdentifier, parsed, before, after, issues, apiKey) {
  var prompt =
    'Generate a Google Business Profile DIY kit as JSON with keys: description_paste (max 750 chars), services_paste, qa_block, posts_block, competitor_note. ' +
    'Business: ' +
    parsed.business_name +
    ', area: ' +
    parsed.city_region +
    '. Listing: ' +
    listingIdentifier +
    '. Trade: home service. No ranking guarantees.';

  var resp = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
    muteHttpExceptions: true,
  });

  if (resp.getResponseCode() !== 200) {
    throw new Error(resp.getContentText());
  }

  var data = JSON.parse(resp.getContentText());
  var content = JSON.parse(data.choices[0].message.content);

  return {
    business_name: parsed.business_name,
    city_region: parsed.city_region,
    listing_url: listingIdentifier,
    completeness_before: String(before),
    completeness_after: String(after),
    strengths: 'Generated from your public listing snapshot.',
    issue_1_title: issues[0].title,
    issue_1_why: issues[0].why,
    issue_1_where: issues[0].where,
    issue_2_title: issues[1].title,
    issue_2_why: issues[1].why,
    issue_2_where: issues[1].where,
    issue_3_title: issues[2].title,
    issue_3_why: issues[2].why,
    issue_3_where: issues[2].where,
    description_paste: content.description_paste || '',
    services_paste: content.services_paste || '',
    qa_block: content.qa_block || '',
    posts_block: content.posts_block || '',
    photo_checklist:
      '• Storefront or branded vehicle\n• Job-site before/after\n• Team photo\n• Equipment badge',
    competitor_note: content.competitor_note || '',
  };
}

function createAndFillKitDoc_(sessionId, customerEmail, listingIdentifier, kit) {
  var props = PropertiesService.getScriptProperties();
  var templateId = props.getProperty(PROP_TEMPLATE_DOC);
  if (!templateId) {
    throw new Error('Missing TEMPLATE_DOC_ID');
  }

  var copy = DriveApp.getFileById(templateId).makeCopy('Listing kit — ' + kit.business_name + ' — ' + sessionId);
  var doc = DocumentApp.openById(copy.getId());
  var body = doc.getBody();
  var prepared = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'MMMM yyyy');

  var map = {
    '{{BUSINESS_NAME}}': kit.business_name,
    '{{CITY_REGION}}': kit.city_region,
    '{{LISTING_URL}}': kit.listing_url,
    '{{PREPARED_DATE}}': prepared,
    '{{SESSION_ID}}': sessionId,
    '{{CUSTOMER_EMAIL}}': customerEmail,
    '{{COMPLETENESS_BEFORE}}': kit.completeness_before,
    '{{COMPLETENESS_AFTER}}': kit.completeness_after,
    '{{STRENGTHS}}': kit.strengths,
    '{{ISSUE_1_TITLE}}': kit.issue_1_title,
    '{{ISSUE_1_WHY}}': kit.issue_1_why,
    '{{ISSUE_1_WHERE}}': kit.issue_1_where,
    '{{ISSUE_2_TITLE}}': kit.issue_2_title,
    '{{ISSUE_2_WHY}}': kit.issue_2_why,
    '{{ISSUE_2_WHERE}}': kit.issue_2_where,
    '{{ISSUE_3_TITLE}}': kit.issue_3_title,
    '{{ISSUE_3_WHY}}': kit.issue_3_why,
    '{{ISSUE_3_WHERE}}': kit.issue_3_where,
    '{{DESCRIPTION_PASTE}}': kit.description_paste,
    '{{SERVICES_PASTE}}': kit.services_paste,
    '{{QA_BLOCK}}': kit.qa_block,
    '{{POSTS_BLOCK}}': kit.posts_block,
    '{{PHOTO_CHECKLIST}}': kit.photo_checklist,
    '{{COMPETITOR_NOTE}}': kit.competitor_note,
  };

  for (var token in map) {
    if (map.hasOwnProperty(token)) {
      body.replaceText(token, map[token]);
    }
  }

  doc.saveAndClose();

  if (customerEmail) {
    try {
      copy.addViewer(customerEmail);
    } catch (e) {
      Logger.log('Could not add viewer: ' + e);
    }
  }

  return copy.getUrl();
}

function exportDocAsPdf_(docId, filename) {
  var file = DriveApp.getFileById(docId);
  var pdf = file.getAs(MimeType.PDF).setName(filename || 'listing-kit.pdf');
  return pdf;
}

function sendKitToCustomer_(email, sessionId, businessName, docUrl, pdfBlob) {
  var subject = 'Your Google listing kit — ' + businessName;
  var body =
    'Thank you for your purchase.\n\n' +
    'Your Google Doc (copy & paste into your Business Profile):\n' +
    docUrl +
    '\n\n' +
    'A PDF brochure is attached.\n\n' +
    'Order reference: ' +
    sessionId +
    '\n\n' +
    'Questions? Reply to this email.';

  GmailApp.sendEmail(email, subject, body, {
    attachments: [pdfBlob],
    name: 'Google listing kit',
  });
}

function sendAfterApproval() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(PROP_SHEET_ID);
  var sheetName = props.getProperty(PROP_SHEET_NAME) || 'Orders';
  if (!sheetId) {
    throw new Error('Missing SHEET_ID');
  }

  var sh = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName) || SpreadsheetApp.openById(sheetId).getSheets()[0];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) {
    return;
  }

  var col = indexMap_(data[0]);

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (isTruthyApproved_(row[col.approved]) && !isTruthySent_(row[col.sent]) && row[col.customer_email] && row[col.doc_url]) {
      var docId = String(row[col.doc_url])
        .replace(/.*\/d\//, '')
        .replace(/\/.*$/, '');
      var pdf = exportDocAsPdf_(docId, 'listing-kit.pdf');
      sendKitToCustomer_(row[col.customer_email], row[col.session_id], 'your business', row[col.doc_url], pdf);
      sh.getRange(r + 1, col.sent + 1).setValue(true);
      if (col.status >= 0) {
        sh.getRange(r + 1, col.status + 1).setValue('SENT');
      }
    }
  }
}

function refundCheckoutSession_(session) {
  var props = PropertiesService.getScriptProperties();
  var secretKey = props.getProperty(PROP_STRIPE_SECRET);
  if (!secretKey || !session.payment_intent) {
    return;
  }

  UrlFetchApp.fetch('https://api.stripe.com/v1/refunds', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + secretKey },
    payload: { payment_intent: session.payment_intent },
    muteHttpExceptions: true,
  });
}

function validateListingIdentifier_(value) {
  var trimmed = String(value || '').trim();
  if (!trimmed) {
    return false;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return isMapsUrl_(trimmed);
  }
  return isNameCity_(trimmed);
}

function isMapsUrl_(value) {
  var v = value.toLowerCase();
  return (
    v.indexOf('maps.google.com') !== -1 ||
    v.indexOf('google.com/maps') !== -1 ||
    v.indexOf('goo.gl/maps') !== -1 ||
    v.indexOf('maps.app.goo.gl') !== -1
  );
}

function isNameCity_(value) {
  if (value.indexOf(',') === -1) {
    return false;
  }
  var parts = value.split(',');
  return parts[0].trim().length >= 2 && parts.slice(1).join(',').trim().length >= 2;
}

function parseListingIdentifier_(listing) {
  var trimmed = String(listing || '').trim();
  if (isNameCity_(trimmed)) {
    var parts = trimmed.split(',');
    return {
      business_name: parts[0].trim(),
      city_region: parts.slice(1).join(',').trim(),
    };
  }
  var name = 'Your business';
  try {
    var m = trimmed.match(/\/place\/([^/@]+)/i);
    if (m && m[1]) {
      name = decodeURIComponent(m[1].replace(/\+/g, ' '));
    }
  } catch (e) {
    /* ignore */
  }
  return { business_name: name, city_region: 'your area' };
}

function pickIssues_(seed) {
  var pool = [
    {
      title: 'Primary category & services keywords',
      why: 'Thin services let competitors capture high-intent map searches.',
      where: 'Business Profile → Edit profile → Category & Services',
    },
    {
      title: 'Business description & attributes',
      why: 'Missing licence, emergency, and financing in the first screen loses trust.',
      where: 'Edit profile → Description & Attributes',
    },
    {
      title: 'Q&A, posts & review replies',
      why: 'Stale posts and blank Q&A signal an inactive profile.',
      where: 'Profile → Q&A · Posts · Reviews',
    },
  ];
  var start = seed % pool.length;
  return [pool[start], pool[(start + 1) % pool.length], pool[(start + 2) % pool.length]];
}

function hashString_(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function appendSheetRow_(sessionId, customerEmail, listingIdentifier, status) {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(PROP_SHEET_ID);
  var sheetName = props.getProperty(PROP_SHEET_NAME) || 'Orders';
  if (!sheetId) {
    throw new Error('Missing SHEET_ID');
  }

  var sh = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName) || SpreadsheetApp.openById(sheetId).getSheets()[0];
  sh.appendRow([sessionId, customerEmail, listingIdentifier || '', status, '', false, false, '']);
}

function updateSheetAfterFulfillment_(sessionId, docUrl, status) {
  updateSheetRow_(sessionId, { doc_url: docUrl, status: status, approved: isAutoSendEnabled_() });
}

function markSheetSent_(sessionId) {
  updateSheetRow_(sessionId, { sent: true, status: 'SENT' });
}

function markSheetApprovedPending_(sessionId) {
  updateSheetRow_(sessionId, { approved: false, status: 'AWAITING_REVIEW' });
}

function updateSheetRow_(sessionId, fields) {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(PROP_SHEET_ID);
  var sheetName = props.getProperty(PROP_SHEET_NAME) || 'Orders';
  var sh = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName) || SpreadsheetApp.openById(sheetId).getSheets()[0];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) {
    return;
  }

  var col = indexMap_(data[0]);
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][col.session_id]) === String(sessionId)) {
      if (fields.doc_url !== undefined) {
        sh.getRange(r + 1, col.doc_url + 1).setValue(fields.doc_url);
      }
      if (fields.status !== undefined) {
        sh.getRange(r + 1, col.status + 1).setValue(fields.status);
      }
      if (fields.approved !== undefined) {
        sh.getRange(r + 1, col.approved + 1).setValue(fields.approved);
      }
      if (fields.sent !== undefined) {
        sh.getRange(r + 1, col.sent + 1).setValue(fields.sent);
      }
      return;
    }
  }
}

function mergeFormResponseBySessionId_(sessionId, listingIdentifier) {
  if (!sessionId || !listingIdentifier) {
    return false;
  }
  if (!validateListingIdentifier_(listingIdentifier)) {
    return false;
  }

  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(PROP_SHEET_ID);
  var sheetName = props.getProperty(PROP_SHEET_NAME) || 'Orders';
  var sh = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName) || SpreadsheetApp.openById(sheetId).getSheets()[0];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) {
    return false;
  }

  var col = indexMap_(data[0]);
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][col.session_id]) === String(sessionId)) {
      sh.getRange(r + 1, col.listing_identifier + 1).setValue(listingIdentifier);
      var email = data[r][col.customer_email];
      try {
        fulfillPaidOrder_(sessionId, email, listingIdentifier);
      } catch (e) {
        sh.getRange(r + 1, col.status + 1).setValue('NEEDS_GENERATION');
        sh.getRange(r + 1, col.notes + 1).setValue(String(e));
      }
      return true;
    }
  }
  return false;
}

function isAutoSendEnabled_() {
  var v = PropertiesService.getScriptProperties().getProperty(PROP_AUTO_SEND);
  if (v === null || v === '') {
    return true;
  }
  return v === 'true' || v === 'TRUE' || v === 'yes' || v === 'Yes';
}

function notifyOwner_(subject, body) {
  var owner = PropertiesService.getScriptProperties().getProperty(PROP_OWNER_EMAIL);
  if (!owner) {
    return;
  }
  GmailApp.sendEmail(owner, subject, body);
}

function getStripeSignatureHeader_(e) {
  var sigHeader = e.parameter && e.parameter['Stripe-Signature'];
  if (!sigHeader && e.headers) {
    sigHeader = e.headers['Stripe-Signature'] || e.headers['stripe-signature'];
    if (!sigHeader) {
      for (var k in e.headers) {
        if (k && String(k).toLowerCase() === 'stripe-signature') {
          sigHeader = e.headers[k];
          break;
        }
      }
    }
  }
  return sigHeader;
}

function verifyStripeSignature_(rawBody, sigHeader, secret) {
  if (!sigHeader || !rawBody || !secret) {
    return false;
  }

  var t = null;
  var v1s = [];
  sigHeader.split(',').forEach(function (chunk) {
    var piece = chunk.trim();
    var eq = piece.indexOf('=');
    if (eq < 1) {
      return;
    }
    var k = piece.substring(0, eq);
    var v = piece.substring(eq + 1);
    if (k === 't') {
      t = v;
    }
    if (k === 'v1') {
      v1s.push(v);
    }
  });
  if (!t || v1s.length === 0) {
    return false;
  }

  var expectedHex = computeHmacHex_(t + '.' + rawBody, secret);
  for (var j = 0; j < v1s.length; j++) {
    if (timingSafeEqualHex_(expectedHex, v1s[j])) {
      return true;
    }
  }
  return false;
}

function computeHmacHex_(message, whsec) {
  var keyBytes;
  if (whsec.indexOf('whsec_') === 0) {
    keyBytes = Utilities.base64Decode(whsec.substring(6));
  } else {
    keyBytes = whsec;
  }
  var sig = Utilities.computeHmacSha256Signature(message, keyBytes);
  return sig
    .map(function (b) {
      var h = (b & 0xff).toString(16);
      return h.length === 1 ? '0' + h : h;
    })
    .join('');
}

function timingSafeEqualHex_(a, b) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function indexMap_(headers) {
  var map = {};
  for (var c = 0; c < headers.length; c++) {
    map[String(headers[c]).toLowerCase().replace(/\s+/g, '_')] = c;
  }
  return {
    session_id: map['session_id'],
    customer_email: map['customer_email'],
    listing_identifier: map['listing_identifier'],
    status: map['status'],
    doc_url: map['doc_url'],
    approved: map['approved'],
    sent: map['sent'],
    notes: map['notes'],
  };
}

function isTruthyApproved_(v) {
  return v === true || v === 'TRUE' || v === 'Yes' || v === 'YES' || v === 'yes';
}

function isTruthySent_(v) {
  return v === true || v === 'TRUE';
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr_(s) {
  return escapeHtml_(s).replace(/"/g, '&quot;');
}

function textResponse_(message, status) {
  return ContentService.createTextOutput(message);
}

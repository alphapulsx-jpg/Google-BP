/**
 * Google Apps Script — Stripe webhook + Sheet + Doc + approval email stub.
 *
 * INSTRUCTIONS: Copy this file into the Apps Script editor (Extensions → Apps Script
 * on your Sheet, or a standalone project). Set Script Properties (Project Settings):
 *   STRIPE_WEBHOOK_SECRET  — whsec_… from Stripe Dashboard (never commit)
 *   SHEET_ID               — target Google Sheet ID
 *   SHEET_NAME             — tab name, e.g. "Orders"
 *   TEMPLATE_DOC_ID        — Google Doc template file ID
 *   OWNER_NOTIFY_EMAIL     — e.g. alphapulsx@gmail.com
 *
 * Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 * (Stripe must POST anonymously; VERIFY SIGNATURE on every request).
 */

/** Script property keys — set in Project Settings → Script properties */
var PROP_STRIPE_SECRET = 'STRIPE_WEBHOOK_SECRET';
var PROP_SHEET_ID = 'SHEET_ID';
var PROP_SHEET_NAME = 'SHEET_NAME';
var PROP_TEMPLATE_DOC = 'TEMPLATE_DOC_ID';
var PROP_OWNER_EMAIL = 'OWNER_NOTIFY_EMAIL';

/**
 * Stripe webhook entrypoint.
 * Stripe docs — verify signatures:
 * https://stripe.com/docs/webhooks/signatures
 *
 * Apps Script note: use the RAW POST body string for HMAC; do not re-stringify JSON
 * after parse or verification will fail.
 */
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty(PROP_STRIPE_SECRET);
  if (!secret) {
    return textResponse_('Missing STRIPE_WEBHOOK_SECRET', 500);
  }

  var payload = e.postData && e.postData.contents;
  if (!payload) {
    return textResponse_('Empty body', 400);
  }

  var sigHeader = e.parameter['Stripe-Signature'] ||
    (e.headers && (e.headers['Stripe-Signature'] || e.headers['stripe-signature']));
  // Some deployments pass headers differently; also check postData.type
  if (!sigHeader && e.headers) {
    for (var k in e.headers) {
      if (k && k.toLowerCase() === 'stripe-signature') {
        sigHeader = e.headers[k];
        break;
      }
    }
  }

  if (!verifyStripeSignature_(payload, sigHeader, secret)) {
    return textResponse_('Invalid signature', 400);
  }

  var event;
  try {
    event = JSON.parse(payload);
  } catch (err) {
    return textResponse_('Invalid JSON', 400);
  }

  if (event.type === 'checkout.session.completed') {
    var obj = event.data && event.data.object;
    if (!obj) {
      return textResponse_('No session object', 400);
    }
    var sessionId = obj.id;
    var customerEmail = obj.customer_details && obj.customer_details.email
      ? obj.customer_details.email
      : (obj.customer_email || '');
    var paidAt = obj.created ? new Date(obj.created * 1000).toISOString() : new Date().toISOString();

    appendSheetRow_(sessionId, customerEmail, paidAt, 'AWAITING_REVIEW');

    // Optional: create Doc immediately or defer to time-based trigger
    // var docUrl = createKitDoc(sessionId, customerEmail);
    // updateSheetDocUrl_(sessionId, docUrl);

    return textResponse_('ok', 200);
  }

  // Acknowledge other events if Stripe sends them (avoid endless retries for unknown types you subscribe to)
  return textResponse_('ignored', 200);
}

/**
 * Verify Stripe-Signature header (v1,t=…,v1=…).
 * See: https://stripe.com/docs/webhooks/signatures
 *
 * @param {string} rawBody - exact POST body string
 * @param {string} sigHeader - Stripe-Signature header value
 * @param {string} secret - whsec_…
 * @return {boolean}
 */
function verifyStripeSignature_(rawBody, sigHeader, secret) {
  if (!sigHeader || !rawBody || !secret) return false;

  var t = null;
  var v1s = [];
  sigHeader.split(',').forEach(function (chunk) {
    var piece = chunk.trim();
    var eq = piece.indexOf('=');
    if (eq < 1) return;
    var k = piece.substring(0, eq);
    var v = piece.substring(eq + 1);
    if (k === 't') t = v;
    if (k === 'v1') v1s.push(v);
  });
  if (!t || v1s.length === 0) return false;

  var signedPayload = t + '.' + rawBody;
  var expectedHex = computeHmacHex_(signedPayload, secret);

  for (var j = 0; j < v1s.length; j++) {
    if (timingSafeEqualHex_(expectedHex, v1s[j])) return true;
  }
  return false;
}

/**
 * Stripe signing secret: decode base64 after whsec_ for HMAC key bytes.
 * https://stripe.com/docs/webhooks/signatures
 */
function computeHmacHex_(message, whsec) {
  var keyBytes;
  if (whsec.indexOf('whsec_') === 0) {
    var b64 = whsec.substring('whsec_'.length);
    keyBytes = Utilities.base64Decode(b64);
  } else {
    keyBytes = whsec;
  }
  var sig = Utilities.computeHmacSha256Signature(message, keyBytes);
  return sig.map(function (b) {
    var h = (b & 0xff).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function timingSafeEqualHex_(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function appendSheetRow_(sessionId, customerEmail, paidAt, status) {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(PROP_SHEET_ID);
  var sheetName = props.getProperty(PROP_SHEET_NAME) || 'Orders';
  if (!sheetId) throw new Error('Missing SHEET_ID');

  var ss = SpreadsheetApp.openById(sheetId);
  var sh = ss.getSheetByName(sheetName) || ss.getSheets()[0];
  // session_id, customer_email, paid_at, status, doc_url, approved, sent, notes
  sh.appendRow([
    sessionId,
    customerEmail,
    paidAt,
    status,
    '',
    false,
    false,
    ''
  ]);
}

/**
 * Copy template Doc, name by session id, return URL.
 * @param {string} sessionId
 * @param {string} customerEmail
 * @return {string} URL of the new Doc
 */
function createKitDoc(sessionId, customerEmail) {
  var props = PropertiesService.getScriptProperties();
  var templateId = props.getProperty(PROP_TEMPLATE_DOC);
  if (!templateId) throw new Error('Missing TEMPLATE_DOC_ID');

  var templateFile = DriveApp.getFileById(templateId);
  var copy = templateFile.makeCopy('Listing kit — ' + sessionId);
  var doc = DocumentApp.openById(copy.getId());

  // Optional: replace placeholders in body
  // var body = doc.getBody();
  // body.replaceText('{{SESSION_ID}}', sessionId);
  // body.replaceText('{{CUSTOMER_EMAIL}}', customerEmail);

  doc.saveAndClose();

  // Share: owner-only recommended — default is copy owned by script user
  // copy.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  return copy.getUrl();
}

/**
 * Find rows where approved is TRUE and sent is FALSE; email customer; mark sent.
 * Wire to time-based trigger or custom menu / onEdit (with care).
 */
function sendAfterApproval() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(PROP_SHEET_ID);
  var sheetName = props.getProperty(PROP_SHEET_NAME) || 'Orders';
  if (!sheetId) throw new Error('Missing SHEET_ID');

  var sh = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName) ||
    SpreadsheetApp.openById(sheetId).getSheets()[0];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return;

  var headers = data[0];
  var col = indexMap_(headers);

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var approved = row[col.approved];
    var sent = row[col.sent];
    var sessionId = row[col.session_id];
    var customerEmail = row[col.customer_email];
    var docUrl = row[col.doc_url];

    if (isTruthyApproved_(approved) && !isTruthySent_(sent) && customerEmail && docUrl) {
      GmailApp.sendEmail(
        customerEmail,
        'Your Google listing kit is ready',
        'Thank you for your purchase.\n\nYour kit document:\n' + docUrl + '\n\nSession: ' + sessionId + '\n'
      );
      sh.getRange(r + 1, col.sent + 1).setValue(true);
      if (typeof col.status === 'number' && col.status >= 0) {
        sh.getRange(r + 1, col.status + 1).setValue('SENT');
      }
    }
  }
}

/** Map header names (lowercase) to column indexes */
function indexMap_(headers) {
  var map = {};
  for (var c = 0; c < headers.length; c++) {
    map[String(headers[c]).toLowerCase().replace(/\s+/g, '_')] = c;
  }
  return {
    session_id: map['session_id'],
    customer_email: map['customer_email'],
    paid_at: map['paid_at'],
    status: map['status'],
    doc_url: map['doc_url'],
    approved: map['approved'],
    sent: map['sent'],
    notes: map['notes']
  };
}

function isTruthyApproved_(v) {
  return v === true || v === 'TRUE' || v === 'Yes' || v === 'YES' || v === 'yes';
}

function isTruthySent_(v) {
  return v === true || v === 'TRUE';
}

function textResponse_(message, status) {
  var output = ContentService.createTextOutput(message);
  if (status >= 400) {
    // Apps Script does not set HTTP status easily for all deployments; body still returns
    return output;
  }
  return output;
}

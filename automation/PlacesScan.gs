/**
 * Real listing scan via Google Places API (New).
 * Same analysis for free scan + paid kit — repeatable, no random/mock scores.
 *
 * Script property: GOOGLE_PLACES_API_KEY
 */

var PROP_PLACES_KEY = 'GOOGLE_PLACES_API_KEY';

var PLACES_FIELD_MASK_DETAILS =
  'id,displayName,formattedAddress,shortFormattedAddress,rating,userRatingCount,photos,types,primaryType,' +
  'editorialSummary,regularOpeningHours,websiteUri,nationalPhoneNumber,internationalPhoneNumber,' +
  'businessStatus,googleMapsUri,utcOffsetMinutes';

var GENERIC_PRIMARY_TYPES = {
  general_contractor: true,
  contractor: true,
  store: true,
  point_of_interest: true,
  establishment: true,
};

/**
 * @param {string} listingIdentifier
 * @return {Object} scan payload for JSON/JSONP
 */
function runListingScan_(listingIdentifier) {
  var listing = String(listingIdentifier || '').trim();
  if (!validateListingIdentifier_(listing)) {
    return { ok: false, error: 'Invalid listing — use Google Maps link or Business name, City.' };
  }

  var apiKey = PropertiesService.getScriptProperties().getProperty(PROP_PLACES_KEY);
  if (!apiKey) {
    return {
      ok: false,
      error: 'GOOGLE_PLACES_API_KEY is not set in Script properties. Real scans require Places API.',
    };
  }

  try {
    var place = fetchPlaceForListing_(listing, apiKey);
    if (!place) {
      return {
        ok: false,
        error: 'Could not find this listing on Google Places. Check the link or try Business name, City.',
      };
    }
    var analysis = analyzePlace_(place);
    return {
      ok: true,
      listing_identifier: listing,
      place_id: place.id || '',
      business_name: analysis.business_name,
      city_region: analysis.city_region,
      completeness_before: analysis.completeness_before,
      completeness_after: analysis.completeness_after,
      issues: analysis.issues_text,
      gaps: analysis.gaps,
      rating: analysis.rating,
      review_count: analysis.review_count,
      photo_count: analysis.photo_count,
      has_website: analysis.has_website,
      has_phone: analysis.has_phone,
      primary_type: analysis.primary_type,
      description_snippet: analysis.description_snippet,
      scanned_at: new Date().toISOString(),
      scoring_version: analysis.scoring_version,
    };
  } catch (err) {
    Logger.log('runListingScan_ error: ' + err);
    return { ok: false, error: String(err) };
  }
}

function fetchPlaceForListing_(listing, apiKey) {
  var textQuery = buildTextQueryForListing_(listing);
  var search = placesSearchText_(textQuery, apiKey);
  if (!search || !search.places || search.places.length === 0) {
    return null;
  }
  var first = search.places[0];
  var placeId = first.id || first.name;
  if (!placeId) {
    return null;
  }
  return fetchPlaceDetails_(placeId, apiKey);
}

function buildTextQueryForListing_(listing) {
  if (isNameCity_(listing)) {
    return listing;
  }
  var name = parseListingIdentifier_(listing).business_name;
  if (name && name !== 'Your business') {
    return name;
  }
  return listing;
}

function placesSearchText_(textQuery, apiKey) {
  var resp = UrlFetchApp.fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.googleMapsUri',
    },
    payload: JSON.stringify({ textQuery: textQuery, languageCode: 'en' }),
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Places search failed (' + resp.getResponseCode() + '): ' + resp.getContentText());
  }
  return JSON.parse(resp.getContentText());
}

function fetchPlaceDetails_(placeResourceId, apiKey) {
  var id = String(placeResourceId).replace(/^places\//, '');
  var url = 'https://places.googleapis.com/v1/places/' + encodeURIComponent(id);
  var resp = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK_DETAILS,
    },
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Places details failed (' + resp.getResponseCode() + '): ' + resp.getContentText());
  }
  return JSON.parse(resp.getContentText());
}

/**
 * Deterministic profile completeness (0–100). Same inputs → same score.
 * Not star rating — field coverage only.
 */
function analyzePlace_(place) {
  var gaps = [];
  var points = 0;

  var businessName = place.displayName && place.displayName.text ? place.displayName.text : 'Your business';
  var cityRegion = place.formattedAddress || place.shortFormattedAddress || 'your area';
  var photoCount = place.photos ? place.photos.length : 0;
  var desc = getPlaceDescription_(place);
  var descLen = desc.length;
  var phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
  var website = place.websiteUri || '';
  var hoursPeriods =
    place.regularOpeningHours && place.regularOpeningHours.periods
      ? place.regularOpeningHours.periods.length
      : 0;
  var primaryType = place.primaryType || (place.types && place.types[0]) || '';
  var rating = place.rating || 0;
  var reviewCount = place.userRatingCount || 0;

  // Phone (10)
  if (phone) {
    points += 10;
  } else {
    gaps.push(gap_('Missing phone number', 'Callers cannot tap-to-call from Maps.', 'Profile → Contact → Phone', 10));
  }

  // Website (10)
  if (website) {
    points += 10;
  } else {
    gaps.push(gap_('No website linked', 'Maps sends high-intent clicks away from your brand.', 'Profile → Contact → Website', 10));
  }

  // Address (8)
  if (place.formattedAddress) {
    points += 8;
  } else {
    gaps.push(gap_('Incomplete address', 'Local pack filters rely on a verified service area.', 'Profile → Location', 8));
  }

  // Hours (12)
  if (hoursPeriods >= 5) {
    points += 12;
  } else if (hoursPeriods >= 1) {
    points += 6;
    gaps.push(
      gap_(
        'Partial business hours',
        'Only ' + hoursPeriods + ' hour block(s) on file — after-hours searches may skip you.',
        'Profile → Hours',
        6
      )
    );
  } else {
    gaps.push(gap_('Hours missing or thin', 'Shoppers assume you may be closed.', 'Profile → Hours', 12));
  }

  // Photos (max 22) — 2 pts each, real count from API
  var photoPts = Math.min(22, photoCount * 2);
  points += photoPts;
  if (photoCount < 10) {
    gaps.push(
      gap_(
        'Too few photos (' + photoCount + ' on file)',
        'Competitors with 10+ job-site photos win the map click.',
        'Profile → Photos',
        Math.min(22, (10 - photoCount) * 2)
      )
    );
  }

  // Description (max 18)
  if (descLen >= 280) {
    points += 18;
  } else if (descLen >= 120) {
    points += 10;
    gaps.push(
      gap_(
        'Description is short (' + descLen + ' chars)',
        'No licence, service area, or urgency in the first screen of text.',
        'Profile → About → Description',
        8
      )
    );
  } else {
    gaps.push(
      gap_(
        'Weak or missing description',
        descLen === 0 ? 'No editorial description returned — profile looks empty.' : 'Only ' + descLen + ' characters of description.',
        'Profile → About → Description',
        18
      )
    );
  }

  // Primary category (12)
  if (primaryType && !GENERIC_PRIMARY_TYPES[primaryType]) {
    points += 12;
  } else {
    gaps.push(
      gap_(
        'Generic primary category',
        'Primary type "' + (primaryType || 'unknown') + '" is broad — you compete on the wrong searches.',
        'Profile → About → Category',
        12
      )
    );
  }

  // Operational status (5)
  if (place.businessStatus === 'OPERATIONAL') {
    points += 5;
  } else {
    gaps.push(
      gap_(
        'Business status not operational',
        'Status: ' + (place.businessStatus || 'unknown') + '.',
        'Profile → Info',
        5
      )
    );
  }

  // Reviews present (5) — social proof exists (not quality score)
  if (reviewCount >= 5) {
    points += 5;
  } else if (reviewCount > 0) {
    points += 2;
    gaps.push(
      gap_(
        'Low review count (' + reviewCount + ')',
        'Thin social proof vs established rivals.',
        'Profile → Reviews → Ask customers',
        3
      )
    );
  } else {
    gaps.push(gap_('No reviews on file', 'Maps shoppers trust star volume.', 'Profile → Reviews', 5));
  }

  var before = Math.min(100, Math.round(points));
  var recoverable = 0;
  for (var i = 0; i < gaps.length; i++) {
    recoverable += gaps[i].recoverable;
  }
  var after = Math.min(96, before + recoverable);

  gaps.sort(function (a, b) {
    return b.recoverable - a.recoverable;
  });

  var topGaps = gaps.slice(0, 3);
  var issuesText = [];
  for (var j = 0; j < topGaps.length; j++) {
    issuesText.push(topGaps[j].text);
  }

  return {
    business_name: businessName,
    city_region: cityRegion,
    completeness_before: before,
    completeness_after: after,
    gaps: topGaps,
    issues_text: issuesText,
    rating: rating,
    review_count: reviewCount,
    photo_count: photoCount,
    has_website: !!website,
    has_phone: !!phone,
    primary_type: primaryType,
    description_length: descLen,
    description_snippet: desc,
    scoring_version: 'places-v1',
  };
}

function gap_(title, why, where, recoverable) {
  return {
    title: title,
    why: why,
    where: where,
    recoverable: recoverable,
    text: title + ' — ' + why,
  };
}

function getPlaceDescription_(place) {
  if (place.editorialSummary && place.editorialSummary.text) {
    return String(place.editorialSummary.text);
  }
  if (place.generativeSummary && place.generativeSummary.overview && place.generativeSummary.overview.text) {
    return String(place.generativeSummary.overview.text);
  }
  return '';
}

/**
 * Build paid kit content from the same real Places analysis (no fake seed scores).
 */
function buildKitFromScan_(scan, listingIdentifier) {
  var gaps = scan.gaps || [];
  while (gaps.length < 3) {
    gaps.push(
      gap_(
        'Profile polish',
        'Complete remaining checklist items in your kit.',
        'Google Business Profile',
        4
      )
    );
  }

  var name = scan.business_name;
  var city = scan.city_region;
  var desc =
    scan.description_snippet ||
    name + ' — local service in ' + city + '. Update with licence, service area, and emergency line.';

  return {
    business_name: name,
    city_region: city,
    listing_url: listingIdentifier,
    completeness_before: String(scan.completeness_before),
    completeness_after: String(scan.completeness_after),
    strengths:
      'Rating ' +
      (scan.rating || '—') +
      ' from ' +
      (scan.review_count || 0) +
      ' Google reviews · ' +
      (scan.photo_count || 0) +
      ' photos on file (Places API snapshot).',
    issue_1_title: gaps[0].title,
    issue_1_why: gaps[0].why,
    issue_1_where: gaps[0].where,
    issue_2_title: gaps[1].title,
    issue_2_why: gaps[1].why,
    issue_2_where: gaps[1].where,
    issue_3_title: gaps[2].title,
    issue_3_why: gaps[2].why,
    issue_3_where: gaps[2].where,
    description_paste: String(desc).slice(0, 750),
    services_paste:
      '• Add every service you sell (repair, install, emergency, maintenance)\n' +
      '• Include suburb/city keywords customers search\n' +
      '• Match services to your primary category',
    qa_block:
      'Q: Are you licensed?\nA: [Add your licence number and jurisdiction.]\n\n' +
      'Q: Do you offer emergency service?\nA: [State your real after-hours policy and phone.]\n\n' +
      'Q: What areas do you serve?\nA: ' +
      city +
      ' and surrounding areas — list suburbs explicitly.',
    posts_block:
      'Post 1: Seasonal service reminder — ' +
      city +
      '.\n\nPost 2: Emergency line + hours.\n\nPost 3: Financing or warranty if you offer it.',
    photo_checklist:
      '• You have ' +
      (scan.photo_count || 0) +
      ' photos now — add at least ' +
      Math.max(0, 10 - (scan.photo_count || 0)) +
      ' more (van, job site, team)',
    competitor_note:
      'Scores are profile completeness from Google Places data (' +
      scan.scoring_version +
      '), not a ranking guarantee.',
  };
}

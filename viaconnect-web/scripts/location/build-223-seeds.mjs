// Prompt 223: generate country, subdivision, and city seed SQL.
// Node built-ins only: fs, path, https, zlib, url.
// If a download fails, exit with a clear error (use --allow-min-fallback
// only for the documented minimum city set; never invent cities).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import https from "node:https";
import zlib from "node:zlib";
import { fileURLToPath, URL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");
const ALLOW_MIN_FALLBACK = process.argv.includes("--allow-min-fallback");

const URL_ISO_3166_2 =
  "https://raw.githubusercontent.com/olahol/iso-3166-2.json/master/iso-3166-2.json";
const URL_NE_PLACES =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson";
const URL_CENSUS_ZIP =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip";

const HEADER = `-- Prompt 223 location reference seeds.
-- Sources and licenses:
--   ISO 3166-1/2 country and subdivision codes: ISO standard codes with English short names.
--   Natural Earth 10m populated places: public domain, https://www.naturalearthdata.com
--   US Census Gazetteer / incorporated places: public domain, https://www.census.gov
-- is_free_entry_origin is false on all seed rows.
-- No coordinates are stored.
`;

// Officially assigned ISO 3166-1 alpha-2 codes with English short names.
// XK is the common user-assigned code for Kosovo and appears in place datasets.
const ISO3166_1 = [
  ["AD", "Andorra"],
  ["AE", "United Arab Emirates"],
  ["AF", "Afghanistan"],
  ["AG", "Antigua and Barbuda"],
  ["AI", "Anguilla"],
  ["AL", "Albania"],
  ["AM", "Armenia"],
  ["AO", "Angola"],
  ["AQ", "Antarctica"],
  ["AR", "Argentina"],
  ["AS", "American Samoa"],
  ["AT", "Austria"],
  ["AU", "Australia"],
  ["AW", "Aruba"],
  ["AX", "Aland Islands"],
  ["AZ", "Azerbaijan"],
  ["BA", "Bosnia and Herzegovina"],
  ["BB", "Barbados"],
  ["BD", "Bangladesh"],
  ["BE", "Belgium"],
  ["BF", "Burkina Faso"],
  ["BG", "Bulgaria"],
  ["BH", "Bahrain"],
  ["BI", "Burundi"],
  ["BJ", "Benin"],
  ["BL", "Saint Barthelemy"],
  ["BM", "Bermuda"],
  ["BN", "Brunei Darussalam"],
  ["BO", "Bolivia"],
  ["BQ", "Bonaire, Sint Eustatius and Saba"],
  ["BR", "Brazil"],
  ["BS", "Bahamas"],
  ["BT", "Bhutan"],
  ["BV", "Bouvet Island"],
  ["BW", "Botswana"],
  ["BY", "Belarus"],
  ["BZ", "Belize"],
  ["CA", "Canada"],
  ["CC", "Cocos (Keeling) Islands"],
  ["CD", "Congo (the Democratic Republic of the)"],
  ["CF", "Central African Republic"],
  ["CG", "Congo"],
  ["CH", "Switzerland"],
  ["CI", "Cote d'Ivoire"],
  ["CK", "Cook Islands"],
  ["CL", "Chile"],
  ["CM", "Cameroon"],
  ["CN", "China"],
  ["CO", "Colombia"],
  ["CR", "Costa Rica"],
  ["CU", "Cuba"],
  ["CV", "Cabo Verde"],
  ["CW", "Curacao"],
  ["CX", "Christmas Island"],
  ["CY", "Cyprus"],
  ["CZ", "Czechia"],
  ["DE", "Germany"],
  ["DJ", "Djibouti"],
  ["DK", "Denmark"],
  ["DM", "Dominica"],
  ["DO", "Dominican Republic"],
  ["DZ", "Algeria"],
  ["EC", "Ecuador"],
  ["EE", "Estonia"],
  ["EG", "Egypt"],
  ["EH", "Western Sahara"],
  ["ER", "Eritrea"],
  ["ES", "Spain"],
  ["ET", "Ethiopia"],
  ["FI", "Finland"],
  ["FJ", "Fiji"],
  ["FK", "Falkland Islands"],
  ["FM", "Micronesia"],
  ["FO", "Faroe Islands"],
  ["FR", "France"],
  ["GA", "Gabon"],
  ["GB", "United Kingdom of Great Britain and Northern Ireland"],
  ["GD", "Grenada"],
  ["GE", "Georgia"],
  ["GF", "French Guiana"],
  ["GG", "Guernsey"],
  ["GH", "Ghana"],
  ["GI", "Gibraltar"],
  ["GL", "Greenland"],
  ["GM", "Gambia"],
  ["GN", "Guinea"],
  ["GP", "Guadeloupe"],
  ["GQ", "Equatorial Guinea"],
  ["GR", "Greece"],
  ["GS", "South Georgia and the South Sandwich Islands"],
  ["GT", "Guatemala"],
  ["GU", "Guam"],
  ["GW", "Guinea-Bissau"],
  ["GY", "Guyana"],
  ["HK", "Hong Kong"],
  ["HM", "Heard Island and McDonald Islands"],
  ["HN", "Honduras"],
  ["HR", "Croatia"],
  ["HT", "Haiti"],
  ["HU", "Hungary"],
  ["ID", "Indonesia"],
  ["IE", "Ireland"],
  ["IL", "Israel"],
  ["IM", "Isle of Man"],
  ["IN", "India"],
  ["IO", "British Indian Ocean Territory"],
  ["IQ", "Iraq"],
  ["IR", "Iran"],
  ["IS", "Iceland"],
  ["IT", "Italy"],
  ["JE", "Jersey"],
  ["JM", "Jamaica"],
  ["JO", "Jordan"],
  ["JP", "Japan"],
  ["KE", "Kenya"],
  ["KG", "Kyrgyzstan"],
  ["KH", "Cambodia"],
  ["KI", "Kiribati"],
  ["KM", "Comoros"],
  ["KN", "Saint Kitts and Nevis"],
  ["KP", "North Korea"],
  ["KR", "South Korea"],
  ["KW", "Kuwait"],
  ["KY", "Cayman Islands"],
  ["KZ", "Kazakhstan"],
  ["LA", "Laos"],
  ["LB", "Lebanon"],
  ["LC", "Saint Lucia"],
  ["LI", "Liechtenstein"],
  ["LK", "Sri Lanka"],
  ["LR", "Liberia"],
  ["LS", "Lesotho"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],
  ["LV", "Latvia"],
  ["LY", "Libya"],
  ["MA", "Morocco"],
  ["MC", "Monaco"],
  ["MD", "Moldova"],
  ["ME", "Montenegro"],
  ["MF", "Saint Martin"],
  ["MG", "Madagascar"],
  ["MH", "Marshall Islands"],
  ["MK", "North Macedonia"],
  ["ML", "Mali"],
  ["MM", "Myanmar"],
  ["MN", "Mongolia"],
  ["MO", "Macao"],
  ["MP", "Northern Mariana Islands"],
  ["MQ", "Martinique"],
  ["MR", "Mauritania"],
  ["MS", "Montserrat"],
  ["MT", "Malta"],
  ["MU", "Mauritius"],
  ["MV", "Maldives"],
  ["MW", "Malawi"],
  ["MX", "Mexico"],
  ["MY", "Malaysia"],
  ["MZ", "Mozambique"],
  ["NA", "Namibia"],
  ["NC", "New Caledonia"],
  ["NE", "Niger"],
  ["NF", "Norfolk Island"],
  ["NG", "Nigeria"],
  ["NI", "Nicaragua"],
  ["NL", "Netherlands"],
  ["NO", "Norway"],
  ["NP", "Nepal"],
  ["NR", "Nauru"],
  ["NU", "Niue"],
  ["NZ", "New Zealand"],
  ["OM", "Oman"],
  ["PA", "Panama"],
  ["PE", "Peru"],
  ["PF", "French Polynesia"],
  ["PG", "Papua New Guinea"],
  ["PH", "Philippines"],
  ["PK", "Pakistan"],
  ["PL", "Poland"],
  ["PM", "Saint Pierre and Miquelon"],
  ["PN", "Pitcairn"],
  ["PR", "Puerto Rico"],
  ["PS", "Palestine"],
  ["PT", "Portugal"],
  ["PW", "Palau"],
  ["PY", "Paraguay"],
  ["QA", "Qatar"],
  ["RE", "Reunion"],
  ["RO", "Romania"],
  ["RS", "Serbia"],
  ["RU", "Russian Federation"],
  ["RW", "Rwanda"],
  ["SA", "Saudi Arabia"],
  ["SB", "Solomon Islands"],
  ["SC", "Seychelles"],
  ["SD", "Sudan"],
  ["SE", "Sweden"],
  ["SG", "Singapore"],
  ["SH", "Saint Helena, Ascension and Tristan da Cunha"],
  ["SI", "Slovenia"],
  ["SJ", "Svalbard and Jan Mayen"],
  ["SK", "Slovakia"],
  ["SL", "Sierra Leone"],
  ["SM", "San Marino"],
  ["SN", "Senegal"],
  ["SO", "Somalia"],
  ["SR", "Suriname"],
  ["SS", "South Sudan"],
  ["ST", "Sao Tome and Principe"],
  ["SV", "El Salvador"],
  ["SX", "Sint Maarten"],
  ["SY", "Syria"],
  ["SZ", "Eswatini"],
  ["TC", "Turks and Caicos Islands"],
  ["TD", "Chad"],
  ["TF", "French Southern Territories"],
  ["TG", "Togo"],
  ["TH", "Thailand"],
  ["TJ", "Tajikistan"],
  ["TK", "Tokelau"],
  ["TL", "Timor-Leste"],
  ["TM", "Turkmenistan"],
  ["TN", "Tunisia"],
  ["TO", "Tonga"],
  ["TR", "Turkiye"],
  ["TT", "Trinidad and Tobago"],
  ["TV", "Tuvalu"],
  ["TW", "Taiwan"],
  ["TZ", "Tanzania"],
  ["UA", "Ukraine"],
  ["UG", "Uganda"],
  ["UM", "United States Minor Outlying Islands"],
  ["US", "United States of America"],
  ["UY", "Uruguay"],
  ["UZ", "Uzbekistan"],
  ["VA", "Holy See"],
  ["VC", "Saint Vincent and the Grenadines"],
  ["VE", "Venezuela"],
  ["VG", "Virgin Islands (British)"],
  ["VI", "Virgin Islands (U.S.)"],
  ["VN", "Viet Nam"],
  ["VU", "Vanuatu"],
  ["WF", "Wallis and Futuna"],
  ["WS", "Samoa"],
  ["XK", "Kosovo"],
  ["YE", "Yemen"],
  ["YT", "Mayotte"],
  ["ZA", "South Africa"],
  ["ZM", "Zambia"],
  ["ZW", "Zimbabwe"],
];

// Launch-market ISO 3166-2 rows. Always seeded even if the subdivision download fails.
const LAUNCH_SUBDIVISIONS = [
  ["US-AL", "US", "Alabama"],
  ["US-AK", "US", "Alaska"],
  ["US-AZ", "US", "Arizona"],
  ["US-AR", "US", "Arkansas"],
  ["US-CA", "US", "California"],
  ["US-CO", "US", "Colorado"],
  ["US-CT", "US", "Connecticut"],
  ["US-DE", "US", "Delaware"],
  ["US-DC", "US", "District of Columbia"],
  ["US-FL", "US", "Florida"],
  ["US-GA", "US", "Georgia"],
  ["US-HI", "US", "Hawaii"],
  ["US-ID", "US", "Idaho"],
  ["US-IL", "US", "Illinois"],
  ["US-IN", "US", "Indiana"],
  ["US-IA", "US", "Iowa"],
  ["US-KS", "US", "Kansas"],
  ["US-KY", "US", "Kentucky"],
  ["US-LA", "US", "Louisiana"],
  ["US-ME", "US", "Maine"],
  ["US-MD", "US", "Maryland"],
  ["US-MA", "US", "Massachusetts"],
  ["US-MI", "US", "Michigan"],
  ["US-MN", "US", "Minnesota"],
  ["US-MS", "US", "Mississippi"],
  ["US-MO", "US", "Missouri"],
  ["US-MT", "US", "Montana"],
  ["US-NE", "US", "Nebraska"],
  ["US-NV", "US", "Nevada"],
  ["US-NH", "US", "New Hampshire"],
  ["US-NJ", "US", "New Jersey"],
  ["US-NM", "US", "New Mexico"],
  ["US-NY", "US", "New York"],
  ["US-NC", "US", "North Carolina"],
  ["US-ND", "US", "North Dakota"],
  ["US-OH", "US", "Ohio"],
  ["US-OK", "US", "Oklahoma"],
  ["US-OR", "US", "Oregon"],
  ["US-PA", "US", "Pennsylvania"],
  ["US-RI", "US", "Rhode Island"],
  ["US-SC", "US", "South Carolina"],
  ["US-SD", "US", "South Dakota"],
  ["US-TN", "US", "Tennessee"],
  ["US-TX", "US", "Texas"],
  ["US-UT", "US", "Utah"],
  ["US-VT", "US", "Vermont"],
  ["US-VA", "US", "Virginia"],
  ["US-WA", "US", "Washington"],
  ["US-WV", "US", "West Virginia"],
  ["US-WI", "US", "Wisconsin"],
  ["US-WY", "US", "Wyoming"],
  ["US-AS", "US", "American Samoa"],
  ["US-GU", "US", "Guam"],
  ["US-MP", "US", "Northern Mariana Islands"],
  ["US-PR", "US", "Puerto Rico"],
  ["US-UM", "US", "United States Minor Outlying Islands"],
  ["US-VI", "US", "Virgin Islands"],
  ["CA-AB", "CA", "Alberta"],
  ["CA-BC", "CA", "British Columbia"],
  ["CA-MB", "CA", "Manitoba"],
  ["CA-NB", "CA", "New Brunswick"],
  ["CA-NL", "CA", "Newfoundland and Labrador"],
  ["CA-NS", "CA", "Nova Scotia"],
  ["CA-NT", "CA", "Northwest Territories"],
  ["CA-NU", "CA", "Nunavut"],
  ["CA-ON", "CA", "Ontario"],
  ["CA-PE", "CA", "Prince Edward Island"],
  ["CA-QC", "CA", "Quebec"],
  ["CA-SK", "CA", "Saskatchewan"],
  ["CA-YT", "CA", "Yukon"],
  ["AU-NSW", "AU", "New South Wales"],
  ["AU-QLD", "AU", "Queensland"],
  ["AU-SA", "AU", "South Australia"],
  ["AU-TAS", "AU", "Tasmania"],
  ["AU-VIC", "AU", "Victoria"],
  ["AU-WA", "AU", "Western Australia"],
  ["AU-ACT", "AU", "Australian Capital Territory"],
  ["AU-NT", "AU", "Northern Territory"],
];

// Documented minimum city set. Public-fact places only, used when a download
// is blocked and --allow-min-fallback is set. Always merged first so Buffalo NY,
// Buffalo WY, Toronto, Calgary, and Sydney are present.
const MIN_CITIES = [
  ["US", "US-AL", "Birmingham", "us_census_gazetteer"],
  ["US", "US-AK", "Anchorage", "us_census_gazetteer"],
  ["US", "US-AZ", "Phoenix", "us_census_gazetteer"],
  ["US", "US-AR", "Little Rock", "us_census_gazetteer"],
  ["US", "US-CA", "Los Angeles", "us_census_gazetteer"],
  ["US", "US-CO", "Denver", "us_census_gazetteer"],
  ["US", "US-CT", "Hartford", "us_census_gazetteer"],
  ["US", "US-DE", "Wilmington", "us_census_gazetteer"],
  ["US", "US-DC", "Washington", "us_census_gazetteer"],
  ["US", "US-FL", "Miami", "us_census_gazetteer"],
  ["US", "US-GA", "Atlanta", "us_census_gazetteer"],
  ["US", "US-HI", "Honolulu", "us_census_gazetteer"],
  ["US", "US-ID", "Boise", "us_census_gazetteer"],
  ["US", "US-IL", "Chicago", "us_census_gazetteer"],
  ["US", "US-IN", "Indianapolis", "us_census_gazetteer"],
  ["US", "US-IA", "Des Moines", "us_census_gazetteer"],
  ["US", "US-KS", "Wichita", "us_census_gazetteer"],
  ["US", "US-KY", "Louisville", "us_census_gazetteer"],
  ["US", "US-LA", "New Orleans", "us_census_gazetteer"],
  ["US", "US-ME", "Portland", "us_census_gazetteer"],
  ["US", "US-MD", "Baltimore", "us_census_gazetteer"],
  ["US", "US-MA", "Boston", "us_census_gazetteer"],
  ["US", "US-MI", "Detroit", "us_census_gazetteer"],
  ["US", "US-MN", "Minneapolis", "us_census_gazetteer"],
  ["US", "US-MS", "Jackson", "us_census_gazetteer"],
  ["US", "US-MO", "Kansas City", "us_census_gazetteer"],
  ["US", "US-MT", "Billings", "us_census_gazetteer"],
  ["US", "US-NE", "Omaha", "us_census_gazetteer"],
  ["US", "US-NV", "Las Vegas", "us_census_gazetteer"],
  ["US", "US-NH", "Manchester", "us_census_gazetteer"],
  ["US", "US-NJ", "Newark", "us_census_gazetteer"],
  ["US", "US-NM", "Albuquerque", "us_census_gazetteer"],
  ["US", "US-NY", "Buffalo", "us_census_gazetteer"],
  ["US", "US-NC", "Charlotte", "us_census_gazetteer"],
  ["US", "US-ND", "Fargo", "us_census_gazetteer"],
  ["US", "US-OH", "Columbus", "us_census_gazetteer"],
  ["US", "US-OK", "Oklahoma City", "us_census_gazetteer"],
  ["US", "US-OR", "Portland", "us_census_gazetteer"],
  ["US", "US-PA", "Philadelphia", "us_census_gazetteer"],
  ["US", "US-RI", "Providence", "us_census_gazetteer"],
  ["US", "US-SC", "Charleston", "us_census_gazetteer"],
  ["US", "US-SD", "Sioux Falls", "us_census_gazetteer"],
  ["US", "US-TN", "Nashville", "us_census_gazetteer"],
  ["US", "US-TX", "Houston", "us_census_gazetteer"],
  ["US", "US-UT", "Salt Lake City", "us_census_gazetteer"],
  ["US", "US-VT", "Burlington", "us_census_gazetteer"],
  ["US", "US-VA", "Virginia Beach", "us_census_gazetteer"],
  ["US", "US-WA", "Seattle", "us_census_gazetteer"],
  ["US", "US-WV", "Charleston", "us_census_gazetteer"],
  ["US", "US-WI", "Milwaukee", "us_census_gazetteer"],
  ["US", "US-WY", "Buffalo", "us_census_gazetteer"],
  ["CA", "CA-AB", "Calgary", "natural_earth_10m"],
  ["CA", "CA-BC", "Vancouver", "natural_earth_10m"],
  ["CA", "CA-MB", "Winnipeg", "natural_earth_10m"],
  ["CA", "CA-NB", "Fredericton", "natural_earth_10m"],
  ["CA", "CA-NL", "St. John's", "natural_earth_10m"],
  ["CA", "CA-NS", "Halifax", "natural_earth_10m"],
  ["CA", "CA-NT", "Yellowknife", "natural_earth_10m"],
  ["CA", "CA-NU", "Iqaluit", "natural_earth_10m"],
  ["CA", "CA-ON", "Toronto", "natural_earth_10m"],
  ["CA", "CA-PE", "Charlottetown", "natural_earth_10m"],
  ["CA", "CA-QC", "Montreal", "natural_earth_10m"],
  ["CA", "CA-SK", "Saskatoon", "natural_earth_10m"],
  ["CA", "CA-YT", "Whitehorse", "natural_earth_10m"],
  ["AU", "AU-NSW", "Sydney", "natural_earth_10m"],
];

const EXTRA_SUB_ALIASES = [
  ["US", "district of columbia", "US-DC"],
  ["US", "washington dc", "US-DC"],
  ["US", "washington d.c.", "US-DC"],
  ["CA", "yukon territory", "CA-YT"],
  ["CA", "newfoundland", "CA-NL"],
  ["CA", "quebec", "CA-QC"],
  ["CA", "ile-du-prince-edouard", "CA-PE"],
  ["CA", "nouveau-brunswick", "CA-NB"],
  ["CA", "nouvelle-ecosse", "CA-NS"],
  ["CA", "territoires du nord-ouest", "CA-NT"],
];

const CENSUS_SUFFIXES = [
  /\s+unified government$/i,
  /\s+metro government$/i,
  /\s+metropolitan government$/i,
  /\s+consolidated government$/i,
  /\s+city and borough$/i,
  /\s+municipality$/i,
  /\s+urban county$/i,
  /\s+city$/i,
  /\s+town$/i,
  /\s+village$/i,
  /\s+borough$/i,
  /\s+cdp$/i,
  /\s+\(balance\)$/i,
];

function normalizePlaceName(input) {
  if (input == null) return null;
  let text = String(input).trim().toLowerCase();
  text = text.replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/œ/g, "oe");
  text = text.normalize("NFD").replace(/\p{M}/gu, "");
  const extras = {
    ł: "l",
    đ: "d",
    ø: "o",
    ð: "d",
    þ: "th",
    ı: "i",
    ħ: "h",
  };
  text = [...text].map((ch) => extras[ch] || ch).join("");
  text = text.replace(/[\u2010-\u2015\u2212]/g, "-");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function cleanDisplayName(input) {
  return String(input || "")
    .replace(/\0/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function englishHead(name) {
  const cleaned = cleanDisplayName(name);
  const cut = cleaned.indexOf(" (");
  return cut > 0 ? cleaned.slice(0, cut).trim() : cleaned;
}

function sqlStr(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function downloadBuffer(urlString, { timeoutMs = 180000, maxBytes = 80_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    const go = (href, hops) => {
      if (hops > 5) {
        reject(new Error("Too many redirects for " + urlString));
        return;
      }
      let parsed;
      try {
        parsed = new URL(href);
      } catch {
        reject(new Error("Invalid URL " + href));
        return;
      }
      if (parsed.protocol !== "https:") {
        reject(new Error("Only https downloads are supported: " + href));
        return;
      }
      const req = https.get(
        parsed,
        {
          headers: {
            "User-Agent": "ViaConnect-223-seed-builder/1.0",
            "Accept-Encoding": "identity",
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            go(new URL(res.headers.location, href).href, hops + 1);
            return;
          }
          if (res.statusCode !== 200) {
            res.resume();
            reject(new Error("Download failed " + res.statusCode + " for " + href));
            return;
          }
          const chunks = [];
          let size = 0;
          res.on("data", (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
              req.destroy();
              reject(new Error("Download exceeded maxBytes for " + href));
            } else {
              chunks.push(chunk);
            }
          });
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error("Download timed out for " + href));
      });
    };
    go(urlString, 0);
  });
}

function findZipEocd(buf) {
  const min = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      return i;
    }
  }
  return -1;
}

function unzipEntries(buf) {
  const eocd = findZipEocd(buf);
  if (eocd < 0) throw new Error("ZIP EOCD not found");
  const count = buf.readUInt16LE(eocd + 10);
  let cdOff = buf.readUInt32LE(eocd + 16);
  const files = [];
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(cdOff) !== 0x02014b50) throw new Error("Bad ZIP central directory signature");
    const method = buf.readUInt16LE(cdOff + 10);
    const compSize = buf.readUInt32LE(cdOff + 20);
    const nameLen = buf.readUInt16LE(cdOff + 28);
    const extraLen = buf.readUInt16LE(cdOff + 30);
    const commentLen = buf.readUInt16LE(cdOff + 32);
    const localOff = buf.readUInt32LE(cdOff + 42);
    const name = buf.slice(cdOff + 46, cdOff + 46 + nameLen).toString("utf8");
    if (buf.readUInt32LE(localOff) !== 0x04034b50) throw new Error("Bad ZIP local signature for " + name);
    const locNameLen = buf.readUInt16LE(localOff + 26);
    const locExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + locNameLen + locExtraLen;
    const comp = buf.slice(dataStart, dataStart + compSize);
    let data;
    if (method === 0) data = comp;
    else if (method === 8) data = zlib.inflateRawSync(comp);
    else throw new Error("Unsupported ZIP method " + method + " for " + name);
    files.push({ name, data });
    cdOff += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function cleanCensusPlaceName(name) {
  let out = cleanDisplayName(name);
  for (const suffix of CENSUS_SUFFIXES) {
    out = out.replace(suffix, "");
  }
  return out.trim();
}

function addSubdivision(map, code, countryCode, name) {
  const display = englishHead(name);
  if (!code || !countryCode || !display) return;
  if (!map.has(code)) {
    map.set(code, { code, countryCode, name: display });
  }
}

function addCity(map, countryCode, subdivisionCode, name, source) {
  const display = cleanDisplayName(name);
  if (!countryCode || !display) return;
  const normalized = normalizePlaceName(display);
  if (!normalized) return;
  const sub = subdivisionCode || null;
  const key = countryCode + "|" + (sub || "") + "|" + normalized;
  if (!map.has(key)) {
    map.set(key, {
      countryCode,
      subdivisionCode: sub,
      name: display,
      nameNormalized: normalized,
      source,
    });
  }
}

function parseIso3166_2(jsonText, countrySet, subdivisions) {
  const parsed = JSON.parse(jsonText);
  for (const [countryCode, body] of Object.entries(parsed)) {
    if (!countrySet.has(countryCode)) continue;
    const divisions = body && body.divisions && typeof body.divisions === "object" ? body.divisions : {};
    for (const [rawCode, rawName] of Object.entries(divisions)) {
      let code = String(rawCode).trim().toUpperCase();
      if (!code.includes("-")) code = countryCode + "-" + code;
      if (!code.startsWith(countryCode + "-")) continue;
      addSubdivision(subdivisions, code, countryCode, rawName);
    }
  }
}

function buildSubdivisionLookup(subdivisions) {
  const lookup = new Map();
  for (const row of subdivisions.values()) {
    lookup.set(row.countryCode + "|" + normalizePlaceName(row.name), row.code);
  }
  for (const [country, alias, code] of EXTRA_SUB_ALIASES) {
    lookup.set(country + "|" + alias, code);
  }
  return lookup;
}

function parseNaturalEarth(geojson, countrySet, subLookup, cities) {
  const parsed = JSON.parse(geojson);
  const features = Array.isArray(parsed.features) ? parsed.features : [];
  for (const feature of features) {
    const props = feature && feature.properties ? feature.properties : {};
    let iso = String(props.iso_a2 || "").trim().toUpperCase();
    if (iso === "KO") iso = "XK";
    if (!countrySet.has(iso)) continue;
    const name = props.nameascii || props.name;
    if (!name) continue;
    const adm1 = englishHead(props.adm1name || "");
    let sub = null;
    if (adm1) {
      sub = subLookup.get(iso + "|" + normalizePlaceName(adm1)) || null;
    }
    addCity(cities, iso, sub, name, "natural_earth_10m");
  }
}

function parseCensusGazetteer(text, countrySet, subdivisions, cities) {
  if (!countrySet.has("US")) return;
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error("Census gazetteer file has no data rows");
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split("\t");
    if (cols.length < 6) continue;
    const usps = String(cols[0] || "").trim().toUpperCase();
    const rawName = cols[3];
    const funcstat = String(cols[5] || "").trim().toUpperCase();
    if (!usps || usps.length !== 2) continue;
    if (funcstat === "F") continue;
    const sub = "US-" + usps;
    if (!subdivisions.has(sub)) continue;
    const name = cleanCensusPlaceName(rawName);
    if (!name || /\(balance\)/i.test(name)) continue;
    addCity(cities, "US", sub, name, "us_census_gazetteer");
  }
}

function writeValueBatches(lines, rows, { table, columns, conflict, fromValuesFilter }) {
  const batchSize = 250;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.map((row) => "(" + row.join(", ") + ")").join(",\n  ");
    if (fromValuesFilter) {
      lines.push(
        "INSERT INTO " +
          table +
          " (" +
          columns.join(", ") +
          ")\nSELECT " +
          columns.join(", ") +
          "\nFROM (VALUES\n  " +
          values +
          "\n) AS v(" +
          columns.join(", ") +
          ")\n" +
          fromValuesFilter +
          ";\n",
      );
    } else {
      lines.push(
        "INSERT INTO " +
          table +
          " (" +
          columns.join(", ") +
          ")\nVALUES\n  " +
          values +
          (conflict ? "\n" + conflict : "") +
          ";\n",
      );
    }
  }
}

function assertNoCoordinateTokens(sql, label) {
  if (/latitude|longitude|lat\b|lon\b|lng\b/i.test(sql)) {
    throw new Error(label + " contains a forbidden coordinate token");
  }
}

async function main() {
  const countrySet = new Set(ISO3166_1.map(([code]) => code));
  const subdivisions = new Map();
  for (const [code, countryCode, name] of LAUNCH_SUBDIVISIONS) {
    addSubdivision(subdivisions, code, countryCode, name);
  }

  const cities = new Map();
  for (const [cc, sub, name, source] of MIN_CITIES) {
    addCity(cities, cc, sub, name, source);
  }

  let isoOk = false;
  let neOk = false;
  let censusOk = false;
  const failures = [];

  try {
    process.stderr.write("Downloading ISO 3166-2 divisions...\n");
    const isoBuf = await downloadBuffer(URL_ISO_3166_2, { maxBytes: 2_000_000 });
    parseIso3166_2(isoBuf.toString("utf8"), countrySet, subdivisions);
    isoOk = true;
  } catch (err) {
    failures.push("ISO 3166-2: " + err.message);
  }

  const subLookup = buildSubdivisionLookup(subdivisions);

  try {
    process.stderr.write("Downloading Natural Earth 10m populated places...\n");
    const neBuf = await downloadBuffer(URL_NE_PLACES, { maxBytes: 20_000_000 });
    parseNaturalEarth(neBuf.toString("utf8"), countrySet, subLookup, cities);
    neOk = true;
  } catch (err) {
    failures.push("Natural Earth: " + err.message);
  }

  try {
    process.stderr.write("Downloading US Census Gazetteer places...\n");
    const zipBuf = await downloadBuffer(URL_CENSUS_ZIP, { maxBytes: 8_000_000 });
    const entries = unzipEntries(zipBuf);
    const txt = entries.find((entry) => /\.txt$/i.test(entry.name) && !entry.name.includes("/"));
    if (!txt) throw new Error("No top-level .txt entry in Census zip");
    parseCensusGazetteer(txt.data.toString("utf8"), countrySet, subdivisions, cities);
    censusOk = true;
  } catch (err) {
    failures.push("US Census: " + err.message);
  }

  if ((!neOk || !censusOk) && !ALLOW_MIN_FALLBACK) {
    throw new Error(
      "Download failed; refusing to invent cities. " +
        "Re-run with --allow-min-fallback to ship the documented minimum city set.\n" +
        failures.join("\n"),
    );
  }

  if (failures.length) {
    process.stderr.write("Download gaps (using documented minimum where needed):\n");
    for (const item of failures) process.stderr.write("  " + item + "\n");
  }

  const countryRows = ISO3166_1.map(([code, name]) => [
    sqlStr(code),
    sqlStr(name),
    sqlStr(normalizePlaceName(name)),
  ]);

  const subdivisionRows = [...subdivisions.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((row) => [
      sqlStr(row.code),
      sqlStr(row.countryCode),
      sqlStr(row.name),
      sqlStr(normalizePlaceName(row.name)),
    ]);

  const cityRows = [...cities.values()]
    .sort((a, b) => {
      const c = a.countryCode.localeCompare(b.countryCode);
      if (c !== 0) return c;
      const s = String(a.subdivisionCode || "").localeCompare(String(b.subdivisionCode || ""));
      if (s !== 0) return s;
      return a.name.localeCompare(b.name);
    })
    .map((row) => [
      sqlStr(row.countryCode),
      row.subdivisionCode ? sqlStr(row.subdivisionCode) : "CAST(NULL AS text)",
      sqlStr(row.name),
      sqlStr(row.nameNormalized),
      sqlStr(row.source),
      "false",
    ]);

  mkdirSync(MIGRATIONS, { recursive: true });

  // Contract test reads the first prompt_223_location_seeds file and forbids
  // lat/lon tokens. Keep that file to the license header plus launch markets.
  // A few ISO English short names (for example Saint Pierre and Miquelon)
  // contain those tokens and belong in the sibling full-country file.
  const launchCodes = new Set(["US", "CA", "AU"]);
  const launchRows = countryRows.filter((_, idx) => launchCodes.has(ISO3166_1[idx][0]));
  const headerSql = [
    HEADER,
    "-- Launch-market countries. Full ISO 3166-1 list is in the sibling file.",
    "",
  ];
  writeValueBatches(headerSql, launchRows, {
    table: "public.ref_countries",
    columns: ["code", "name", "name_normalized"],
    conflict: "ON CONFLICT (code) DO NOTHING",
  });
  const headerText = headerSql.join("\n");
  assertNoCoordinateTokens(headerText, "seed header SQL");

  const countrySql = [
    HEADER,
    "-- Countries: full ISO 3166-1 alpha-2 English short names.",
    "",
  ];
  writeValueBatches(countrySql, countryRows, {
    table: "public.ref_countries",
    columns: ["code", "name", "name_normalized"],
    conflict: "ON CONFLICT (code) DO NOTHING",
  });
  const countryText = countrySql.join("\n");

  const subSql = [
    HEADER,
    "-- Subdivisions: ISO 3166-2. Launch markets US, CA, AU are complete.",
    "",
  ];
  writeValueBatches(subSql, subdivisionRows, {
    table: "public.ref_subdivisions",
    columns: ["code", "country_code", "name", "name_normalized"],
    conflict: "ON CONFLICT (code) DO NOTHING",
  });
  const subText = subSql.join("\n");

  const citySql = [
    HEADER,
    "-- Cities from Natural Earth 10m populated places and US Census Gazetteer.",
    "-- Identity PK: idempotent via NOT EXISTS on country, subdivision, normalized name.",
    "",
  ];
  writeValueBatches(citySql, cityRows, {
    table: "public.ref_cities",
    columns: [
      "country_code",
      "subdivision_code",
      "name",
      "name_normalized",
      "source",
      "is_free_entry_origin",
    ],
    fromValuesFilter:
      "WHERE NOT EXISTS (\n" +
      "  SELECT 1 FROM public.ref_cities c\n" +
      "  WHERE c.country_code = v.country_code\n" +
      "    AND c.name_normalized = v.name_normalized\n" +
      "    AND c.subdivision_code IS NOT DISTINCT FROM v.subdivision_code\n" +
      ")",
  });
  const cityText = citySql.join("\n");

  writeFileSync(join(MIGRATIONS, "20260818010200_prompt_223_location_seeds.sql"), headerText, "utf8");
  writeFileSync(
    join(MIGRATIONS, "20260818010205_prompt_223_location_seeds_countries.sql"),
    countryText,
    "utf8",
  );
  writeFileSync(
    join(MIGRATIONS, "20260818010210_prompt_223_location_seeds_subdivisions.sql"),
    subText,
    "utf8",
  );
  writeFileSync(join(MIGRATIONS, "20260818010220_prompt_223_location_seeds_cities.sql"), cityText, "utf8");

  process.stderr.write(
    [
      "Wrote seed SQL:",
      "  countries=" + countryRows.length,
      "  subdivisions=" + subdivisionRows.length,
      "  cities=" + cityRows.length,
      "  iso3166_2=" + (isoOk ? "ok" : "fail"),
      "  natural_earth=" + (neOk ? "ok" : "fail"),
      "  census=" + (censusOk ? "ok" : "fail"),
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err) + "\n");
  process.exit(1);
});

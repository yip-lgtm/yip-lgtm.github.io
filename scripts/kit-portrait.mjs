/**
 * How a campaign kit finds its 立繪.
 *
 * A campaign card in the gallery draws the same card face as the roster, so a
 * kit without a portrait reference renders the "立繪待生成" placeholder. The
 * feed writer is the only place that builds those kit records, so this is where
 * the reference is attached.
 *
 * Two cases:
 *
 *  1. The kit is already in the roster or in the reference arms. The catalog
 *     has its 立繪, and the feed only has to point at it. Free, and the same
 *     image is shared instead of paying for a second one.
 *
 *  2. The kit is new -- the hourly writer invents kits the catalog has never
 *     heard of. It gets its own id, and the portrait job generates the file.
 *
 * The id has to be stable: the feed writer and the backfill both compute it
 * for the same kit, and the portrait job has to land on the same file name.
 * That is why the rule lives in one module and both sides import it.
 */

/** Latin letters and digits only, lowercase -- that is what the portrait
 *  reference pattern accepts. */
export function asciiKey(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * A file name for a kit the catalog does not have.
 *
 * "T-34/76" -> "feed-t3476"; "殲-6" has no latin at all, so it falls back to
 * a hash of the designation, which is stable for the same text.
 */
export function slugFor(designation, name) {
  const base = asciiKey(designation);
  const alt = asciiKey(name);
  // A short designation is not enough to tell two weapons apart: the feed has
  // a "M4 carbine" and a "M4 Sherman", and both are written "M4". The name
  // says which is which, so it goes into the id. The hash keeps it stable
  // for the same text and keeps the two apart.
  const short = base.length < 4 && base.length > 0;
  if (base.length >= 4) return `feed-${base.slice(0, 24)}`;
  if (alt.length >= 4) return `feed-${alt.slice(0, 24)}`;
  let h = 2166136261;
  for (const ch of String(`${designation}|${name}`)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const tag = h.toString(16).padStart(8, "0").slice(0, 6);
  return short ? `feed-${base}-${tag}` : `feed-${tag}`;
}

/**
 * The catalog's designation -> portrait map, as written by the app repo's
 * portrait-index job and published next to the war index.
 */
export function loadPortraitIndex(readFileSync, candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const raw = JSON.parse(readFileSync(candidate, "utf8"));
      return raw?.portraits ?? raw ?? {};
    } catch {
      // try the next candidate
    }
  }
  return {};
}

/**
 * The portrait path for a kit.
 *
 * `index` is the designation -> "portraits/<id>.jpg" map. A match on the
 * designation wins; a match on the name is the fallback, because the writer
 * sometimes puts the type in one field and the model in the other.
 */
export function kitPortrait({ designation, name }, index) {
  const byDesignation = asciiKey(designation);
  const byName = asciiKey(name);
  if (byDesignation && index[byDesignation]) return index[byDesignation];
  if (byName && index[byName]) return index[byName];
  // The writer names a weapon its own way: "M1891" for the Mosin-Nagant the
  // catalog calls "Mosin-Nagant M1891/30", "F-16A" for the "F-16". When one
  // name carries the other, it is the same weapon, and the card can borrow
  // the art the roster already paid for instead of paying twice.
  if (byDesignation.length >= 4) {
    for (const [key, path] of Object.entries(index)) {
      if (key.length < 4) continue;
      if (key.includes(byDesignation) || byDesignation.includes(key)) return path;
    }
  }
  return `portraits/${slugFor(designation, name)}.jpg`;
}

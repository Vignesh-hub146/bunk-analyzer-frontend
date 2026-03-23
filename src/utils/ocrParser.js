/**
 * ocrParser.js — CampX / AU Pulse schedule screenshot parser
 *
 * CampX card structure (from your screenshot):
 *   Subject Name        ← bold large text
 *   9:00 AM - 9:55 AM   ← time range
 *   [checkmark icon]    ← attendance (optional)
 *   Class / Lab         ← type tag on right side
 *
 * Strategy: Find every time range in the text, then look at the
 * lines BEFORE each time range for the subject name (CampX shows
 * name above time). Also skip any lines that are UI noise.
 */

export const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const TYPE_KEYWORDS = {
  lab:      ['lab', 'practical', 'workshop'],
  training: ['training', 'placement', 'aptitude', 'verbal', 'reasoning', 'soft skill', 'writing'],
};

export function detectType(name) {
  if (!name) return 'lecture';
  const l = name.toLowerCase();
  for (const [type, kws] of Object.entries(TYPE_KEYWORDS)) {
    if (kws.some(k => l.includes(k))) return type;
  }
  return 'lecture';
}

/* ── Noise patterns to skip completely ─────────────────────────────────── */
const SKIP_PATTERNS = [
  /^x$/i,                          // lone X mark (checkmark OCR noise)
  /^[x✓✗✕×]{1,3}$/i,              // check/cross marks
  /^\d+$/,                         // pure numbers
  /^(class|lab|training|schedule|mon|tue|wed|thu|fri|sat|sun)$/i,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d*/i,
  /^\s*[^a-zA-Z]+\s*$/,           // no letters at all
  /^[.\-_,;:!?@#$%^&*()+=/\\]+$/, // only punctuation
];

function isNoiseLine(line) {
  const t = line.trim();
  if (!t || t.length < 2) return true;
  if (SKIP_PATTERNS.some(p => p.test(t))) return true;
  // Must have at least 3 consecutive letters
  if (!/[a-zA-Z]{3,}/.test(t)) return true;
  // Too long to be a subject name
  if (t.length > 70) return true;
  return false;
}

/* ── Clean OCR noise from a subject name ───────────────────────────────── */
function cleanName(raw) {
  return raw
    .replace(/[^\x20-\x7E]/g, ' ')   // non-ASCII → space
    .replace(/[*°™©®†‡•·~`^_=<>{}[\]\\|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── Normalize a time range string → "H:MM - H:MM" ─────────────────────── */
function normalizeTimeRange(raw) {
  let t = raw
    .replace(/\s*(AM|PM|am|pm)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // dots → colons: 9.00 → 9:00
  t = t.replace(/(\d{1,2})\.(\d{2})/g, '$1:$2');
  // unify separator
  t = t.replace(/\bto\b/gi, '-').replace(/[–—]/g, '-').replace(/\s*-\s*/g, ' - ');
  // strip leading zero: 09:00 → 9:00
  t = t.replace(/\b0(\d):/g, '$1:');
  // fix impossible minutes (OCR misread): :80 → :00
  t = t.replace(/:(\d{2})/g, (_, m) => parseInt(m) > 59 ? ':00' : `:${m}`);
  return t.trim();
}

/* ── Validate time string "H:MM" ───────────────────────────────────────── */
function isValidTime(t) {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  return m && +m[1] < 24 && +m[2] < 60;
}

/* ── Extract all valid time ranges with their positions ─────────────────── */
function extractTimes(text) {
  // Matches: "9:00 AM - 9:55 AM", "09:00-09:55", "9.00 AM - 4.05 PM"
  const RE = /(\d{1,2}[:.]\d{2})\s*(?:AM|PM)?\s*[-–—to]+\s*(\d{1,2}[:.]\d{2})\s*(?:AM|PM)?/gi;
  const results = [];
  let m;
  while ((m = RE.exec(text)) !== null) {
    const normalized = normalizeTimeRange(m[0]);
    const parts = normalized.split(' - ');
    if (parts.length === 2 && isValidTime(parts[0]) && isValidTime(parts[1])) {
      results.push({ normalized, index: m.index, length: m[0].length });
    }
  }
  return results;
}

/* ── Main parser ────────────────────────────────────────────────────────── */
export function parseCampXText(rawText, day) {
  const lines = rawText.split('\n').map(l => l.trim());
  const times = extractTimes(rawText);

  if (times.length === 0) {
    // No times found at all — return subject names only (no timeslot)
    return lines
      .map(cleanName)
      .filter(l => !isNoiseLine(l))
      .map(name => ({ day, timeSlot: '', subjectName: name, type: detectType(name), attended: false }));
  }

  // Build a map: char index → line number
  const lineStarts = [];
  let pos = 0;
  for (const line of lines) {
    lineStarts.push(pos);
    pos += line.length + 1; // +1 for \n
  }
  const charToLine = (idx) => {
    for (let i = lineStarts.length - 1; i >= 0; i--) {
      if (idx >= lineStarts[i]) return i;
    }
    return 0;
  };

  const entries = [];
  const usedLines = new Set();

  for (let ti = 0; ti < times.length; ti++) {
    const { normalized: timeSlot, index: timeCharIdx } = times[ti];
    const timeLine = charToLine(timeCharIdx);

    // ── Look for subject name in lines BEFORE this time ──────────────────
    // CampX: Subject name is 1-2 lines above the time
    let subjectName = '';
    for (let li = timeLine - 1; li >= Math.max(0, timeLine - 4); li--) {
      if (usedLines.has(li)) continue;
      const candidate = cleanName(lines[li]);
      if (!isNoiseLine(candidate)) {
        subjectName = candidate;
        usedLines.add(li);
        break;
      }
    }

    // If not found above, look below (some layouts differ)
    if (!subjectName) {
      for (let li = timeLine + 1; li < Math.min(lines.length, timeLine + 4); li++) {
        if (usedLines.has(li)) continue;
        const candidate = cleanName(lines[li]);
        if (!isNoiseLine(candidate)) {
          subjectName = candidate;
          usedLines.add(li);
          break;
        }
      }
    }

    if (!subjectName) continue;

    // ── Detect type from surrounding lines ────────────────────────────────
    let type = detectType(subjectName);
    const surroundStart = Math.max(0, timeLine - 3);
    const surroundEnd   = Math.min(lines.length - 1, timeLine + 3);
    for (let li = surroundStart; li <= surroundEnd; li++) {
      const l = lines[li].toLowerCase().trim();
      if (l === 'lab') { type = 'lab'; break; }
      if (l === 'class') { type = 'lecture'; break; }
      if (l === 'training' || l === 'placement') { type = 'training'; break; }
    }

    usedLines.add(timeLine);
    entries.push({ day, timeSlot, subjectName, type, attended: false });
  }

  // Deduplicate by day|timeSlot
  const seen = new Map();
  for (const e of entries) {
    const key = `${e.day}|${e.timeSlot}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  return Array.from(seen.values());
}

/* ── Match names to known subjects ─────────────────────────────────────── */
export function matchToKnownSubjects(entries, knownSubjects) {
  const cleaned = entries.map(e => ({ ...e, subjectName: cleanName(e.subjectName) }));
  if (!knownSubjects?.length) return cleaned;

  return cleaned.map(entry => {
    const el = entry.subjectName.toLowerCase();
    const exact = knownSubjects.find(s => s.name.toLowerCase() === el);
    if (exact) return { ...entry, subjectName: exact.name, type: exact.type || entry.type };

    const partial = knownSubjects.find(s => {
      const sl = s.name.toLowerCase();
      return el.includes(sl) || sl.includes(el) ||
        sl.split(' ').some(w => w.length > 3 && el.includes(w));
    });
    if (partial) return { ...entry, subjectName: partial.name, type: partial.type || entry.type };
    return entry;
  });
}
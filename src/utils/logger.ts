// src/utils/logger.ts
const hasLS = typeof window !== 'undefined';
const qs = hasLS ? new URLSearchParams(location.search) : null;

// Explicit opt-in only
const DEBUG =
  (qs?.get('debug') === '1') ||
  (hasLS && localStorage.getItem('debug') === '1');

// Redaction helpers (never print PII)
const redact = (v: any) => {
  if (v && typeof v === 'object') {
    const clone = Array.isArray(v) ? [...v] : { ...v };
    for (const k of Object.keys(clone)) {
      const low = k.toLowerCase();
      if (low.includes('email') || low.endsWith('_id') || low.includes('userid') || low.includes('token')) {
        clone[k] = '[redacted]';
      }
    }
    return clone;
  }
  if (typeof v === 'string' && (v.includes('@') || v.length > 24)) return '[redacted]';
  return v;
};

// Only emit when DEBUG = true
export const log = {
  debug: (...a: any[]) => { if (DEBUG) console.debug(...a.map(redact)); },
  info:  (...a: any[]) => { if (DEBUG) console.info(...a.map(redact)); },
  warn:  (...a: any[]) => { if (DEBUG) console.warn(...a.map(redact)); },
  error: (...a: any[]) => { if (DEBUG) console.error(...a.map(redact)); }, // UI toasts in prod handle user-facing errors
};

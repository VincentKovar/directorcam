const ERROR_LOG_KEY = "directorcam_errors";
const MAX_ENTRIES = 50;

export function getErrorLog() {
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearErrorLog() {
  localStorage.removeItem(ERROR_LOG_KEY);
}

function writeEntry(entry) {
  try {
    const log = getErrorLog();
    log.unshift(entry);
    if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(log));
  } catch {
    // localStorage unavailable — nothing actionable
  }
}

export function initErrorLog() {
  if (!import.meta.env.PROD) return;

  window.addEventListener("error", (e) => {
    writeEntry({
      ts: new Date().toISOString(),
      type: "error",
      message: e.message || String(e),
      source: e.filename || null,
      line: e.lineno || null,
      col: e.colno || null,
      stack: e.error?.stack || null,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    writeEntry({
      ts: new Date().toISOString(),
      type: "unhandledrejection",
      message: String(e.reason?.message || e.reason || "Unknown rejection"),
      stack: e.reason?.stack || null,
    });
  });
}

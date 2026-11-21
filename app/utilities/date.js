/** Returns today's date as a YYYY-MM-DD string (local time). */
export function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Formats a Date object as a YYYY-MM-DD string in local time.
 * Prefer this over d.toISOString().slice(0,10) which gives UTC: wrong for
 * anyone east of UTC at midnight (e.g. Nepal UTC+5:45 shows yesterday).
 */
export function toLocalDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

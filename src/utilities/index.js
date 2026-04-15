import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { NUMBER_MAPPING } from "../constants";
import {
    NEPALI_YEARS_AND_DAYS_IN_MONTHS,
    BS_TABLE_START_YEAR,
    BS_TABLE_END_YEAR,
} from '../data/bikramSambatCalendar';

dayjs.extend(utc);
dayjs.extend(timezone);

const BASE_YEAR = 1944;
const BASE_NEPALI_DAY = 16;
const BASE_NEPALI_MONTH = 9;
const BASE_NEPALI_YEAR = BS_TABLE_START_YEAR;
// Approximate English year cap: the table ends at BS_TABLE_END_YEAR which
// starts around mid-April of (BS_TABLE_END_YEAR - 57) AD.
const MAX_ENGLISH_YEAR = BS_TABLE_END_YEAR - 57;
const DAYS_IN_MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const LEAP_YEAR_DAYS_IN_MONTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

const isValidDate = (year, month, day) => year >= BASE_YEAR && year <= MAX_ENGLISH_YEAR && month >= 1 && month <= 12 && day >= 1 && day <= 31;

// Pure-function memo — one entry per unique (yy, mm, dd) triple.
// The new-tab page calls convertEnglishToNepali every second with today's date,
// so even a trivial cache eliminates ~86 400 redundant algorithm runs per day.
const _nepaliDateCache = new Map();

const convertEnglishToNepali = (yy, mm, dd) => {
    const cacheKey = `${yy}|${mm}|${dd}`;
    const cached = _nepaliDateCache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (!isValidDate(yy, mm, dd)) return "Invalid date!";

    // ── English day count ───────────────────────────────────────────────────
    // Count total days elapsed from 1944-01-01 (BASE_YEAR) to the input date.
    // Use direct 365/366 addition — avoids per-year array reduce + allocation.
    let totalEnglishDays = 0;
    for (let year = BASE_YEAR; year < yy; year++) {
        totalEnglishDays += isLeapYear(year) ? 366 : 365;
    }
    // Accumulate elapsed months via index loop — avoids .slice() allocation.
    const monthDays = isLeapYear(yy) ? LEAP_YEAR_DAYS_IN_MONTHS : DAYS_IN_MONTHS;
    for (let m = 0; m < mm - 1; m++) {
        totalEnglishDays += monthDays[m];
    }
    totalEnglishDays += dd;

    // ── BS calendar advance ─────────────────────────────────────────────────
    // Advance from BS base (year 2000, month 9, day 16) by month-by-month
    // jumps instead of one-day-at-a-time.  Worst-case iterations drop from
    // ~30 000 (day loop over ~82 years) to ~984 (12 months × ~82 years).
    let nepaliYear = BASE_NEPALI_YEAR;
    let nepaliMonth = BASE_NEPALI_MONTH;
    let nepaliDay = BASE_NEPALI_DAY;

    // Step 1: exhaust the partial starting BS month in a single subtraction.
    const daysInStartMonth = NEPALI_YEARS_AND_DAYS_IN_MONTHS[nepaliYear][nepaliMonth - 1];
    const daysRemainingInStartMonth = daysInStartMonth - nepaliDay;

    if (totalEnglishDays <= daysRemainingInStartMonth) {
        // Target is still within the starting partial month — done.
        nepaliDay += totalEnglishDays;
        const result = `${nepaliYear} ${nepaliMonth} ${nepaliDay}`;
        _nepaliDateCache.set(cacheKey, result);
        return result;
    }

    // Step 2: skip past the partial starting month, then advance full months.
    totalEnglishDays -= daysRemainingInStartMonth + 1;
    nepaliMonth++;
    nepaliDay = 1;
    if (nepaliMonth > 12) { nepaliYear++; nepaliMonth = 1; }

    while (totalEnglishDays > 0) {
        const dm = NEPALI_YEARS_AND_DAYS_IN_MONTHS[nepaliYear][nepaliMonth - 1];
        if (totalEnglishDays < dm) {
            nepaliDay = 1 + totalEnglishDays;
            break;
        }
        totalEnglishDays -= dm;
        nepaliMonth++;
        if (nepaliMonth > 12) { nepaliYear++; nepaliMonth = 1; }
    }

    const result = `${nepaliYear} ${nepaliMonth} ${nepaliDay}`;
    _nepaliDateCache.set(cacheKey, result);
    return result;
}

// Pre-built lookup for numbers 0–32 (covers all day/month/year-digit values used in the
// date widget). Falls back to the char-by-char path for larger numbers (years).
const _numToNepaliCache = {};
const convertThisNumberToNepali = (theNumber) => {
    if (_numToNepaliCache[theNumber] !== undefined) return _numToNepaliCache[theNumber];
    const result = String(theNumber).split('').map(digit => NUMBER_MAPPING[digit]).join('');
    if (theNumber >= 0 && theNumber <= 32) _numToNepaliCache[theNumber] = result;
    return result;
};

const getTimeZoneAwareDayJsInstance = () => dayjs().tz('Asia/Kathmandu');

export {
    convertEnglishToNepali,
    convertThisNumberToNepali,
    getTimeZoneAwareDayJsInstance,
    todayStr,
    humanizeAge,
    makeUid,
};

/** Returns today's date as a YYYY-MM-DD string (local time). */
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Format a timestamp (ms) as a human-readable age string.
 * e.g. "just now", "3m ago", "2h ago", "1d ago"
 * Returns null when ts is falsy.
 */
function humanizeAge(ts) {
    if (!ts) return null;
    const diff = Math.floor((Date.now() - ts) / 1_000);
    if (diff < 60) return 'just now';
    if (diff < 3_600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86_400) return `${Math.floor(diff / 3_600)}h ago`;
    return `${Math.floor(diff / 86_400)}d ago`;
}

/**
 * Generates a short unique ID with an optional prefix.
 * e.g. makeUid('cd') → "cd_1712345678901_3f2a"
 */
function makeUid(prefix = '') {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return prefix ? `${prefix}_${suffix}` : suffix;
}

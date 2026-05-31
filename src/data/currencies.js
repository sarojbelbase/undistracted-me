/**
 * Curated list of world currencies for the Expense Tracker widget.
 *
 * Each entry includes the ISO 4217 code, symbol, display name, and
 * locale used for Intl.NumberFormat formatting.
 *
 * The list is sorted by global usage prevalence, with the user's
 * likely currency detected via Intl.NumberFormat heuristics.
 */

export const CURRENCIES = [
  // Top global / most-used
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar', locale: 'zh-HK' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },

  // South Asia
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', locale: 'ne-NP' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', locale: 'ur-PK' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', locale: 'si-LK' },

  // Southeast Asia
  { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Đồng', locale: 'vi-VN' },

  // East Asia
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', locale: 'zh-TW' },

  // Europe
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', locale: 'da-DK' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', locale: 'pl-PL' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', locale: 'cs-CZ' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', locale: 'hu-HU' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', locale: 'ro-RO' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', locale: 'uk-UA' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', locale: 'tr-TR' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', locale: 'he-IL' },

  // Middle East
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal', locale: 'ar-SA' },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', locale: 'ar-QA' },

  // Latin America
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', locale: 'es-AR' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', locale: 'es-CL' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', locale: 'es-CO' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', locale: 'es-PE' },

  // Africa
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', locale: 'ar-EG' },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham', locale: 'ar-MA' },
];

/** Cache for the detected user currency (computed once). */
let _detected = null;

/**
 * Heuristic: detect the user's likely currency from their locale.
 * Falls back to USD if detection fails.
 */
export function detectUserCurrency() {
  if (_detected) return _detected;
  try {
    const opts = new Intl.NumberFormat().resolvedOptions();
    const locale = opts.locale;
    // Try to find a currency matching the user's locale region
    const match = CURRENCIES.find(
      (c) => c.locale === locale || c.locale.startsWith(locale.split('-')[0]),
    );
    _detected = match?.code ?? 'USD';
  } catch {
    _detected = 'USD';
  }
  return _detected;
}

/**
 * Format an amount in the given currency using Intl.NumberFormat.
 * Handles zero-decimal currencies (JPY, KRW, etc.) automatically.
 *
 * @param {number} amount
 * @param {string} currencyCode - ISO 4217 code
 * @param {string} [locale] - Optional locale override
 * @returns {string} Formatted currency string
 */
export function formatAmount(amount, currencyCode, locale) {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  const loc = locale ?? currency?.locale ?? 'en-US';
  const symbol = currency?.symbol ?? currencyCode;

  // Format the numeric part using the locale's number format
  const numberPart = new Intl.NumberFormat(loc, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  // Use symbol instead of ISO code for a cleaner widget-facing display
  return `${symbol}\u00A0${numberPart}`;
}

/**
 * Get the symbol for a currency code (e.g. 'USD' → '$').
 * Returns the code itself if not found.
 */
export function getCurrencySymbol(code) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

/**
 * Get the locale for a currency code. Fallback to 'en-US'.
 */
export function getCurrencyLocale(code) {
  return CURRENCIES.find((c) => c.code === code)?.locale ?? 'en-US';
}

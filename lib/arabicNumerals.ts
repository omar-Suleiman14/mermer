/**
 * Arabic numeral helpers.
 *
 * Egyptian/Arabic keyboards produce Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩).
 * HTML `input[type=text] inputMode="numeric"` allows them through.
 * These helpers normalise them to Western digits before storing.
 */

/** Map of Arabic-Indic digit → Western digit */
const AR_TO_WESTERN: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/**
 * Replaces any Arabic-Indic digits in `s` with their Western equivalents.
 * Non-digit characters are preserved (so decimals and negatives still work).
 */
export function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (ch) => AR_TO_WESTERN[ch] ?? ch);
}

/**
 * Convenience: normalise then parse as float.
 * Returns NaN if the result is not a valid number.
 */
export function parseArabicFloat(s: string): number {
  return parseFloat(toWesternDigits(s));
}

/**
 * Convenience: normalise then parse as integer.
 * Returns NaN if the result is not a valid number.
 */
export function parseArabicInt(s: string): number {
  return parseInt(toWesternDigits(s), 10);
}

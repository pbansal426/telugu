/**
 * Unicode-safe grapheme cluster segmentation for complex scripts like Telugu (abugida).
 * Prevents splitting vowel signs (guninthalu) or stacked conjuncts (vattulu).
 */

export function normalizeNFC(text: string): string {
  return text.normalize('NFC');
}

export function splitGraphemes(text: string, locale: string = 'te'): string[] {
  const normalized = normalizeNFC(text);
  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  const segments: string[] = [];
  for (const { segment } of segmenter.segment(normalized)) {
    segments.push(segment);
  }
  return segments;
}

export function countGraphemes(text: string, locale: string = 'te'): number {
  return splitGraphemes(text, locale).length;
}

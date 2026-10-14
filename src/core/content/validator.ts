import type { LanguagePack, VocabularyItem, ValidationResult } from './types';
import { normalizeNFC, countGraphemes } from '../text/segmenter';

export function validatePack(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Pack data must be a non-null object'] };
  }

  const pack = data as Partial<LanguagePack>;
  if (!pack.id || typeof pack.id !== 'string') errors.push('Missing pack.id');
  if (!pack.name || typeof pack.name !== 'string') errors.push('Missing pack.name');
  if (!pack.language || typeof pack.language !== 'string') errors.push('Missing pack.language');
  if (!Array.isArray(pack.items) || pack.items.length === 0) {
    errors.push('pack.items must be a non-empty array');
    return { isValid: false, errors };
  }

  const seenIds = new Set<string>();

  pack.items.forEach((item: Partial<VocabularyItem>, index: number) => {
    if (!item.id || typeof item.id !== 'string') {
      errors.push(`Item at index ${index} missing id`);
    } else if (seenIds.has(item.id)) {
      errors.push(`Duplicate item id: ${item.id}`);
    } else {
      seenIds.add(item.id);
    }

    if (!item.te || typeof item.te !== 'string') {
      errors.push(`Item ${item.id || index} missing te (Telugu script text)`);
    } else {
      if (item.te !== normalizeNFC(item.te)) {
        errors.push(`Item ${item.id} te text is not normalized to NFC Unicode`);
      }
      if (countGraphemes(item.te, 'te') === 0) {
        errors.push(`Item ${item.id} te text has zero graphemes`);
      }
    }

    if (!item.en || typeof item.en !== 'string') {
      errors.push(`Item ${item.id || index} missing en translation`);
    }

    if (!item.roman || typeof item.roman !== 'string') {
      errors.push(`Item ${item.id || index} missing roman transliteration`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

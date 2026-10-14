import { describe, it, expect } from 'vitest';
import { validatePack } from '@/core/content/validator';
import teluguPack from '../../../packs/telugu/pack.json';

describe('Content Pack Validator', () => {
  it('validates the official starter Telugu content pack successfully', () => {
    const result = validatePack(teluguPack);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(teluguPack.items.length).toBeGreaterThanOrEqual(20);
  });

  it('rejects an invalid pack missing required fields or having non-NFC text', () => {
    const invalidPack = {
      id: 'bad-pack',
      language: 'te',
      items: [
        {
          id: 'item-1',
          en: 'Missing fields',
          // missing te, roman
        },
      ],
    };
    const result = validatePack(invalidPack);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

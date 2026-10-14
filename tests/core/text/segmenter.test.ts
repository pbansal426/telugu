import { describe, it, expect } from 'vitest';
import { splitGraphemes, countGraphemes, normalizeNFC } from '@/core/text/segmenter';

describe('Telugu Grapheme Cluster Segmenter', () => {
  it('correctly segments single conjuncts as 1 grapheme cluster', () => {
    // "క్రి" (ka + virama + ra + i matra) should be 1 user-perceived character
    const clusters = splitGraphemes('క్రి', 'te');
    expect(clusters).toEqual(['క్రి']);
    expect(countGraphemes('క్రి', 'te')).toBe(1);
  });

  it('correctly segments words with multiple conjuncts and vowel modifiers', () => {
    // "నమస్కారం" -> [న, మ, స్కా, రం] (4 clusters)
    const clusters = splitGraphemes('నమస్కారం', 'te');
    expect(clusters).toEqual(['న', 'మ', 'స్కా', 'రం']);
    expect(countGraphemes('నమస్కారం', 'te')).toBe(4);
  });

  it('normalizes decomposed Unicode into NFC form', () => {
    const raw = 'మార్కెట్';
    const normalized = normalizeNFC(raw);
    expect(normalized).toBe(raw.normalize('NFC'));
  });
});

import { describe, it, expect } from 'vitest';

describe('Environment smoke test', () => {
  it('verifies vitest test runner works', () => {
    expect(1 + 1).toBe(2);
  });
});

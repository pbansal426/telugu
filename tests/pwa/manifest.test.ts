import { describe, it, expect } from 'vitest';
import manifest from '../../public/manifest.json';

describe('PWA Manifest Configuration', () => {
  it('contains required installable PWA attributes', () => {
    expect(manifest.name).toBe('Telugu Learning Platform');
    expect(manifest.short_name).toBe('Telugu');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});

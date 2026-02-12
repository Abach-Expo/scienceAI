import { describe, it, expect } from 'vitest';
import { API_URL, GOOGLE_CLIENT_ID } from '../config';

describe('config', () => {
  it('should export API_URL with fallback', () => {
    expect(API_URL).toBeDefined();
    expect(typeof API_URL).toBe('string');
    // Default fallback when env var not set
    expect(API_URL).toContain('http');
  });

  it('should export GOOGLE_CLIENT_ID', () => {
    expect(typeof GOOGLE_CLIENT_ID).toBe('string');
  });
});

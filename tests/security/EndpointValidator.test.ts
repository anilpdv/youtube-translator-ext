import { describe, expect, it } from 'vitest';
import { EndpointValidator } from '../../security/network/EndpointValidator';

const definition = {
  providerId: 'gemini', origin: 'https://provider.example',
  allowedPathPrefixes: ['/v1/'], allowedModelIds: ['model'],
  policy: { allowedOrigins: ['https://provider.example'], allowedMethods: ['POST'], timeoutMs: 1000, maxRequestBytes: 100, maxResponseBytes: 100, allowRedirects: false, maximumRedirects: 0 },
};

describe('EndpointValidator', () => {
  it('rejects origin, path, and embedded credentials', () => {
    const validator = new EndpointValidator();
    expect(validator.validate('https://provider.example/v1/generate', definition).origin).toBe('https://provider.example');
    expect(() => validator.validate('https://evil.example/v1/generate', definition)).toThrow();
    expect(() => validator.validate('https://provider.example/other', definition)).toThrow();
    expect(() => validator.validate('https://user:pass@provider.example/v1/generate', definition)).toThrow();
  });
});

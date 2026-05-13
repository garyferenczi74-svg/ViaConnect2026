import { describe, it, expect } from 'vitest';
import { AIRouteError, classifyGeminiResponse, classifyUSDAResponse, classifyFetchError } from '../classify-ai';

describe('AIRouteError', () => {
  it('exposes code, httpStatus, userMessage', () => {
    const e = new AIRouteError('RATE_LIMITED', 'gemini 429', 503, 'Try again in a moment.');
    expect(e.code).toBe('RATE_LIMITED');
    expect(e.httpStatus).toBe(503);
    expect(e.userMessage).toBe('Try again in a moment.');
  });
});

describe('classifyGeminiResponse', () => {
  it('maps 400 to INVALID_INPUT', () => {
    expect(classifyGeminiResponse(400).code).toBe('INVALID_INPUT');
  });
  it('maps 403 to AUTH_INVALID', () => {
    expect(classifyGeminiResponse(403).code).toBe('AUTH_INVALID');
  });
  it('maps 429 to RATE_LIMITED', () => {
    expect(classifyGeminiResponse(429).code).toBe('RATE_LIMITED');
  });
  it('maps 500 to API_DOWN', () => {
    expect(classifyGeminiResponse(500).code).toBe('API_DOWN');
  });
  it('maps 503 to API_DOWN', () => {
    expect(classifyGeminiResponse(503).code).toBe('API_DOWN');
  });
});

describe('classifyUSDAResponse', () => {
  it('maps 429 to RATE_LIMITED', () => {
    expect(classifyUSDAResponse(429).code).toBe('RATE_LIMITED');
  });
  it('maps 403 to AUTH_INVALID', () => {
    expect(classifyUSDAResponse(403).code).toBe('AUTH_INVALID');
  });
});

describe('classifyFetchError', () => {
  it('maps a TimeoutError to TIMEOUT', () => {
    const err = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    expect(classifyFetchError(err).code).toBe('TIMEOUT');
  });
});

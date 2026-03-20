export const secureSession = {
  saveTokens: jest.fn(() => Promise.resolve()),
  clearTokens: jest.fn(() => Promise.resolve()),
  getTokens: jest.fn(() => Promise.resolve(null)),
};

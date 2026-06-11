// Prompt #170 Phase 1k: tests for the Capacitor camera capture abstraction.
//
// Covers platform detection (web / ios / android), web gallery happy path,
// the unsupported-environment branch for getUserMedia, and the cancel path
// when the file input closes without a selection.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectPlatform,
  captureMealPhoto,
  captureCameraFallbackPhoto,
  CaptureCancelledError,
  CaptureUnsupportedError,
  CaptureFileTooLargeError,
  CaptureUnsupportedTypeError,
} from '../camera-capture';

// 1x1 white JPEG (raw base64, no data URL prefix).
const ONE_PX_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8qqKKKACiiigD/9k=';

interface CapacitorStub {
  getPlatform(): 'ios' | 'android' | 'web';
}

const realDocument = globalThis.document;

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (realDocument) {
    vi.stubGlobal('document', realDocument);
  }
});

describe('detectPlatform', () => {
  it('returns "web" when no Capacitor global is present', () => {
    vi.stubGlobal('Capacitor', undefined);
    expect(detectPlatform()).toBe('web');
  });

  it('returns "ios_no_lidar" when Capacitor reports ios (Phase 1 hardcode)', () => {
    const stub: CapacitorStub = { getPlatform: () => 'ios' };
    vi.stubGlobal('Capacitor', stub);
    expect(detectPlatform()).toBe('ios_no_lidar');
  });

  it('returns "android_no_depth" when Capacitor reports android (Phase 1 hardcode)', () => {
    const stub: CapacitorStub = { getPlatform: () => 'android' };
    vi.stubGlobal('Capacitor', stub);
    expect(detectPlatform()).toBe('android_no_depth');
  });

  it('returns "web" when Capacitor reports web', () => {
    const stub: CapacitorStub = { getPlatform: () => 'web' };
    vi.stubGlobal('Capacitor', stub);
    expect(detectPlatform()).toBe('web');
  });
});

// Minimal File-like + FileReader stubs that satisfy the abstraction.
class FakeFile {
  readonly type: string;
  readonly size: number;
  readonly name: string;
  private readonly base64: string;
  constructor(base64: string, type: string, opts?: { size?: number; name?: string }) {
    this.base64 = base64;
    this.type = type;
    this.size = opts?.size ?? Math.floor((base64.length * 3) / 4);
    this.name = opts?.name ?? 'photo.jpg';
  }
  asDataUrl(): string {
    return `data:${this.type};base64,${this.base64}`;
  }
}

class FakeFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(file: FakeFile) {
    setTimeout(() => {
      this.result = file.asDataUrl();
      this.onload?.();
    }, 0);
  }
}

interface FakeInputEl {
  type: string;
  accept: string;
  style: Record<string, string>;
  files: FakeFile[] | null;
  parentNode: { removeChild(node: FakeInputEl): void } | null;
  setAttribute(name: string, value: string): void;
  addEventListener(event: string, cb: () => void): void;
  click(): void;
  _attributes: Record<string, string>;
  _listeners: Record<string, Array<() => void>>;
  _onClick: (() => void) | null;
}

function makeFakeInput(onClick: (input: FakeInputEl) => void): FakeInputEl {
  const listeners: Record<string, Array<() => void>> = {};
  const attributes: Record<string, string> = {};
  const input: FakeInputEl = {
    type: '',
    accept: '',
    style: {},
    files: null,
    parentNode: null,
    _attributes: attributes,
    _listeners: listeners,
    _onClick: null,
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
    addEventListener: (event, cb) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    },
    click: () => {
      // Defer so the awaiter sees the promise being constructed first.
      setTimeout(() => onClick(input), 0);
    },
  };
  return input;
}

function fireChange(input: FakeInputEl) {
  (input._listeners['change'] ?? []).forEach((cb) => cb());
}

function fireCancel(input: FakeInputEl) {
  (input._listeners['cancel'] ?? []).forEach((cb) => cb());
}

interface FakeDocument {
  body: { appendChild(node: FakeInputEl): void };
  createElement(tag: string): FakeInputEl;
}

function stubBrowserGlobals(opts: {
  onCreateInput: (input: FakeInputEl) => void;
  withMediaDevices?: boolean;
  getUserMediaImpl?: () => Promise<unknown>;
}) {
  const capacitor: CapacitorStub = { getPlatform: () => 'web' };
  vi.stubGlobal('Capacitor', capacitor);

  const fakeDoc: FakeDocument = {
    body: {
      appendChild: (node) => {
        node.parentNode = {
          removeChild: () => undefined,
        };
      },
    },
    createElement: (tag) => {
      if (tag !== 'input') {
        // The shell only creates input + canvas. For the gallery path the
        // shell does not need canvas because compression is skipped when
        // `document` lacks the Image constructor (test env condition).
        throw new Error(`unexpected createElement: ${tag}`);
      }
      const input = makeFakeInput(opts.onCreateInput);
      return input;
    },
  };
  vi.stubGlobal('document', fakeDoc);
  // jsdom-free env: do not provide Image so compressIfNeeded skips canvas.
  vi.stubGlobal('Image', undefined);
  vi.stubGlobal('FileReader', FakeFileReader as unknown as typeof FileReader);

  const navStub = opts.withMediaDevices
    ? { mediaDevices: { getUserMedia: opts.getUserMediaImpl ?? (() => Promise.reject(new Error('denied'))) } }
    : { mediaDevices: undefined };
  vi.stubGlobal('navigator', navStub);
}

describe('captureMealPhoto (web)', () => {
  it('source="gallery": resolves with a CaptureResult when a file is selected', async () => {
    let captured: FakeInputEl | null = null;
    stubBrowserGlobals({
      onCreateInput: (input) => {
        captured = input;
        // Simulate the user picking a file.
        input.files = [new FakeFile(ONE_PX_JPEG_BASE64, 'image/jpeg') as unknown as FakeFile];
        fireChange(input);
      },
    });

    const result = await captureMealPhoto({ source: 'gallery' });

    expect(captured).not.toBeNull();
    expect(result.mime).toBe('image/jpeg');
    expect(result.deviceClass).toBe('web');
    expect(result.imageBase64.length).toBeGreaterThan(0);
    expect(result.imageBase64.startsWith('data:')).toBe(false);
    expect(typeof result.capturedAt).toBe('string');
    expect(result.bytesAfterCompression).toBeGreaterThan(0);
  });

  it('source="gallery": the input carries NO capture attribute and accepts HEIC (Prompt 190 defect)', async () => {
    // The capture attribute on the upload input was the Prompt 190 bug: on
    // iOS Safari it forces the camera and suppresses the library picker.
    let captured: FakeInputEl | null = null;
    stubBrowserGlobals({
      onCreateInput: (input) => {
        captured = input;
        input.files = [new FakeFile(ONE_PX_JPEG_BASE64, 'image/jpeg') as unknown as FakeFile];
        fireChange(input);
      },
    });

    await captureMealPhoto({ source: 'gallery' });

    expect(captured).not.toBeNull();
    const el = captured as unknown as FakeInputEl;
    expect(el._attributes.capture).toBeUndefined();
    expect(el.accept).toContain('image/heic');
    expect(el.accept).toContain('image/heif');
    expect(el.accept).toContain('image/jpeg');
  });

  it('captureCameraFallbackPhoto: the Photo fallback input DOES carry capture="environment"', async () => {
    let captured: FakeInputEl | null = null;
    stubBrowserGlobals({
      onCreateInput: (input) => {
        captured = input;
        input.files = [new FakeFile(ONE_PX_JPEG_BASE64, 'image/jpeg') as unknown as FakeFile];
        fireChange(input);
      },
    });

    const result = await captureCameraFallbackPhoto();

    expect(result.deviceClass).toBe('web');
    const el = captured as unknown as FakeInputEl;
    expect(el._attributes.capture).toBe('environment');
  });

  it('source="gallery": a file over 15MB rejects with CaptureFileTooLargeError', async () => {
    stubBrowserGlobals({
      onCreateInput: (input) => {
        input.files = [
          new FakeFile(ONE_PX_JPEG_BASE64, 'image/jpeg', { size: 16 * 1024 * 1024 }) as unknown as FakeFile,
        ];
        fireChange(input);
      },
    });

    await expect(captureMealPhoto({ source: 'gallery' })).rejects.toBeInstanceOf(
      CaptureFileTooLargeError,
    );
  });

  it('source="gallery": an unsupported type rejects with CaptureUnsupportedTypeError', async () => {
    stubBrowserGlobals({
      onCreateInput: (input) => {
        input.files = [
          new FakeFile(ONE_PX_JPEG_BASE64, 'application/pdf', { name: 'meal.pdf' }) as unknown as FakeFile,
        ];
        fireChange(input);
      },
    });

    await expect(captureMealPhoto({ source: 'gallery' })).rejects.toBeInstanceOf(
      CaptureUnsupportedTypeError,
    );
  });

  it('source="gallery": a HEIC library photo is accepted and re-encoded through the pipeline', async () => {
    stubBrowserGlobals({
      onCreateInput: (input) => {
        input.files = [
          new FakeFile(ONE_PX_JPEG_BASE64, 'image/heic', { name: 'IMG_0001.heic' }) as unknown as FakeFile,
        ];
        fireChange(input);
      },
    });

    const result = await captureMealPhoto({ source: 'gallery' });
    expect(result.deviceClass).toBe('web');
    expect(result.imageBase64.length).toBeGreaterThan(0);
  });

  it('source="camera" + getUserMedia unavailable: throws CaptureUnsupportedError', async () => {
    stubBrowserGlobals({
      onCreateInput: () => undefined,
      withMediaDevices: false,
    });

    await expect(captureMealPhoto({ source: 'camera' })).rejects.toBeInstanceOf(
      CaptureUnsupportedError,
    );
  });

  it('source="gallery" + file input dismissed: rejects with CaptureCancelledError', async () => {
    stubBrowserGlobals({
      onCreateInput: (input) => {
        // User cancels: change fires with empty file list, or cancel fires.
        input.files = [];
        fireChange(input);
        fireCancel(input);
      },
    });

    await expect(captureMealPhoto({ source: 'gallery' })).rejects.toBeInstanceOf(
      CaptureCancelledError,
    );
  });
});

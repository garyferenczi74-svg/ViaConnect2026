// Option A spike: Google <model-viewer> 4.3.0 via CDN.
// Arnold appendix: v4.3.0 specifically (WKWebView + USDZ). Do not pin older.
// CDN script only — no package.json churn.

export const MODEL_VIEWER_VERSION = '4.3.0';

export const MODEL_VIEWER_CDN = `https://ajax.googleapis.com/ajax/libs/model-viewer/${MODEL_VIEWER_VERSION}/model-viewer.min.js`;

export const MODEL_VIEWER_TAG = 'model-viewer';

let loadPromise: Promise<void> | null = null;

export function isModelViewerDefined(): boolean {
  if (typeof customElements === 'undefined') return false;
  return Boolean(customElements.get(MODEL_VIEWER_TAG));
}

export function ensureModelViewerScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('model-viewer is browser-only'));
  }
  if (isModelViewerDefined()) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-model-viewer="${MODEL_VIEWER_VERSION}"]`,
    );
    const finish = (): void => {
      if (typeof customElements.whenDefined === 'function') {
        void customElements.whenDefined(MODEL_VIEWER_TAG).then(() => resolve(), reject);
        return;
      }
      if (isModelViewerDefined()) {
        resolve();
        return;
      }
      reject(new Error('model-viewer custom element missing'));
    };

    if (existing) {
      finish();
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_CDN;
    script.dataset.modelViewer = MODEL_VIEWER_VERSION;
    script.addEventListener('load', finish);
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('model-viewer 4.3.0 script failed to load'));
    });
    document.head.appendChild(script);
  });

  return loadPromise;
}

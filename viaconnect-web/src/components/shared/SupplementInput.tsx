'use client';

import { useState, useRef, useCallback } from 'react';
import { pluginRegistry } from '@/plugins/registry';
import BarcodeScanner from './BarcodeScanner';
import { PluginProductResult } from '@/plugins/types';
import { ScanLine, Search, Check, AlertCircle, Dna, Loader2, ChevronRight } from 'lucide-react';

interface SupplementInputProps {
  portal: 'consumer' | 'practitioner' | 'naturopath';
  onProductAdded: (product: PluginProductResult) => void;
}

type ViewState = 'idle' | 'scanning' | 'searching' | 'loading' | 'results' | 'error' | 'notfound';

export default function SupplementInput({ portal, onProductAdded }: SupplementInputProps) {
  const [view, setView] = useState<ViewState>('idle');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PluginProductResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PluginProductResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const searchTimer = useRef<NodeJS.Timeout>();

  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    setScannedBarcode(barcode);
    setView('loading');

    const result = await pluginRegistry.lookupBarcode(barcode);

    if (result) {
      setSelectedProduct(result);
      setView('results');
    } else {
      setView('notfound');
      setErrorMsg(`Barcode ${barcode} not found. Try searching by product name.`);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setView('searching');
      const results = await pluginRegistry.searchProduct(value);
      setSearchResults(results);
      setView('idle');
    }, 300);
  };

  const handleSelectResult = (product: PluginProductResult) => {
    setSelectedProduct(product);
    setSearchResults([]);
    setQuery('');
    setView('results');
  };

  const handleAddProduct = () => {
    if (selectedProduct) {
      onProductAdded(selectedProduct);
      resetState();
    }
  };

  function resetState() {
    setView('idle');
    setSelectedProduct(null);
    setSearchResults([]);
    setQuery('');
    setScannedBarcode('');
    setErrorMsg('');
  }

  return (
    <div>
      {/* SCANNER OVERLAY */}
      {view === 'scanning' && (
        <BarcodeScanner
          onBarcodeDetected={handleBarcodeDetected}
          onClose={() => setView('idle')}
        />
      )}

      {/* INPUT STATE */}
      {view !== 'results' && view !== 'scanning' && (
        <div>
          {/* Scan Barcode button */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setView('scanning'); }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px', border: '2px solid #2DA5A0', borderRadius: '12px',
                background: 'rgba(45,165,160,0.05)', cursor: 'pointer', fontWeight: 600,
                color: '#1A2744', fontSize: '14px', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(45,165,160,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(45,165,160,0.05)'; }}
            >
              <ScanLine size={20} color="#2DA5A0" />
              Scan Barcode
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by brand, product, or ingredient..."
              style={{
                width: '100%', padding: '12px 12px 12px 40px',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                background: 'rgba(30,48,84,0.45)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                color: '#ffffff',
                fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(45,165,160,0.6)'; }}
              onBlur={(e) => { if (!searchResults.length) e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
            <Search size={16} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            {view === 'searching' && (
              <Loader2 size={16} color="#2DA5A0" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div style={{
              marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '12px',
              backgroundColor: 'white', maxHeight: '300px', overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              {searchResults.map((result, i) => (
                <button
                  key={`${result.source}-${result.productName}-${i}`}
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleSelectResult(result); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    borderBottom: i < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                    borderLeft: `4px solid ${result.isPeptide ? '#7C3AED' : '#2DA5A0'}`,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1A2744' }}>
                      {result.brand && <span style={{ color: '#666', fontSize: '12px' }}>{result.brand} · </span>}
                      {result.productName || 'Unknown Product'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      via {result.source}
                      {result.isPeptide && (
                        <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#EDE9FE', color: '#7C3AED', fontSize: '10px', fontWeight: 700 }}>
                          PEPTIDE
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} color="#ccc" />
                </button>
              ))}
            </div>
          )}

          {/* Loading state */}
          {view === 'loading' && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <Loader2 size={32} color="#2DA5A0" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontWeight: 600, color: '#1A2744', margin: 0 }}>Looking up barcode {scannedBarcode}...</p>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Checking Product Cache → NIH DSLD → Open Food Facts</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Not found */}
          {view === 'notfound' && (
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#FEF3C7', borderRadius: '12px', marginTop: '12px' }}>
              <AlertCircle size={20} color="#92400E" style={{ margin: '0 auto 8px' }} />
              <p style={{ color: '#92400E', fontWeight: 600, fontSize: '14px', margin: '0 0 8px' }}>{errorMsg}</p>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setView('idle'); }}
                style={{ color: '#2DA5A0', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                Search by name instead
              </button>
            </div>
          )}
        </div>
      )}

      {/* RESULTS STATE: Product confirmation card */}
      {view === 'results' && selectedProduct && (
        <div style={{
          border: `2px solid ${selectedProduct.isPeptide ? '#7C3AED' : '#2DA5A0'}`,
          borderRadius: '12px', padding: '20px',
          backgroundColor: selectedProduct.isPeptide ? 'rgba(124,58,237,0.05)' : 'rgba(45,165,160,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Check size={20} color="#059669" />
            <span style={{ fontWeight: 700, color: '#059669' }}>Product Found</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#999', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
              via {selectedProduct.source}
            </span>
          </div>

          {selectedProduct.brand && (
            <p style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>
              {selectedProduct.brand}
            </p>
          )}
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#1A2744', margin: '0 0 4px' }}>
            {selectedProduct.productName || 'Supplement'}
          </p>
          {selectedProduct.servingSize && (
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px' }}>{selectedProduct.servingSize}</p>
          )}

          {selectedProduct.ingredients?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
                Ingredients ({selectedProduct.ingredients.length})
              </p>
              {selectedProduct.ingredients.map((ing, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                  borderBottom: i < selectedProduct.ingredients.length - 1 ? '1px solid #eee' : 'none',
                }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{ing.name}</span>
                    {ing.form && <span style={{ color: '#999', fontSize: '12px', marginLeft: '4px' }}>({ing.form})</span>}
                    {ing.isProprietaryBlend && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        Blend
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    {ing.amount != null ? `${ing.amount} ${ing.unit || ''}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Peptide-specific info */}
          {selectedProduct.isPeptide && selectedProduct.rawData && (
            <div style={{ padding: '8px 12px', backgroundColor: '#EDE9FE', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Dna size={14} color="#7C3AED" />
                <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 600 }}>
                  {selectedProduct.rawData.categoryName} · {selectedProduct.rawData.evidenceLevel}
                </span>
              </div>
              {selectedProduct.rawData.genexSynergy && (
                <p style={{ fontSize: '11px', color: '#6D28D9', margin: '4px 0 0' }}>
                  GeneX360™: {selectedProduct.rawData.genexSynergy}
                </p>
              )}
              <p style={{ fontSize: '10px', color: '#9333EA', margin: '4px 0 0' }}>
                ⚠️ Requires practitioner consultation
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); resetState(); }}
              style={{
                flex: 1, padding: '10px', fontSize: '14px', border: '1px solid #ccc',
                borderRadius: '8px', background: 'white', cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); handleAddProduct(); }}
              style={{
                flex: 1, padding: '10px', fontSize: '14px', fontWeight: 600, border: 'none',
                borderRadius: '8px', color: 'white', cursor: 'pointer', transition: 'opacity 0.1s',
                background: selectedProduct.isPeptide ? '#7C3AED' : '#2DA5A0',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {selectedProduct.isPeptide ? 'Add to Peptide Stack' : 'Add to My Supplements'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

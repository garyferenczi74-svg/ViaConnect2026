import React from 'react';

export interface ColorSwatch {
  code: string;
  hex: string;
  textDark?: boolean;
}

export interface ColorPaletteProps {
  swatches?: ColorSwatch[];
  className?: string;
}

const defaultSwatches: ColorSwatch[] = [
  { code: 'CY', hex: '#06B6D4' },
  { code: 'EM', hex: '#10B981' },
  { code: 'AM', hex: '#F59E0B' },
  { code: 'VI', hex: '#8B5CF6', textDark: false },
  { code: 'NV', hex: '#0a0f1c', textDark: false },
];

export function ColorPalette({ swatches = defaultSwatches, className = '' }: ColorPaletteProps) {
  return (
    <div className={`grid grid-cols-5 gap-2 ${className}`}>
      {swatches.map((swatch) => {
        const isNeutral = swatch.hex.toLowerCase() === '#0a0f1c';
        return (
          <div
            key={swatch.code}
            className={`h-12 rounded-lg flex items-center justify-center ${
              isNeutral ? 'border border-white/10' : ''
            }`}
            style={{
              backgroundColor: swatch.hex,
              boxShadow: isNeutral ? 'none' : `0 10px 15px -3px ${swatch.hex}33`,
            }}
          >
            <span
              className="text-[10px] font-mono"
              style={{ color: swatch.textDark === false ? '#fff' : '#0a0f1c' }}
            >
              {swatch.code}
            </span>
          </div>
        );
      })}
    </div>
  );
}

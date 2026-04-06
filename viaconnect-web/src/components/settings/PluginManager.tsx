'use client';

import { useState } from 'react';
import { pluginRegistry } from '@/plugins/registry';
import { SupplementPlugin } from '@/plugins/types';
import {
  Database, ShieldCheck, Globe, Dna, Shield, BadgeCheck, ListChecks,
  FlaskConical, Utensils, SearchCheck, Syringe, Clock, ClipboardList,
  AlertTriangle, BookOpen, Leaf, ScanLine, Search, Camera, Activity,
  Lock, Check, X,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Database, ShieldCheck, Globe, Dna, Shield, BadgeCheck, ListChecks,
  FlaskConical, Utensils, SearchCheck, Syringe, Clock, ClipboardList,
  AlertTriangle, BookOpen, Leaf,
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  core: { label: 'Core', color: '#059669' },
  supplements: { label: 'Supplements', color: '#2DA5A0' },
  peptides: { label: 'Peptides', color: '#7C3AED' },
  interactions: { label: 'Interactions', color: '#DC2626' },
};

const CAPABILITY_ICONS: Record<string, { icon: any; label: string }> = {
  barcode: { icon: ScanLine, label: 'Barcode' },
  search: { icon: Search, label: 'Search' },
  photo: { icon: Camera, label: 'Photo' },
  interactions: { icon: Activity, label: 'Interactions' },
};

interface PluginManagerProps {
  portal: 'consumer' | 'practitioner' | 'naturopath';
}

export default function PluginManager({ portal }: PluginManagerProps) {
  const [plugins] = useState<SupplementPlugin[]>(pluginRegistry.plugins);
  const isReadOnly = portal === 'consumer';

  const grouped = {
    core: plugins.filter(p => p.category === 'core'),
    supplements: plugins.filter(p => p.category === 'supplements'),
    peptides: plugins.filter(p => p.category === 'peptides'),
    interactions: plugins.filter(p => p.category === 'interactions'),
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1A2744', margin: '0 0 4px' }}>
          Plugin Manager
        </h2>
        <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
          {isReadOnly
            ? 'View available data sources for supplement and peptide lookups.'
            : 'Enable or disable data sources for barcode scanning, product search, and interaction checking.'}
        </p>
      </div>

      {Object.entries(grouped).map(([category, categoryPlugins]) => {
        if (categoryPlugins.length === 0) return null;
        const cat = CATEGORY_LABELS[category];

        return (
          <div key={category} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: cat.color,
              }} />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1A2744', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cat.label} Plugins ({categoryPlugins.length})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categoryPlugins.map((plugin) => {
                const IconComponent = ICON_MAP[plugin.icon] || Database;
                const status = plugin.enabled
                  ? { label: 'Active', color: '#059669', bg: '#ECFDF5' }
                  : plugin.requiresApiKey
                    ? { label: 'Needs API Key', color: '#D97706', bg: '#FFFBEB' }
                    : { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' };

                return (
                  <div
                    key={plugin.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '16px', borderRadius: '12px',
                      border: `1px solid ${plugin.enabled ? cat.color + '40' : '#e5e7eb'}`,
                      backgroundColor: plugin.enabled ? cat.color + '08' : 'white',
                      opacity: plugin.enabled ? 1 : 0.7,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: cat.color + '15',
                      flexShrink: 0,
                    }}>
                      <IconComponent size={20} color={cat.color} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1A2744' }}>
                          {plugin.name}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                          backgroundColor: status.bg, color: status.color,
                        }}>
                          {status.label}
                        </span>
                        {plugin.requiresApiKey && !plugin.enabled && (
                          <Lock size={12} color="#D97706" />
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0', lineHeight: 1.4 }}>
                        {plugin.description}
                      </p>

                      {/* Capability badges */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {plugin.supportsBarcodeLookup && <CapabilityBadge type="barcode" />}
                        {plugin.supportsTextSearch && <CapabilityBadge type="search" />}
                        {plugin.supportsPhotoScan && <CapabilityBadge type="photo" />}
                        {plugin.supportsInteractionCheck && <CapabilityBadge type="interactions" />}
                      </div>
                    </div>

                    {/* Toggle / Status */}
                    <div style={{ flexShrink: 0 }}>
                      {isReadOnly ? (
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: plugin.enabled ? '#ECFDF5' : '#F3F4F6',
                        }}>
                          {plugin.enabled ? <Check size={14} color="#059669" /> : <X size={14} color="#9CA3AF" />}
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '44px', height: '24px', borderRadius: '12px',
                            backgroundColor: plugin.enabled ? '#2DA5A0' : '#D1D5DB',
                            position: 'relative', cursor: plugin.category === 'core' ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s',
                            opacity: plugin.category === 'core' ? 0.6 : 1,
                          }}
                          title={plugin.category === 'core' ? 'Core plugins cannot be disabled' : `Toggle ${plugin.name}`}
                        >
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            backgroundColor: 'white', position: 'absolute', top: '2px',
                            left: plugin.enabled ? '22px' : '2px',
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CapabilityBadge({ type }: { type: string }) {
  const cap = CAPABILITY_ICONS[type];
  if (!cap) return null;
  const Icon = cap.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '10px', fontWeight: 500, color: '#6B7280',
      padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F3F4F6',
    }}>
      <Icon size={10} />
      {cap.label}
    </span>
  );
}

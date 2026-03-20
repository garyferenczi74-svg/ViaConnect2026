import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';

// ── Seed Data ────────────────────────────────────────────────────────────────

interface ComplianceItem {
  id: string;
  category: string;
  requirement: string;
  status: 'compliant' | 'needs-review' | 'non-compliant';
  lastReviewed: string;
  notes: string;
}

const HIPAA_ITEMS: ComplianceItem[] = [
  { id: 'c1', category: 'Privacy Rule', requirement: 'Patient consent forms on file', status: 'compliant', lastReviewed: '2026-03-01', notes: '32/32 patients have signed consent' },
  { id: 'c2', category: 'Privacy Rule', requirement: 'Notice of Privacy Practices distributed', status: 'compliant', lastReviewed: '2026-03-01', notes: 'All patients acknowledged NPP' },
  { id: 'c3', category: 'Security Rule', requirement: 'Electronic PHI encrypted at rest', status: 'compliant', lastReviewed: '2026-02-15', notes: 'Supabase AES-256 encryption' },
  { id: 'c4', category: 'Security Rule', requirement: 'Access controls and audit logging', status: 'compliant', lastReviewed: '2026-03-20', notes: 'RLS policies active, audit_logs table recording' },
  { id: 'c5', category: 'Security Rule', requirement: 'Workforce security training', status: 'needs-review', lastReviewed: '2025-12-15', notes: 'Annual training due — schedule for Q2 2026' },
  { id: 'c6', category: 'Breach', requirement: 'Incident response plan documented', status: 'compliant', lastReviewed: '2026-01-10', notes: 'Plan updated for 2026' },
  { id: 'c7', category: 'Breach', requirement: 'Business associate agreements (BAAs)', status: 'needs-review', lastReviewed: '2025-11-20', notes: 'Supabase BAA signed. Lab BAAs need renewal.' },
  { id: 'c8', category: 'Admin', requirement: 'Risk assessment completed', status: 'compliant', lastReviewed: '2026-02-01', notes: 'Annual risk assessment complete' },
];

interface ConsentRecord {
  id: string;
  patient: string;
  type: string;
  signedDate: string;
  expiryDate: string;
  status: 'active' | 'expiring' | 'expired';
}

const CONSENT_RECORDS: ConsentRecord[] = [
  { id: 'cn1', patient: 'Elena Rodriguez', type: 'Treatment Consent + HIPAA', signedDate: '2026-01-15', expiryDate: '2027-01-15', status: 'active' },
  { id: 'cn2', patient: 'David Park', type: 'Treatment Consent + HIPAA', signedDate: '2025-08-20', expiryDate: '2026-08-20', status: 'active' },
  { id: 'cn3', patient: 'Fatima Al-Rashid', type: 'Treatment Consent + HIPAA + Genetic Data', signedDate: '2026-02-10', expiryDate: '2027-02-10', status: 'active' },
  { id: 'cn4', patient: 'Oliver Chen', type: 'Treatment Consent', signedDate: '2026-03-20', expiryDate: '2027-03-20', status: 'active' },
  { id: 'cn5', patient: 'Sarah Mitchell', type: 'Treatment Consent + HIPAA', signedDate: '2025-04-01', expiryDate: '2026-04-01', status: 'expiring' },
  { id: 'cn6', patient: 'James O\'Brien', type: 'Treatment Consent', signedDate: '2025-02-15', expiryDate: '2026-02-15', status: 'expired' },
];

interface AuditEntry {
  id: string;
  action: string;
  table: string;
  user: string;
  timestamp: string;
  detail: string;
}

const RECENT_AUDIT: AuditEntry[] = [
  { id: 'al1', action: 'INSERT', table: 'botanical_formulas', user: 'Dr. Vasquez', timestamp: '2026-03-20 09:30', detail: 'Created Nervine Tonic Blend for Elena Rodriguez' },
  { id: 'al2', action: 'UPDATE', table: 'clinical_assessments', user: 'Dr. Vasquez', timestamp: '2026-03-20 09:15', detail: 'Updated constitutional assessment — Elena Rodriguez' },
  { id: 'al3', action: 'SELECT', table: 'genetic_profiles', user: 'Dr. Vasquez', timestamp: '2026-03-19 14:00', detail: 'Accessed genetic data — David Park' },
  { id: 'al4', action: 'INSERT', table: 'protocols', user: 'Dr. Vasquez', timestamp: '2026-03-19 11:30', detail: 'Created digestive protocol — Fatima Al-Rashid' },
  { id: 'al5', action: 'UPDATE', table: 'profiles', user: 'System', timestamp: '2026-03-18 08:00', detail: 'Consent status updated — Oliver Chen' },
];

const STATUS_CONFIG = {
  compliant: { bg: 'bg-sage/10', text: 'text-sage', label: 'Compliant' },
  'needs-review': { bg: 'bg-copper/10', text: 'text-copper', label: 'Needs Review' },
  'non-compliant': { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Non-Compliant' },
};

const CONSENT_STATUS_CONFIG = {
  active: { bg: 'bg-sage/10', text: 'text-sage' },
  expiring: { bg: 'bg-copper/10', text: 'text-copper' },
  expired: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

type TabKey = 'hipaa' | 'consent' | 'audit' | 'export';

// ── Component ────────────────────────────────────────────────────────────────

export default function ComplianceScreen() {
  const [tab, setTab] = useState<TabKey>('hipaa');

  const compliantCount = HIPAA_ITEMS.filter((i) => i.status === 'compliant').length;
  const compliancePercent = Math.round((compliantCount / HIPAA_ITEMS.length) * 100);

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-sage text-sm font-semibold">Compliance & Audit</Text>
        <Text className="text-white text-2xl font-bold">Practice Compliance</Text>
        <Text className="text-dark-border text-sm">HIPAA · Consent · Audit Trail</Text>
      </View>

      {/* Compliance Score */}
      <View className="px-4 py-2">
        <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white font-bold">Overall Compliance</Text>
            <Text className={`text-lg font-bold ${compliancePercent >= 80 ? 'text-sage' : 'text-copper'}`}>
              {compliancePercent}%
            </Text>
          </View>
          <View className="h-3 bg-dark-border/30 rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${compliancePercent >= 80 ? 'bg-sage' : 'bg-copper'}`}
              style={{ width: `${compliancePercent}%` }}
            />
          </View>
          <Text className="text-dark-border text-xs mt-1">
            {compliantCount}/{HIPAA_ITEMS.length} requirements met · {HIPAA_ITEMS.length - compliantCount} need attention
          </Text>
        </View>
      </View>

      {/* Tab Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2">
        <View className="flex-row gap-2">
          {([
            { key: 'hipaa', label: 'HIPAA Status' },
            { key: 'consent', label: 'Consent Mgmt' },
            { key: 'audit', label: 'Audit Trail' },
            { key: 'export', label: 'Export Report' },
          ] as const).map((t) => (
            <Pressable
              key={t.key}
              className={`rounded-full px-4 py-1.5 ${
                tab === t.key ? 'bg-plum' : 'bg-white/5 border border-white/10'
              }`}
              onPress={() => setTab(t.key)}
            >
              <Text className={`text-sm font-semibold ${tab === t.key ? 'text-white' : 'text-dark-border'}`}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* HIPAA Status Tab */}
      {tab === 'hipaa' && (
        <View className="px-4 mt-4">
          {HIPAA_ITEMS.map((item) => {
            const config = STATUS_CONFIG[item.status];
            return (
              <View key={item.id} className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                <View className="flex-row items-center justify-between mb-1">
                  <View className="bg-dark-border/20 rounded px-1.5 py-0.5">
                    <Text className="text-dark-border text-[10px] font-semibold">{item.category}</Text>
                  </View>
                  <View className={`${config.bg} rounded-full px-2 py-0.5`}>
                    <Text className={`text-[10px] font-bold ${config.text}`}>{config.label}</Text>
                  </View>
                </View>
                <Text className="text-white font-semibold text-sm mt-1">{item.requirement}</Text>
                <Text className="text-dark-border text-xs mt-1">{item.notes}</Text>
                <Text className="text-dark-border text-[10px] mt-1">Last reviewed: {item.lastReviewed}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Consent Management Tab */}
      {tab === 'consent' && (
        <View className="px-4 mt-4">
          <View className="flex-row gap-2 mb-4">
            {[
              { label: 'Active', count: CONSENT_RECORDS.filter((c) => c.status === 'active').length, color: 'text-sage' },
              { label: 'Expiring', count: CONSENT_RECORDS.filter((c) => c.status === 'expiring').length, color: 'text-copper' },
              { label: 'Expired', count: CONSENT_RECORDS.filter((c) => c.status === 'expired').length, color: 'text-red-400' },
            ].map((stat) => (
              <View key={stat.label} className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10 items-center">
                <Text className={`text-xl font-bold ${stat.color}`}>{stat.count}</Text>
                <Text className="text-dark-border text-xs">{stat.label}</Text>
              </View>
            ))}
          </View>

          {CONSENT_RECORDS.map((record) => {
            const config = CONSENT_STATUS_CONFIG[record.status];
            return (
              <View key={record.id} className="bg-white/5 rounded-xl p-3 mb-2 border border-white/10">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-white font-semibold text-sm">{record.patient}</Text>
                  <View className={`${config.bg} rounded-full px-2 py-0.5`}>
                    <Text className={`text-[10px] font-bold ${config.text}`}>{record.status}</Text>
                  </View>
                </View>
                <Text className="text-dark-border text-xs">{record.type}</Text>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-dark-border text-[10px]">Signed: {record.signedDate}</Text>
                  <Text className="text-dark-border text-[10px]">Expires: {record.expiryDate}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Audit Trail Tab */}
      {tab === 'audit' && (
        <View className="px-4 mt-4">
          <View className="bg-white/5 rounded-xl p-3 border border-white/10 mb-4">
            <Text className="text-sage text-sm font-semibold">Audit Log</Text>
            <Text className="text-dark-border text-xs">All database mutations logged per CLAUDE.md Rule #3</Text>
          </View>

          {RECENT_AUDIT.map((entry) => {
            const actionColor =
              entry.action === 'INSERT' ? 'text-sage'
              : entry.action === 'UPDATE' ? 'text-copper'
              : entry.action === 'SELECT' ? 'text-plum'
              : 'text-red-400';
            return (
              <View key={entry.id} className="bg-white/5 rounded-xl p-3 mb-2 border border-white/10">
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center">
                    <View className="bg-dark-border/20 rounded px-1.5 py-0.5 mr-2">
                      <Text className={`text-[10px] font-mono font-bold ${actionColor}`}>{entry.action}</Text>
                    </View>
                    <Text className="text-dark-border text-xs font-mono">{entry.table}</Text>
                  </View>
                  <Text className="text-dark-border text-[10px]">{entry.timestamp}</Text>
                </View>
                <Text className="text-white text-sm">{entry.detail}</Text>
                <Text className="text-plum text-[10px] mt-0.5">By: {entry.user}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Export Report Tab */}
      {tab === 'export' && (
        <View className="px-4 mt-4">
          <View className="bg-white/5 rounded-2xl p-6 border border-white/10 items-center">
            <Text className="text-white text-lg font-bold mb-2">Export Compliance Report</Text>
            <Text className="text-dark-border text-sm text-center mb-4">
              Generate a comprehensive PDF report of your practice compliance status,
              consent records, and audit trail for regulatory review.
            </Text>

            <View className="w-full gap-3">
              <Pressable className="bg-plum rounded-xl py-3.5 items-center active:opacity-80">
                <Text className="text-white font-bold">Export Full Compliance Report</Text>
              </Pressable>
              <Pressable className="bg-white/5 border border-white/10 rounded-xl py-3.5 items-center active:opacity-80">
                <Text className="text-white font-semibold">Export Consent Summary</Text>
              </Pressable>
              <Pressable className="bg-white/5 border border-white/10 rounded-xl py-3.5 items-center active:opacity-80">
                <Text className="text-white font-semibold">Export Audit Log (Last 90 Days)</Text>
              </Pressable>
            </View>

            <View className="mt-4 pt-4 border-t border-white/10 w-full">
              <Text className="text-dark-border text-xs text-center">
                Reports generated with timestamp and digital signature.{'\n'}
                Compliant with HIPAA §164.530(j) record retention.
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

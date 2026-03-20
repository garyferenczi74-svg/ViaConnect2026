import { View, Text, ScrollView, Pressable } from 'react-native';
import { useBreakpoint } from '../../src/components/shared/ResponsiveLayout';

const MOCK_PATIENTS = [
  { id: '1', name: 'Sarah Chen', status: 'Active', protocol: 'MTHFR+ Protocol', lastVisit: '2026-03-18' },
  { id: '2', name: 'James Wilson', status: 'Active', protocol: 'NAD+ Recovery', lastVisit: '2026-03-15' },
  { id: '3', name: 'Maria Gonzalez', status: 'Review', protocol: 'COMT+ Balance', lastVisit: '2026-03-12' },
  { id: '4', name: 'David Kim', status: 'Active', protocol: 'FOCUS+ Clarity', lastVisit: '2026-03-10' },
  { id: '5', name: 'Lisa Park', status: 'Pending', protocol: 'BLAST+ Energy', lastVisit: '2026-03-08' },
];

function PatientTable() {
  return (
    <View className="bg-dark-card rounded-2xl border border-dark-border overflow-hidden">
      {/* Table Header */}
      <View className="flex-row bg-dark-border/30 px-5 py-3">
        <Text className="text-sage text-xs font-semibold flex-[2]">PATIENT</Text>
        <Text className="text-sage text-xs font-semibold flex-1">STATUS</Text>
        <Text className="text-sage text-xs font-semibold flex-[2]">PROTOCOL</Text>
        <Text className="text-sage text-xs font-semibold flex-1">LAST VISIT</Text>
      </View>
      {/* Table Rows */}
      {MOCK_PATIENTS.map((p) => (
        <Pressable
          key={p.id}
          className="flex-row px-5 py-3 border-b border-dark-border active:bg-dark-border/20"
        >
          <Text className="text-white text-sm flex-[2]">{p.name}</Text>
          <View className="flex-1">
            <View
              className={`self-start px-2 py-0.5 rounded-full ${
                p.status === 'Active'
                  ? 'bg-portal-green/20'
                  : p.status === 'Review'
                    ? 'bg-copper/20'
                    : 'bg-sage/20'
              }`}
            >
              <Text
                className={`text-xs ${
                  p.status === 'Active'
                    ? 'text-portal-green'
                    : p.status === 'Review'
                      ? 'text-copper'
                      : 'text-sage'
                }`}
              >
                {p.status}
              </Text>
            </View>
          </View>
          <Text className="text-sage text-sm flex-[2] font-mono">{p.protocol}</Text>
          <Text className="text-sage text-sm flex-1">{p.lastVisit}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PatientCardList() {
  return (
    <View className="gap-3">
      {MOCK_PATIENTS.map((p) => (
        <Pressable
          key={p.id}
          className="bg-dark-card rounded-2xl p-4 border border-dark-border active:bg-dark-border/20"
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white font-semibold">{p.name}</Text>
            <View
              className={`px-2 py-0.5 rounded-full ${
                p.status === 'Active' ? 'bg-portal-green/20' : 'bg-sage/20'
              }`}
            >
              <Text
                className={`text-xs ${
                  p.status === 'Active' ? 'text-portal-green' : 'text-sage'
                }`}
              >
                {p.status}
              </Text>
            </View>
          </View>
          <Text className="text-sage text-sm font-mono">{p.protocol}</Text>
          <Text className="text-dark-border text-xs mt-1">
            Last visit: {p.lastVisit}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatsRow() {
  const stats = [
    { label: 'Active Patients', value: '24', color: 'text-portal-green' },
    { label: 'Pending Reviews', value: '5', color: 'text-copper' },
    { label: 'Protocols', value: '12', color: 'text-plum' },
    { label: 'This Month', value: '38', color: 'text-white' },
  ];

  return (
    <View className="flex-row gap-4 mb-6">
      {stats.map((s) => (
        <View
          key={s.label}
          className="flex-1 bg-dark-card rounded-2xl p-4 border border-dark-border"
        >
          <Text className="text-sage text-xs mb-1">{s.label}</Text>
          <Text className={`text-2xl font-bold ${s.color}`}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PractitionerDashboard() {
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';

  return (
    <ScrollView className="flex-1 bg-dark-bg p-4">
      <Text className="text-white text-2xl font-bold mb-1">
        Practitioner Dashboard
      </Text>
      <Text className="text-sage text-sm mb-6">
        Manage patients, protocols, and analytics
      </Text>

      {isDesktop && <StatsRow />}

      {isDesktop ? (
        // Desktop: full data table + side panel
        <View className="flex-row gap-4">
          <View className="flex-[3]">
            <Text className="text-white font-semibold mb-3">Patient Roster</Text>
            <PatientTable />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold mb-3">Quick Actions</Text>
            <View className="bg-dark-card rounded-2xl p-4 border border-dark-border gap-3">
              <Pressable className="bg-portal-green/20 rounded-xl p-3 active:opacity-80">
                <Text className="text-portal-green text-sm font-medium text-center">
                  + New Protocol
                </Text>
              </Pressable>
              <Pressable className="bg-teal/20 rounded-xl p-3 active:opacity-80">
                <Text className="text-teal-light text-sm font-medium text-center">
                  + Add Patient
                </Text>
              </Pressable>
              <Pressable className="bg-copper/20 rounded-xl p-3 active:opacity-80">
                <Text className="text-copper text-sm font-medium text-center">
                  Review Pending
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        // Mobile: card list
        <View>
          <Text className="text-white font-semibold mb-3">Patients</Text>
          <PatientCardList />
        </View>
      )}
    </ScrollView>
  );
}

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';

// ── Seed Data ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Generate a 4-week calendar starting from current week
function generateCalendar(): Array<{ date: number; day: string; month: string; isToday: boolean; hasAppt: boolean }> {
  const days = [];
  const today = new Date(2026, 2, 20); // March 20, 2026
  for (let i = -3; i < 25; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.getDate(),
      day: DAYS_OF_WEEK[d.getDay()],
      month: d.toLocaleString('default', { month: 'short' }),
      isToday: i === 0,
      hasAppt: [0, 1, 3, 5, 8, 10, 12, 15, 17, 19, 22].includes(i + 3),
    });
  }
  return days;
}

interface Appointment {
  id: string;
  time: string;
  duration: string;
  patient: string;
  type: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes: string;
}

interface FollowUp {
  id: string;
  patient: string;
  dueDate: string;
  reason: string;
  notified: boolean;
}

const APPOINTMENTS: Record<string, Appointment[]> = {
  '20': [
    { id: 'a1', time: '9:00 AM', duration: '60 min', patient: 'Elena Rodriguez', type: 'Constitutional Assessment', status: 'confirmed', notes: 'First Ayurvedic evaluation' },
    { id: 'a2', time: '10:30 AM', duration: '30 min', patient: 'David Park', type: 'Formula Review', status: 'confirmed', notes: 'Check nervine tonic response' },
    { id: 'a3', time: '1:00 PM', duration: '45 min', patient: 'Fatima Al-Rashid', type: 'Digestive Protocol Follow-up', status: 'pending', notes: 'Bitters complex 4-week check' },
    { id: 'a4', time: '3:30 PM', duration: '90 min', patient: 'Oliver Chen', type: 'Initial Intake', status: 'confirmed', notes: 'New patient — full CAQ required' },
  ],
  '21': [
    { id: 'a5', time: '9:00 AM', duration: '60 min', patient: 'Sarah Mitchell', type: 'Hormone Panel Review', status: 'confirmed', notes: 'Lab results from ZRT' },
    { id: 'a6', time: '11:00 AM', duration: '45 min', patient: 'James O\'Brien', type: 'Botanical Consult', status: 'pending', notes: 'Requesting sleep support formula' },
  ],
  '23': [
    { id: 'a7', time: '10:00 AM', duration: '30 min', patient: 'Priya Patel', type: 'Follow-up', status: 'confirmed', notes: 'Adaptogen protocol check' },
    { id: 'a8', time: '2:00 PM', duration: '60 min', patient: 'Marcus Rivera', type: 'Genetic Review', status: 'confirmed', notes: 'CYP2D6 poor metabolizer dosing' },
  ],
};

const FOLLOW_UPS: FollowUp[] = [
  { id: 'f1', patient: 'Elena Rodriguez', dueDate: '2026-03-27', reason: '1-week post constitutional assessment', notified: false },
  { id: 'f2', patient: 'David Park', dueDate: '2026-04-01', reason: 'Nervine tonic 6-week evaluation', notified: true },
  { id: 'f3', patient: 'Fatima Al-Rashid', dueDate: '2026-04-05', reason: 'Digestive bitters protocol completion', notified: false },
  { id: 'f4', patient: 'Oliver Chen', dueDate: '2026-03-25', reason: 'Lab results review — initial bloodwork', notified: false },
];

const AVAILABLE_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

const STATUS_CONFIG = {
  confirmed: { bg: 'bg-sage/10', text: 'text-sage', dot: 'bg-sage' },
  pending: { bg: 'bg-copper/10', text: 'text-copper', dot: 'bg-copper' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function SchedulerScreen() {
  const calendar = generateCalendar();
  const [selectedDate, setSelectedDate] = useState(20);

  const dayAppointments = APPOINTMENTS[String(selectedDate)] ?? [];

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-plum text-sm font-semibold">Appointment Scheduler</Text>
        <Text className="text-white text-2xl font-bold">March 2026</Text>
      </View>

      {/* Calendar Strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2 py-2">
        <View className="flex-row gap-1">
          {calendar.map((d, i) => (
            <Pressable
              key={i}
              className={`w-14 py-2 rounded-xl items-center ${
                d.date === selectedDate
                  ? 'bg-plum'
                  : d.isToday
                    ? 'bg-white/10 border border-plum/50'
                    : 'bg-white/5'
              }`}
              onPress={() => setSelectedDate(d.date)}
            >
              <Text className={`text-[10px] ${d.date === selectedDate ? 'text-white' : 'text-dark-border'}`}>
                {d.day}
              </Text>
              <Text className={`text-lg font-bold ${d.date === selectedDate ? 'text-white' : 'text-white'}`}>
                {d.date}
              </Text>
              {d.hasAppt && (
                <View className={`w-1.5 h-1.5 rounded-full mt-0.5 ${d.date === selectedDate ? 'bg-white' : 'bg-plum'}`} />
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Day View */}
      <View className="px-4 mt-4">
        <Text className="text-white text-lg font-bold mb-3">
          {selectedDate === 20 ? 'Today' : `March ${selectedDate}`} — {dayAppointments.length} Appointments
        </Text>

        {dayAppointments.length === 0 ? (
          <View className="bg-white/5 rounded-2xl p-6 border border-white/10 items-center">
            <Text className="text-dark-border text-base mb-2">No appointments</Text>
            <Text className="text-dark-border text-xs">Available slots:</Text>
            <View className="flex-row flex-wrap gap-2 mt-2 justify-center">
              {AVAILABLE_SLOTS.map((slot) => (
                <Pressable key={slot} className="bg-plum/10 rounded-lg px-3 py-1.5 active:opacity-80">
                  <Text className="text-plum text-xs font-semibold">{slot}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          dayAppointments.map((appt) => {
            const status = STATUS_CONFIG[appt.status];
            return (
              <View key={appt.id} className="bg-white/5 rounded-2xl p-4 mb-3 border border-white/10">
                <View className="flex-row items-start">
                  {/* Time Column */}
                  <View className="w-16 mr-3">
                    <Text className="text-plum text-sm font-bold">{appt.time}</Text>
                    <Text className="text-dark-border text-[10px]">{appt.duration}</Text>
                  </View>

                  {/* Content */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-white font-bold">{appt.patient}</Text>
                      <View className={`flex-row items-center ${status.bg} rounded-full px-2 py-0.5`}>
                        <View className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1`} />
                        <Text className={`text-[10px] font-bold ${status.text}`}>{appt.status}</Text>
                      </View>
                    </View>
                    <Text className="text-sage text-xs mb-1">{appt.type}</Text>
                    <Text className="text-dark-border text-xs italic">{appt.notes}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Follow-Up Reminders */}
      <View className="px-4 mt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-lg font-bold">Follow-Up Reminders</Text>
          <View className="bg-copper/20 rounded-full px-2 py-0.5">
            <Text className="text-copper text-xs font-bold">{FOLLOW_UPS.filter((f) => !f.notified).length} pending</Text>
          </View>
        </View>

        {FOLLOW_UPS.map((followUp) => (
          <View key={followUp.id} className="bg-white/5 rounded-xl p-3 mb-2 border border-white/10">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white font-semibold text-sm">{followUp.patient}</Text>
              <View className="flex-row items-center">
                {followUp.notified ? (
                  <View className="bg-sage/20 rounded-full px-2 py-0.5">
                    <Text className="text-sage text-[10px] font-bold">Notified</Text>
                  </View>
                ) : (
                  <Pressable className="bg-plum rounded-lg px-2 py-1 active:opacity-80">
                    <Text className="text-white text-[10px] font-bold">Send Reminder</Text>
                  </Pressable>
                )}
              </View>
            </View>
            <Text className="text-dark-border text-xs">{followUp.reason}</Text>
            <Text className="text-plum text-[10px] mt-0.5">Due: {followUp.dueDate}</Text>
          </View>
        ))}
      </View>

      {/* New Appointment Button */}
      <View className="px-4 mt-4">
        <Pressable className="bg-plum rounded-xl py-3.5 items-center active:opacity-80">
          <Text className="text-white font-bold">+ Schedule New Appointment</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

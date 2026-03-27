import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, FlatList } from 'react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Swords, MessageCircle, Flame, Activity, Footprints, Pill, Salad, Dumbbell, Target, HeartHandshake } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { AnimatedProgressBar, StaggerItem } from '../../ui/animations';
import { HelixIcon } from './HelixIcon';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const PODIUM = [
  { rank: 2, name: 'Marcus T.', initials: 'MT', helix: 3920, color: '#C0C0C0' },
  { rank: 1, name: 'Sarah K.',  initials: 'SK', helix: 4280, color: '#FFD700' },
  { rank: 3, name: 'Mike R.',   initials: 'MR', helix: 2195, color: '#CD7F32' },
];

const RANKED = [
  { rank: 1, name: 'Sarah K.',   initials: 'SK', helix: 4280, color: '#FFD700', isYou: false },
  { rank: 2, name: 'You',        initials: 'GF', helix: 4350, color: '#2DA5A0', isYou: true },
  { rank: 3, name: 'Mike R.',    initials: 'MR', helix: 2195, color: '#CD7F32', isYou: false },
  { rank: 4, name: 'Jessica L.', initials: 'JL', helix: 2010, color: '#8B5CF6', isYou: false },
  { rank: 5, name: 'David T.',   initials: 'DT', helix: 1875, color: '#F472B6', isYou: false },
  { rank: 6, name: 'Amanda W.',  initials: 'AW', helix: 1640, color: '#2DA5A0', isYou: false },
  { rank: 7, name: 'Chris P.',   initials: 'CP', helix: 1520, color: '#B75E18', isYou: false },
];

interface ChatMsg {
  id: number;
  sender: string;
  text: string;
  time: string;
  isSent: boolean;
}

const INITIAL_MSGS: ChatMsg[] = [
  { id: 1, sender: 'Sarah K.',   text: 'Just hit 4K Helix this week! 🎉', time: '2:34 PM', isSent: false },
  { id: 2, sender: 'You',        text: "Nice! I'm right behind you 💪",   time: '2:35 PM', isSent: true },
  { id: 3, sender: 'Mike R.',    text: 'The steps challenge is brutal today', time: '2:36 PM', isSent: false },
  { id: 4, sender: 'You',        text: 'Already at 8K, pushing for 10K before lunch', time: '2:37 PM', isSent: true },
  { id: 5, sender: 'Jessica L.', text: 'Who else is doing the supplement streak?', time: '2:40 PM', isSent: false },
  { id: 6, sender: 'Sarah K.',   text: 'Day 12 for me! The 2x multiplier is 🔥', time: '2:41 PM', isSent: false },
];

const QUICK_REACTIONS = [
  { icon: Flame, text: "Let's go!" },
  { icon: Dumbbell, text: 'Crushing it!' },
  { icon: HeartHandshake, text: 'Great work!' },
  { icon: Footprints, text: 'Keep moving!' },
];

const CHALLENGES = [
  { type: 'steps',       title: '10K Steps Sprint',  helix: 500,  progress: 71, participants: 5 },
  { type: 'supplements', title: 'Perfect Protocol',  helix: 750,  progress: 43, participants: 3 },
  { type: 'nutrition',   title: 'Clean Plate Club',  helix: 600,  progress: 85, participants: 4 },
  { type: 'workout',     title: 'Iron Week',         helix: 800,  progress: 60, participants: 2 },
  { type: 'markers',     title: 'Biomarker Blitz',   helix: 900,  progress: 40, participants: 3 },
];

const CHALLENGE_ICONS: Record<string, any> = {
  steps: Footprints,
  supplements: Pill,
  nutrition: Salad,
  workout: Dumbbell,
  markers: Target,
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function AvatarCircle({
  initials,
  color,
  size = 40,
  rank,
}: {
  initials: string;
  color: string;
  size?: number;
  rank?: number;
}) {
  const rankColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '44',
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.32 }}>
          {initials}
        </Text>
      </View>
      {rank && rank <= 3 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: rankColors[rank],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{rank}</Text>
        </View>
      )}
    </View>
  );
}

function PodiumUser({ user }: { user: (typeof PODIUM)[0] }) {
  const heights: Record<number, number> = { 1: 80, 2: 60, 3: 50 };
  const medalColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(user.rank * 120).springify()}
      style={{ alignItems: 'center', flex: 1 }}
    >
      <AvatarCircle
        initials={user.initials}
        color={user.color}
        size={user.rank === 1 ? 56 : 44}
        rank={user.rank}
      />
      <Text className="text-[11px] font-bold text-white mt-1.5">{user.name}</Text>
      <View className="flex-row items-center mt-0.5">
        <HelixIcon size={10} />
        <Text className="text-[10px] font-extrabold text-white/50 ml-0.5">
          {user.helix.toLocaleString()}
        </Text>
      </View>
      <View
        style={{
          width: 48,
          height: heights[user.rank],
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          marginTop: 6,
          backgroundColor: medalColors[user.rank] + '22',
          borderTopWidth: 2,
          borderTopColor: medalColors[user.rank] + '66',
        }}
      />
    </Animated.View>
  );
}

function LeaderRow({ user, index, maxHelix }: { user: (typeof RANKED)[0]; index: number; maxHelix: number }) {
  const pct = (user.helix / maxHelix) * 100;
  return (
    <StaggerItem index={index} stagger={60}>
      <View
        className={`flex-row items-center p-3 rounded-xl mb-1.5 ${
          user.isYou ? 'bg-teal/10 border border-teal/20' : 'bg-white/[0.02]'
        }`}
      >
        <Text className="text-xs font-bold text-white/30 w-5 text-center">{user.rank}</Text>
        <View className="ml-2">
          <AvatarCircle initials={user.initials} color={user.color} size={32} rank={user.rank <= 3 ? user.rank : undefined} />
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center">
            <Text className="text-xs font-bold text-white">{user.name}</Text>
            {user.isYou && (
              <View className="ml-1.5 px-1.5 py-0.5 rounded bg-teal/20">
                <Text className="text-[8px] font-bold text-teal uppercase">YOU</Text>
              </View>
            )}
          </View>
          <View className="mt-1">
            <AnimatedProgressBar progress={pct} color="bg-teal" height="h-1" duration={1000} />
          </View>
        </View>
        <View className="flex-row items-center ml-2">
          <HelixIcon size={12} />
          <Text className="text-xs font-extrabold text-white ml-1">
            {user.helix.toLocaleString()}
          </Text>
        </View>
      </View>
    </StaggerItem>
  );
}

function ChatBubble({ msg }: { msg: ChatMsg }) {
  return (
    <View style={{ alignItems: msg.isSent ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      {!msg.isSent && (
        <Text className="text-[10px] font-bold text-copper mb-0.5 ml-1">{msg.sender}</Text>
      )}
      <View
        className={`px-3.5 py-2.5 max-w-[75%] ${
          msg.isSent
            ? 'bg-teal rounded-2xl rounded-br-sm'
            : 'bg-dark-surface border border-white/5 rounded-2xl rounded-bl-sm'
        }`}
      >
        <Text className={`text-[13px] ${msg.isSent ? 'text-white' : 'text-white/70'}`}>
          {msg.text}
        </Text>
      </View>
      <Text className="text-[9px] text-white/20 mt-0.5 mx-1">{msg.time}</Text>
    </View>
  );
}

function MiniChallengeCard({ ch, index }: { ch: (typeof CHALLENGES)[0]; index: number }) {
  const ChIcon = CHALLENGE_ICONS[ch.type];
  return (
    <StaggerItem index={index} stagger={60}>
      <GlassCard className="p-4 mr-3" style={{ width: 220 }}>
        <View className="flex-row items-center justify-between mb-2">
          <ChIcon size={28} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />
          <View className="flex-row items-center px-2 py-0.5 rounded-full bg-teal/15 border border-teal/25">
            <Activity size={10} strokeWidth={2} color="#2DA5A0" />
            <Text className="text-[9px] font-bold text-teal uppercase ml-1">LIVE</Text>
          </View>
        </View>
        <Text className="text-[14px] font-extrabold text-white mb-2">{ch.title}</Text>
        <AnimatedProgressBar progress={ch.progress} color="bg-teal" height="h-1.5" />
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-[10px] text-white/30">{ch.participants} joined</Text>
          <View className="flex-row items-center">
            <HelixIcon size={11} />
            <Text className="text-[11px] font-extrabold text-copper ml-0.5">
              {ch.helix.toLocaleString()}
            </Text>
          </View>
        </View>
      </GlassCard>
    </StaggerItem>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function HelixArena() {
  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MSGS);
  const [input, setInput] = useState('');
  const scrollRef = useRef<FlatList>(null);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'You',
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSent: true,
      },
    ]);
    setInput('');
  };

  // Chat scroll is manual — no auto-scroll

  return (
    <View>
      {/* Leaderboard */}
      <GlassCard className="p-5 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <View className="flex-row items-center">
              <Swords size={20} strokeWidth={1.5} color="#B75E18" />
              <Text className="text-lg font-extrabold text-copper ml-2">Weekly Arena</Text>
            </View>
            <Text className="text-[10px] text-white/30 font-semibold mt-0.5">Resets in 3d 14h</Text>
          </View>
          <View className="flex-row items-center">
            <Activity size={12} strokeWidth={2} color="#2DA5A0" />
            <Text className="text-[9px] font-bold text-teal uppercase tracking-wider ml-1.5">LIVE</Text>
          </View>
        </View>

        {/* Podium */}
        <View className="flex-row items-end justify-center mb-5">
          {PODIUM.map((u) => (
            <PodiumUser key={u.rank} user={u} />
          ))}
        </View>

        {/* Ranked list */}
        {RANKED.map((u, i) => (
          <LeaderRow key={u.rank} user={u} index={i} maxHelix={4350} />
        ))}
      </GlassCard>

      {/* Squad Chat */}
      <GlassCard className="p-5 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <MessageCircle size={20} strokeWidth={1.5} color="#B75E18" />
            <Text className="text-lg font-extrabold text-copper ml-2">Squad Chat</Text>
          </View>
          <View className="flex-row">
            {['SK', 'MR', 'JL'].map((init, i) => (
              <View
                key={init}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: ['#FFD700', '#CD7F32', '#8B5CF6'][i],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: i > 0 ? -8 : 0,
                  borderWidth: 2,
                  borderColor: '#111827',
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>{init}</Text>
              </View>
            ))}
          </View>
        </View>

        <FlatList
          ref={scrollRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <ChatBubble msg={item} />}
          style={{ height: 260 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <View className="flex-row items-center mt-3 gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            placeholder="Type a message..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[13px]"
            returnKeyType="send"
          />
          <Pressable
            onPress={() => sendMessage(input)}
            className="px-4 py-2.5 rounded-xl bg-teal"
          >
            <Text className="text-white text-sm font-bold">Send</Text>
          </Pressable>
        </View>

        {/* Quick reactions */}
        <View className="flex-row flex-wrap gap-2 mt-3">
          {QUICK_REACTIONS.map((r) => (
            <Pressable
              key={r.text}
              onPress={() => sendMessage(r.text)}
              className="flex-row items-center px-3 py-1.5 rounded-full bg-white/5 border border-white/5"
            >
              <r.icon size={12} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
              <Text className="text-[10px] font-semibold text-white/40 ml-1">{r.text}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      {/* Active Challenges */}
      <View className="flex-row items-center mb-3">
        <Flame size={20} strokeWidth={1.5} color="#B75E18" />
        <Text className="text-lg font-extrabold text-copper ml-2">Active Challenges</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        {CHALLENGES.map((ch, i) => (
          <MiniChallengeCard key={ch.title} ch={ch} index={i} />
        ))}
      </ScrollView>
    </View>
  );
}

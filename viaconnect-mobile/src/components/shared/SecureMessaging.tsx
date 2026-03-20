import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase/client';
import type { Notification } from '../../lib/supabase/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface SecureMessagingProps {
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  channelId: string; // unique conversation ID
}

// ── Component ────────────────────────────────────────────────────────────────

export function SecureMessaging({
  currentUserId,
  recipientId,
  recipientName,
  channelId,
}: SecureMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('notification_type', `chat:${channelId}`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        setMessages(
          (data as Notification[]).map((d) => ({
            id: d.id,
            senderId: d.user_id,
            content: d.message ?? '',
            createdAt: d.created_at ?? '',
            readAt: d.read ? d.created_at : null,
          })),
        );
      }
    };
    loadMessages();
  }, [channelId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `notification_type=eq.chat:${channelId}`,
        },
        (payload) => {
          const d = payload.new as Record<string, unknown>;
          const msg: Message = {
            id: String(d.id),
            senderId: String(d.user_id),
            content: String(d.message ?? ''),
            createdAt: String(d.created_at ?? ''),
            readAt: null,
          };
          setMessages((prev) => [...prev, msg]);
        },
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== currentUserId) {
          setIsTyping(true);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, currentUserId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isSending) return;
    setIsSending(true);

    try {
      await supabase.from('notifications').insert({
        user_id: currentUserId,
        notification_type: `chat:${channelId}`,
        title: `Message from ${currentUserId}`,
        message: input.trim(),
        read: false,
      });
      setInput('');
    } catch {
      // Handle error silently
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, currentUserId, channelId]);

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      // Broadcast typing indicator
      supabase.channel(`chat:${channelId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId },
      });
    },
    [channelId, currentUserId],
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === currentUserId;
    return (
      <Animated.View
        entering={FadeInDown.duration(200)}
        className={`mb-2 ${isMine ? 'items-end' : 'items-start'}`}
      >
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
            isMine ? 'bg-teal rounded-br-sm' : 'bg-dark-card border border-dark-border rounded-bl-sm'
          }`}
        >
          <Text className="text-white text-sm">{item.content}</Text>
          <View className="flex-row items-center justify-end mt-0.5 gap-1">
            <Text className="text-dark-border text-[10px]">
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMine && item.readAt && <Text className="text-teal-light text-[10px]">✓✓</Text>}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View className="px-4 py-3 border-b border-dark-border flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-teal items-center justify-center mr-3">
          <Text className="text-white font-bold">{recipientName.charAt(0)}</Text>
        </View>
        <View>
          <Text className="text-white font-semibold">{recipientName}</Text>
          {isTyping && <Text className="text-sage text-xs">typing...</Text>}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerClassName="px-4 py-4"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text className="text-dark-border text-center py-12">
            Start a secure conversation
          </Text>
        }
      />

      {/* Input */}
      <View className="flex-row items-end px-4 py-3 border-t border-dark-border gap-2">
        <TextInput
          className="flex-1 bg-dark-card border border-dark-border rounded-2xl px-4 py-2.5 text-white max-h-[100px]"
          placeholder="Type a message..."
          placeholderTextColor="#374151"
          value={input}
          onChangeText={handleInputChange}
          multiline
          accessibilityLabel="Message input"
        />
        <Pressable
          className={`w-11 h-11 rounded-full items-center justify-center ${
            input.trim() ? 'bg-copper' : 'bg-dark-border'
          } active:opacity-80`}
          onPress={sendMessage}
          disabled={!input.trim() || isSending}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          <Text className="text-white text-lg">↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

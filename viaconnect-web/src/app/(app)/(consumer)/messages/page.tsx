"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message as MessageRow } from "@/lib/supabase/types";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import toast from "react-hot-toast";
import {
  MessageSquare,
  Send,
  Search,
} from "lucide-react";

const supabase = createClient();

export default function MessagesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  type ConversationWithProfile = Conversation & { otherName: string; otherAvatar: string | null };

  // Conversations
  const { data: conversations, isLoading: convoLoading } = useQuery({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`patient_id.eq.${userId},practitioner_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      const rows = (data ?? []) as Conversation[];
      if (rows.length === 0) return [] as ConversationWithProfile[];

      // Get practitioner profiles
      const practitionerIds = rows.map((c) =>
        c.patient_id === userId ? c.practitioner_id : c.patient_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", practitionerIds);

      const profileMap = new Map(
        ((profiles ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[])
          .map((p) => [p.id, p])
      );

      return rows.map((c): ConversationWithProfile => {
        const otherId = c.patient_id === userId ? c.practitioner_id : c.patient_id;
        const profile = profileMap.get(otherId);
        return { ...c, otherName: profile?.full_name ?? "Unknown", otherAvatar: profile?.avatar_url ?? null };
      });
    },
    enabled: !!userId,
  });

  // Messages for active conversation
  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", activeConversation],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversation!)
        .order("created_at", { ascending: true });
      return (data ?? []) as MessageRow[];
    },
    enabled: !!activeConversation,
    refetchInterval: 3000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel(`messages:${activeConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversation}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", activeConversation] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, queryClient]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!activeConversation || !userId || !messages) return;
    const unread = messages.filter((m: MessageRow) => m.sender_id !== userId && !m.read);
    if (unread.length > 0) {
      supabase
        .from("messages")
        .update({ read: true })
        .in("id", unread.map((m: MessageRow) => m.id))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        });
    }
  }, [messages, activeConversation, userId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConversation!,
        sender_id: userId!,
        content,
      });
      if (error) throw error;

      // Update conversation's last message
      await supabase
        .from("conversations")
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", activeConversation!);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeConversation] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Message sent");
    },
    onError: () => toast.error("Failed to send message"),
  });

  const handleSend = useCallback(() => {
    const content = newMessage.trim();
    if (!content || !activeConversation) return;
    sendMessage.mutate(content);
  }, [newMessage, activeConversation, sendMessage]);

  const activeConvo = (conversations ?? []).find((c: ConversationWithProfile) => c.id === activeConversation);

  const filteredConvos = (conversations ?? []).filter((c) =>
    !searchQuery || c.otherName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Secure Messaging</h1>
        <p className="text-gray-400 text-sm mt-1">
          HIPAA-compliant communication with your practitioner
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 h-[calc(100vh-220px)] min-h-[500px]">
        {/* LEFT: Conversation List */}
        <div className="border-r border-white/[0.06] flex flex-col bg-white/[0.01] rounded-l-xl overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-gray-600 bg-white/[0.04] border border-white/[0.08] focus:border-copper/50 outline-none"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {convoLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No conversations yet</p>
                <p className="text-xs text-gray-600 mt-1">
                  Connect with a practitioner to start messaging
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConvos.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => setActiveConversation(convo.id)}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      activeConversation === convo.id
                        ? "bg-white/[0.06] border border-copper/20"
                        : "hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={convo.otherAvatar}
                        fallback={convo.otherName?.charAt(0) ?? "?"}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white truncate">
                            {convo.otherName}
                          </p>
                          {convo.last_message_at && (
                            <span className="text-[10px] text-gray-600">
                              {new Date(convo.last_message_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {convo.last_message ?? "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Chat Area */}
        <div className="flex flex-col bg-white/[0.01] rounded-r-xl overflow-hidden">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a conversation from the sidebar to start messaging."
              />
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={activeConvo?.otherAvatar}
                    fallback={activeConvo?.otherName?.charAt(0) ?? "?"}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {activeConvo?.otherName ?? "Practitioner"}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {typing ? (
                        <span className="text-portal-green">Typing...</span>
                      ) : (
                        "Online"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {msgsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        className={`h-12 ${i % 2 === 0 ? "w-2/3 ml-auto" : "w-2/3"}`}
                      />
                    ))}
                  </div>
                ) : (messages ?? []).length === 0 ? (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">
                      No messages yet. Send the first message below.
                    </p>
                  </div>
                ) : (
                  (messages ?? []).map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? "bg-copper/20 border border-copper/20 rounded-br-md"
                              : "bg-white/[0.04] border border-white/[0.06] rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-copper/60" : "text-gray-600"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1 h-10 px-4 rounded-xl text-sm text-white placeholder:text-gray-600 bg-white/[0.04] border border-white/[0.08] focus:border-copper/50 focus:ring-1 focus:ring-copper/20 outline-none"
                  />
                  <Button
                    size="md"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMessage.isPending}
                    className="rounded-xl"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

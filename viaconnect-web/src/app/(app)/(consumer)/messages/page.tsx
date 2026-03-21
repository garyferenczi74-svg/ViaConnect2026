import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function MessagesPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-copper hover:underline"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">
            Secure Messaging
          </h1>
          <p className="text-gray-400 mt-2">
            Communicate with your practitioner through encrypted, HIPAA-compliant
            messaging.
          </p>
        </div>

        {/* Thread list + chat area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
          {/* Thread list */}
          <div className="glass rounded-2xl p-4 border border-dark-border md:col-span-1">
            <h3 className="text-sm font-semibold text-white mb-4 px-2">
              Conversations
            </h3>
            <div className="space-y-2">
              <div className="rounded-xl p-3 bg-dark-surface border border-dark-border">
                <p className="text-white text-sm font-medium">
                  No practitioners connected
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Connect with a practitioner to start messaging
                </p>
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="glass rounded-2xl p-6 border border-dark-border md:col-span-2 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-dark-surface border border-dark-border flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-semibold">
                No active conversations
              </h3>
              <p className="text-gray-400 text-sm mt-2 max-w-xs">
                Select a conversation from the sidebar or connect with a
                practitioner to begin secure messaging.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';

interface MessageBubbleProps {
  text: string;
  sender: string;
  timestamp: string;
  isSent: boolean;
  index?: number;
}

export function MessageBubble({ text, sender, timestamp, isSent, index = 0 }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-2.5`}
    >
      <div className={`max-w-[75%] ${isSent ? 'items-end' : 'items-start'}`}>
        {!isSent && (
          <span className="text-[10px] font-bold text-[#B75E18] mb-0.5 block">{sender}</span>
        )}
        <div
          className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isSent
              ? 'bg-gradient-to-r from-[#2DA5A0] to-[#35bdb7] text-white rounded-2xl rounded-br-md'
              : 'bg-[rgba(26,39,68,0.7)] border border-white/[0.06] text-white/80 rounded-2xl rounded-bl-md'
          }`}
        >
          {text}
        </div>
        <span className="text-[9px] text-white/25 mt-0.5 block">{timestamp}</span>
      </div>
    </motion.div>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ReferralCodeProps {
  code: string;
}

export function ReferralCode({ code }: ReferralCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      onClick={handleCopy}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
      className="relative cursor-pointer rounded-2xl border-2 border-dashed border-white/20 p-6 text-center hover:border-[#B75E18]/40 transition-colors"
    >
      <p className="font-mono text-2xl font-extrabold tracking-wider bg-gradient-to-r from-[#B75E18] to-[#FFD700] bg-clip-text text-transparent">
        {code}
      </p>
      <p className="text-[11px] text-white/35 mt-2 font-semibold uppercase tracking-wider">
        {copied ? 'Copied to clipboard!' : 'Tap to copy referral code'}
      </p>
    </motion.div>
  );
}

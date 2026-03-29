"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CAQ_INTERSTITIALS } from "@/config/caq-interstitials";

function BackgroundLayer({ background }: { background: typeof CAQ_INTERSTITIALS[0]["background"] }) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  return (
    <div className="absolute inset-0 z-0">
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{ background: background.fallbackGradient, backgroundSize: "400% 400%" }}
      />
      {background.type === "video" && background.src && !videoError && (
        <video
          autoPlay muted loop playsInline preload="auto" aria-hidden="true"
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
        >
          <source src={background.src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

export function WelcomeDashboardScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const config = CAQ_INTERSTITIALS.find((i) => i.id === "welcome-dashboard")!;

  useEffect(() => {
    async function fetchName() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || "";
        setFirstName(name.split(" ")[0] || "");
      }
    }
    fetchName();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      <BackgroundLayer background={config.background} />
      <div className="absolute inset-0 bg-black z-[1]" style={{ opacity: config.background.overlayOpacity }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow w-full max-w-lg mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, ease: "easeOut", delay: 0.3 }}
        >
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-sm uppercase tracking-[0.25em] text-teal-400/80 mb-4"
          >
            Welcome to ViaConnect&trade;
          </motion.p>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-light text-white leading-tight mb-4">
            Your Journey Starts Here
            {firstName && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                className="block text-teal-400 font-medium mt-2"
              >
                {firstName}
              </motion.span>
            )}
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="text-base text-white/50 mt-6 max-w-sm mx-auto"
          >
            Your personalized wellness dashboard is ready. Let&apos;s start optimizing.
          </motion.p>
        </motion.div>

        {/* Animated checkmarks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="mt-10 space-y-3"
        >
          {[
            "Health profile analyzed",
            "Bio Optimization Score calculated",
            "AI protocols generated",
            "Dashboard personalized",
          ].map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.0 + i * 0.2, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-teal-400/20 border border-teal-400/40 flex items-center justify-center">
                <svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-white/60">{item}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Enter Dashboard Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 3.0 }}
        className="relative z-10 w-full max-w-lg mx-auto px-6 pb-12"
      >
        <button
          onClick={() => { router.push("/dashboard"); router.refresh(); }}
          className="w-full py-4 rounded-full bg-gradient-to-r from-[#2DA5A0] to-[#38BDB6] text-white font-semibold text-base shadow-lg shadow-teal-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          Enter Your Dashboard &rarr;
        </button>
      </motion.div>
    </div>
  );
}

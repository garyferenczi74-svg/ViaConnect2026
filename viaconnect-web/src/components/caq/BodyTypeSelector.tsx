"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Info, User, Dumbbell, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BodyTypeOption {
  id: "ectomorph" | "mesomorph" | "endomorph";
  label: string;
  hex: string;
  icon: LucideIcon;
  description: string;
  traits: string[];
  ultrathinkNote: string;
}

const BODY_TYPES: BodyTypeOption[] = [
  {
    id: "ectomorph",
    label: "Ectomorph / Hardgainer",
    hex: "#2DA5A0",
    icon: User,
    description: "Narrow frame, fast metabolism, naturally lean. Gaining weight and muscle has always been a challenge. You burn through calories quickly.",
    traits: [
      "Narrow shoulders and hips",
      "Fast metabolism, burns calories easily",
      "Difficulty gaining weight or muscle",
      "Long limbs relative to torso",
      "Low body fat even without trying",
    ],
    ultrathinkNote: "Ultrathink will prioritize calorie-dense nutrition, mitochondrial energy optimization, and HPA axis recovery to support your body's ability to build and retain mass.",
  },
  {
    id: "mesomorph",
    label: "Mesomorph / Athletic Frame",
    hex: "#60A5FA",
    icon: Dumbbell,
    description: "Naturally muscular frame with broader shoulders. You can gain muscle relatively easily, but you may be currently underweight, possibly from stress, illness, or lifestyle changes.",
    traits: [
      "Medium to broad bone structure",
      "Naturally muscular when active",
      "Gains muscle easier than ectomorphs",
      "Currently underweight due to circumstances",
      "Responds well to training + nutrition",
    ],
    ultrathinkNote: "Ultrathink will focus on recovery optimization, protein synthesis support, and identifying what caused the weight loss (stress, illness, or lifestyle) to address the root pattern.",
  },
  {
    id: "endomorph",
    label: "Endomorph / Softer Frame",
    hex: "#FBBF24",
    icon: Circle,
    description: "Wider bone structure with a tendency to store fat more easily. Being underweight despite this frame type often signals metabolic, hormonal, or health related causes worth investigating.",
    traits: [
      "Wider hips and/or shoulders",
      "Naturally tends to store fat",
      "Underweight despite frame = possible health signal",
      "May indicate metabolic or hormonal pattern",
      "Recovery approach differs from hardgainers",
    ],
    ultrathinkNote: "Ultrathink will investigate potential metabolic, hormonal, or stress related causes for being underweight with this frame type. This combination often reveals important master patterns.",
  },
];

interface BodyTypeSelectorProps {
  value: string | null;
  onChange: (bodyType: string) => void;
}

export function BodyTypeSelector({ value, onChange }: BodyTypeSelectorProps) {
  const selectedType = BODY_TYPES.find((t) => t.id === value);

  return (
    <div className="space-y-4 pt-2">
      {/* Section header */}
      <div>
        <h3 className="text-sm font-semibold text-white">
          What best describes your natural body frame?
        </h3>
        <p className="text-xs text-white/30 mt-1 leading-relaxed">
          This helps Ultrathink personalize your nutrition, supplement, and wellness
          recommendations for healthy weight optimization. There&apos;s no wrong answer,
          choose what feels closest to your natural build.
        </p>
      </div>

      {/* 3 Body Type Cards — using simple table-like layout for guaranteed alignment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "start" }} className="sm:grid hidden">
        {BODY_TYPES.map((type) => {
          const isSelected = value === type.id;
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                padding: "20px",
                borderRadius: "12px",
                textAlign: "left" as const,
                border: `2px solid ${isSelected ? `${type.hex}66` : "rgba(255,255,255,0.08)"}`,
                backgroundColor: isSelected ? `${type.hex}1A` : "rgba(255,255,255,0.02)",
                boxShadow: isSelected ? `0 0 30px ${type.hex}15` : "none",
                transition: "all 0.3s",
                position: "relative" as const,
                cursor: "pointer",
              }}
            >
              {/* Selected dot */}
              {isSelected && (
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  width: 24, height: 24, borderRadius: "50%",
                  backgroundColor: `${type.hex}33`, border: `1px solid ${type.hex}66`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: type.hex }} />
                </div>
              )}

              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: isSelected ? `${type.hex}26` : "rgba(255,255,255,0.05)",
                border: `1px solid ${isSelected ? `${type.hex}33` : "rgba(255,255,255,0.08)"}`,
              }}>
                <Icon style={{ width: 24, height: 24, color: isSelected ? type.hex : "rgba(255,255,255,0.3)" }} strokeWidth={1.5} />
              </div>

              {/* Spacer */}
              <div style={{ height: 16 }} />

              {/* Label */}
              <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? "#fff" : "rgba(255,255,255,0.6)" }}>
                {type.label}
              </div>

              {/* Spacer */}
              <div style={{ height: 4 }} />

              {/* Description */}
              <div style={{ fontSize: 12, lineHeight: 1.6, color: isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}>
                {type.description}
              </div>

              {/* Expanded traits */}
              {isSelected && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", width: "100%" }}>
                  {type.traits.map((trait, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: `${type.hex}99`, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{trait}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {BODY_TYPES.map((type) => {
          const isSelected = value === type.id;
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              className="rounded-xl p-5 text-left transition-all duration-300"
              style={{
                border: `2px solid ${isSelected ? `${type.hex}66` : "rgba(255,255,255,0.08)"}`,
                backgroundColor: isSelected ? `${type.hex}1A` : "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                  backgroundColor: isSelected ? `${type.hex}26` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isSelected ? `${type.hex}33` : "rgba(255,255,255,0.08)"}`,
                }}>
                  <Icon style={{ width: 20, height: 20, color: isSelected ? type.hex : "rgba(255,255,255,0.3)" }} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: isSelected ? "#fff" : "rgba(255,255,255,0.6)" }}>{type.label}</h4>
                  <p style={{ fontSize: 12, color: isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)", marginTop: 2 }}>{type.description}</p>
                </div>
              </div>
              {isSelected && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {type.traits.map((trait, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: `${type.hex}99`, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{trait}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Ultrathink explanation below all three cards */}
      <AnimatePresence>
        {selectedType && (
          <motion.div
            key={selectedType.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl p-4"
            style={{ backgroundColor: `${selectedType.hex}0D`, border: `1px solid ${selectedType.hex}1A` }}
          >
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 6 }}>
              How Ultrathink uses this
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              {selectedType.ultrathinkNote}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper text */}
      <div className="flex items-center gap-2 mt-2">
        <Info className="w-3.5 h-3.5 text-white/15" strokeWidth={1.5} />
        <p className="text-[10px] text-white/15">
          Not sure? Choose the one that feels closest. Your CAQ answers will help
          Ultrathink refine the picture regardless of which you pick.
        </p>
      </div>
    </div>
  );
}

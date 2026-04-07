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
    traits: ["Narrow shoulders and hips", "Fast metabolism, burns calories easily", "Difficulty gaining weight or muscle", "Long limbs relative to torso", "Low body fat even without trying"],
    ultrathinkNote: "Ultrathink will prioritize calorie-dense nutrition, mitochondrial energy optimization, and HPA axis recovery to support your body's ability to build and retain mass.",
  },
  {
    id: "mesomorph",
    label: "Mesomorph / Athletic Frame",
    hex: "#60A5FA",
    icon: Dumbbell,
    description: "Naturally muscular frame with broader shoulders. You can gain muscle relatively easily, but you may be currently under or overweight, possibly from stress, illness, or lifestyle changes.",
    traits: ["Medium to broad bone structure", "Naturally muscular when active", "Gains muscle easier than ectomorphs", "Currently underweight due to circumstances", "Responds well to training + nutrition"],
    ultrathinkNote: "Ultrathink will focus on recovery optimization, protein synthesis support, and identifying what caused the weight loss (stress, illness, or lifestyle) to address the root pattern.",
  },
  {
    id: "endomorph",
    label: "Endomorph / Softer Frame",
    hex: "#FBBF24",
    icon: Circle,
    description: "Wider bone structure with a tendency to store fat more easily. Being underweight despite this frame type often signals metabolic, hormonal, or health related causes worth investigating.",
    traits: ["Wider hips and/or shoulders", "Naturally tends to store fat", "Underweight despite frame = possible health signal", "May indicate metabolic or hormonal pattern", "Recovery approach differs from hardgainers"],
    ultrathinkNote: "Ultrathink will investigate potential metabolic, hormonal, or stress related causes for being underweight with this frame type. This combination often reveals important master patterns.",
  },
];

function BodyTypeCard({ type, isSelected, onSelect }: { type: BodyTypeOption; isSelected: boolean; onSelect: () => void }) {
  const Icon = type.icon;
  return (
    <div role="button" tabIndex={0} onClick={onSelect} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      className="rounded-xl p-5 text-left transition-all duration-300 w-full cursor-pointer" style={{
      border: `2px solid ${isSelected ? `${type.hex}66` : "rgba(255,255,255,0.08)"}`,
      backgroundColor: isSelected ? `${type.hex}1A` : "rgba(255,255,255,0.02)",
      boxShadow: isSelected ? `0 0 30px ${type.hex}15` : "none",
      position: "relative",
    }}>
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${type.hex}33`, border: `1px solid ${type.hex}66` }}>
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.hex }} />
        </div>
      )}
      <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{
        backgroundColor: isSelected ? `${type.hex}26` : "rgba(255,255,255,0.05)",
        border: `1px solid ${isSelected ? `${type.hex}33` : "rgba(255,255,255,0.08)"}`,
      }}>
        <Icon className="w-6 h-6" style={{ color: isSelected ? type.hex : "rgba(255,255,255,0.3)" }} strokeWidth={1.5} />
      </div>
      <div className="h-4" />
      <h4 className="text-sm font-bold" style={{ color: isSelected ? "#fff" : "rgba(255,255,255,0.6)" }}>{type.label}</h4>
      <div className="h-1" />
      <p className="text-xs leading-relaxed min-h-[60px]" style={{ color: isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}>{type.description}</p>
      {isSelected && (
        <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 w-full">
          {type.traits.map((trait, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: `${type.hex}99` }} />
              <span className="text-[11px] text-white/35">{trait}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BodyTypeSelector({ value, onChange }: { value: string | null; onChange: (bodyType: string) => void }) {
  const selectedType = BODY_TYPES.find((t) => t.id === value);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h3 className="text-sm font-semibold text-white">What best describes your natural body frame?</h3>
        <p className="text-xs text-white/30 mt-1 leading-relaxed">
          This helps Ultrathink personalize your nutrition, supplement, and wellness recommendations. There&apos;s no wrong answer, choose what feels closest to your natural build.
        </p>
      </div>

      {/* Desktop: 3 columns using CSS table for bulletproof top alignment */}
      <div className="hidden sm:block">
        <table className="w-full border-separate" style={{ borderSpacing: "12px 0" }}>
          <tbody>
            <tr className="align-top">
              {BODY_TYPES.map((type) => (
                <td key={type.id} className="align-top w-1/3 p-0">
                  <BodyTypeCard type={type} isSelected={value === type.id} onSelect={() => onChange(type.id)} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked */}
      <div className="flex flex-col gap-3 sm:hidden">
        {BODY_TYPES.map((type) => (
          <BodyTypeCard key={type.id} type={type} isSelected={value === type.id} onSelect={() => onChange(type.id)} />
        ))}
      </div>

      {/* Ultrathink explanation */}
      <AnimatePresence>
        {selectedType && (
          <motion.div key={selectedType.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}
            className="rounded-xl p-4" style={{ backgroundColor: `${selectedType.hex}0D`, border: `1px solid ${selectedType.hex}1A` }}>
            <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-1.5">How Ultrathink uses this</p>
            <p className="text-xs text-white/40 leading-relaxed">{selectedType.ultrathinkNote}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mt-2">
        <Info className="w-3.5 h-3.5 text-white/15" strokeWidth={1.5} />
        <p className="text-[10px] text-white/15">Not sure? Choose the one that feels closest. Your CAQ answers will help Ultrathink refine the picture regardless of which you pick.</p>
      </div>
    </div>
  );
}

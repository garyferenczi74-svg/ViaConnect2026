'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Info, FlaskConical, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONSUMER_OPEN_PILL_BASE, CONSUMER_OPEN_PILL_LINK } from '@/lib/ui/consumerChrome';

export interface IngredientRow {
  ingredient: string;
  mg: number | string;
}

// Accepts either a bare array or { total_mg, ingredients: [...] }
export type FormulationData =
  | IngredientRow[]
  | { total_mg?: number; ingredients: IngredientRow[] }
  | null
  | undefined;

interface ProductInfoButtonsProps {
  description: string | null | undefined;
  formulationJson: FormulationData;
  deliveryForm?: string | null;
}

type Panel = 'description' | 'formulation' | null;

const CARD_PILL_LAYOUT =
  'w-full min-w-[9.75rem] flex-1 basis-[9.75rem] justify-center gap-1.5 whitespace-nowrap';

const ACTIVE_PILL =
  'border-[#5B8DEF]/70 bg-[#2A4C9E]/30 text-white transition-all duration-200 hover:border-[#5B8DEF]/70 hover:bg-[#2A4C9E]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none';

const PANEL_GLASS = 'rounded-xl border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-2.5 mt-0.5';

function infoPillClass(active: boolean): string {
  return cn(active ? CONSUMER_OPEN_PILL_BASE : CONSUMER_OPEN_PILL_LINK, CARD_PILL_LAYOUT, active && ACTIVE_PILL);
}

function normalizeFormulation(data: FormulationData): { ingredients: IngredientRow[]; totalMg: number | null } {
  if (!data) return { ingredients: [], totalMg: null };
  if (Array.isArray(data)) {
    const total = data.reduce((sum, r) => sum + (typeof r.mg === 'number' ? r.mg : 0), 0);
    return { ingredients: data, totalMg: total };
  }
  return {
    ingredients: data.ingredients ?? [],
    totalMg: typeof data.total_mg === 'number' ? data.total_mg : null,
  };
}

function InfoPanel({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IngredientLine({ ingredient, mg }: { ingredient: string; mg: number | string }) {
  const mgDisplay = typeof mg === 'number' ? `${mg} mg` : String(mg);
  const isLiposomal = ingredient.toLowerCase().startsWith('liposomal');
  const isMicellar = ingredient.toLowerCase().startsWith('micellar');
  const cleanName = ingredient.replace(/^Liposomal\s+/i, '').replace(/^Micellar\s+/i, '');

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-b-0">
      {(isLiposomal || isMicellar) && (
        <span className={`text-[9px] font-semibold px-1 py-0.5 rounded flex-shrink-0 ${
          isLiposomal
            ? 'bg-[rgba(45,165,160,0.15)] text-[#2DA5A0]'
            : 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA]'
        }`}>
          {isLiposomal ? 'LIP' : 'MIC'}
        </span>
      )}
      <span className="flex-1 text-xs leading-snug text-[rgba(255,255,255,0.65)] truncate">
        {isLiposomal || isMicellar ? cleanName : ingredient}
      </span>
      <span className="text-xs font-medium flex-shrink-0 text-[rgba(255,255,255,0.55)]">
        {mgDisplay}
      </span>
    </div>
  );
}

function InfoPillButton({
  active,
  label,
  icon: Icon,
  onClick,
  reduceMotion,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      className={infoPillClass(active)}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-white/80" strokeWidth={1.5} aria-hidden />
      <span>{label}</span>
      <motion.span
        className="inline-flex motion-reduce:transition-none"
        animate={{ rotate: active ? 90 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      </motion.span>
    </motion.button>
  );
}

export function ProductInfoButtons({ description, formulationJson, deliveryForm }: ProductInfoButtonsProps) {
  const [openPanel, setOpenPanel] = useState<Panel>(null);
  const shouldReduceMotion = useReducedMotion();

  const { ingredients, totalMg } = normalizeFormulation(formulationJson);
  const hasDescription = !!description;
  const hasFormulation = ingredients.length > 0;

  if (!hasDescription && !hasFormulation) return null;

  const toggle = (panel: Exclude<Panel, null>) => {
    setOpenPanel(prev => (prev === panel ? null : panel));
  };

  return (
    <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Button row */}
      <div className="flex flex-wrap gap-2">
        {hasDescription && (
          <InfoPillButton
            active={openPanel === 'description'}
            label="Description"
            icon={Info}
            onClick={() => toggle('description')}
            reduceMotion={shouldReduceMotion}
          />
        )}
        {hasFormulation && (
          <InfoPillButton
            active={openPanel === 'formulation'}
            label="Formulation"
            icon={FlaskConical}
            onClick={() => toggle('formulation')}
            reduceMotion={shouldReduceMotion}
          />
        )}
      </div>

      {/* Description panel */}
      <InfoPanel isOpen={openPanel === 'description'}>
        <div className={PANEL_GLASS}>
          {deliveryForm && (
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] border border-[rgba(45,165,160,0.25)]">
              {deliveryForm}
            </span>
          )}
          <p className="text-xs text-[rgba(255,255,255,0.70)] leading-relaxed">{description}</p>
          <p className="text-[10px] text-[rgba(45,165,160,0.80)] mt-2 font-medium">
            FarmCeutica dual delivery · Maximum Bioavailability
          </p>
        </div>
      </InfoPanel>

      {/* Formulation panel */}
      <InfoPanel isOpen={openPanel === 'formulation'}>
        <div className={PANEL_GLASS}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[rgba(45,165,160,0.15)] text-[#2DA5A0]">LIP</span>
            <span className="text-[9px] text-[rgba(255,255,255,0.35)]">Liposomal</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] ml-1">MIC</span>
            <span className="text-[9px] text-[rgba(255,255,255,0.35)]">Micellar</span>
          </div>

          <div className="max-h-64 overflow-y-auto pr-1">
            {ingredients.map((row, i) => (
              <IngredientLine key={i} ingredient={row.ingredient} mg={row.mg} />
            ))}
          </div>

          {totalMg != null && (
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[rgba(45,165,160,0.25)]">
              <span className="text-xs font-semibold text-[#2DA5A0]">Total per serving</span>
              <span className="text-xs font-semibold text-[#2DA5A0]">{totalMg} mg</span>
            </div>
          )}

          <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-2">
            MG per serving · FarmCeutica Master Formulation Doc
          </p>
        </div>
      </InfoPanel>
    </div>
  );
}

import { ShieldCheck, ShieldAlert, Loader2, ShieldOff } from "lucide-react";

export default function SessionStatusPill({ status }: { status: string }) {
  const styles: Record<string, { tone: string; Icon: React.ElementType; label: string }> = {
    initiated:           { tone: "bg-white/10 text-white/60", Icon: Loader2, label: "Initiated" },
    normalizing:         { tone: "bg-white/10 text-white/60", Icon: Loader2, label: "Normalizing" },
    evaluating:          { tone: "bg-blue-500/15 text-blue-300", Icon: Loader2, label: "Evaluating" },
    findings_presented:  { tone: "bg-amber-500/15 text-amber-300", Icon: ShieldAlert, label: "Findings" },
    remediation:         { tone: "bg-amber-500/15 text-amber-300", Icon: ShieldAlert, label: "Remediating" },
    final_evaluation:    { tone: "bg-blue-500/15 text-blue-300", Icon: Loader2, label: "Final evaluation" },
    cleared:             { tone: "bg-emerald-500/15 text-emerald-300", Icon: ShieldCheck, label: "Cleared" },
    not_cleared:         { tone: "bg-red-500/15 text-red-400", Icon: ShieldOff, label: "Not cleared" },
    closed:              { tone: "bg-white/10 text-white/50", Icon: ShieldOff, label: "Closed" },
    errored:             { tone: "bg-red-500/15 text-red-400", Icon: ShieldOff, label: "Errored" },
  };
  const s = styles[status] ?? styles.initiated;
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.tone}`}>
      <Icon className="w-3 h-3" strokeWidth={1.5} /> {s.label}
    </span>
  );
}

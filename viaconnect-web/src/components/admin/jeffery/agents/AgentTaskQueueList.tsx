import { ListOrdered } from "lucide-react";
import type { AgentCurrentTask } from "@/lib/agents/types";

export default function AgentTaskQueueList({ tasks }: { tasks: AgentCurrentTask[] }) {
  const queue = tasks
    .filter((t) => t.task_status === "queued" || t.task_status === "blocked")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListOrdered className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Queue</h3>
        <span className="text-[10px] text-white/40 ml-auto">{queue.length} queued</span>
      </div>
      {queue.length === 0 ? (
        <p className="text-xs text-white/40">No pending tasks.</p>
      ) : (
        <ul className="space-y-2">
          {queue.slice(0, 10).map((t) => (
            <li key={t.id} className="bg-[#0F172A] rounded-lg p-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70 uppercase">
                  {t.task_status}
                </span>
                <span className="text-[10px] text-white/40 uppercase">{t.priority}</span>
                <span className="text-[10px] text-white/30 ml-auto">{new Date(t.updated_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-white/80 mt-1">{t.task_title}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ConstitutionalAxis } from "@/data/assessment";

interface ConstitutionalTypingProps {
  data: ConstitutionalAxis[];
  constitutionalType: string;
}

export default function ConstitutionalTyping({ data, constitutionalType }: ConstitutionalTypingProps) {
  return (
    <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-[#dce2f7]/60 text-xs uppercase tracking-widest font-medium">
            Constitutional Profile
          </h3>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl font-bold text-[#dce2f7]">Bio-Architectural Type</span>
            <span className="bg-[#a40217]/20 text-[#ffb3ad] px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-[#ffb3ad]/20">
              {constitutionalType}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-[#dce2f7]/40 uppercase">Last Sync</span>
          <div className="text-xs text-[#dce2f7]">03.15.2026 / 09:12</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-12">
        {/* Radar Chart */}
        <div className="w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke="rgba(134, 148, 134, 0.2)" strokeDasharray="0" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "#dce2f7", fontSize: 10, fontFamily: "monospace" }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Constitution"
                dataKey="value"
                stroke="#6bfb9a"
                strokeWidth={2}
                fill="#6bfb9a"
                fillOpacity={0.2}
                dot={{ r: 4, fill: "#6bfb9a", stroke: "#0c1322", strokeWidth: 2 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 flex-1 w-full">
          <div className="bg-[#141b2b] p-4 rounded-2xl border border-[#3d4a3e]/5">
            <div className="text-[10px] text-[#dce2f7]/40 uppercase mb-1">Dominant Element</div>
            <div className="text-[#6bfb9a] font-bold">Vayu (Air)</div>
          </div>
          <div className="bg-[#141b2b] p-4 rounded-2xl border border-[#3d4a3e]/5">
            <div className="text-[10px] text-[#dce2f7]/40 uppercase mb-1">State</div>
            <div className="text-[#ffb657] font-bold">In-Flux</div>
          </div>
          <div className="bg-[#141b2b] p-4 rounded-2xl border border-[#3d4a3e]/5">
            <div className="text-[10px] text-[#dce2f7]/40 uppercase mb-1">Entropy</div>
            <div className="text-[#dce2f7] font-bold">14.2%</div>
          </div>
          <div className="bg-[#141b2b] p-4 rounded-2xl border border-[#3d4a3e]/5">
            <div className="text-[10px] text-[#dce2f7]/40 uppercase mb-1">Bio-Link</div>
            <div className="text-[#dce2f7] font-bold">Active</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(107, 251, 154, 0.15);
        }
      `}</style>
    </div>
  );
}

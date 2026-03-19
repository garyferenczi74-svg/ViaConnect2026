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
    <div
      className="rounded-2xl border border-[#3d4a3e]/15 p-6 relative overflow-hidden"
      style={{ background: "rgba(46, 53, 69, 0.4)", backdropFilter: "blur(20px)" }}
    >
      {/* Constitutional Type Badge */}
      <div className="absolute top-4 right-4">
        <span className="text-xs font-bold uppercase tracking-widest bg-purple-500/15 text-purple-400 px-3 py-1.5 rounded-full border border-purple-500/20">
          {constitutionalType}
        </span>
      </div>

      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-1">
        Constitutional Typing
      </h3>
      <p className="text-[10px] text-[#bccabb]/60 font-mono uppercase tracking-widest mb-6">
        Ayurvedic Prakriti Analysis
      </p>

      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#3d4a3e" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#bccabb", fontSize: 11, fontWeight: 500 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#bccabb", fontSize: 9 }}
              tickCount={5}
              axisLine={false}
            />
            <Radar
              name="Constitution"
              dataKey="value"
              stroke="#4ade80"
              strokeWidth={2}
              fill="#4ade80"
              fillOpacity={0.15}
              dot={{ r: 4, fill: "#4ade80", stroke: "#0c1322", strokeWidth: 2 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Dosha Breakdown */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {data.slice(0, 3).map((d) => {
          const isVata = d.axis.includes("Vata");
          const isPitta = d.axis.includes("Pitta");
          const color = isVata ? "purple" : isPitta ? "orange" : "teal";
          const bgColor = isVata ? "bg-purple-500/10" : isPitta ? "bg-orange-500/10" : "bg-teal-500/10";
          const textColor = isVata ? "text-purple-400" : isPitta ? "text-orange-400" : "text-teal-400";
          const borderColor = isVata ? "border-purple-500/20" : isPitta ? "border-orange-500/20" : "border-teal-500/20";

          return (
            <div
              key={d.axis}
              className={`${bgColor} ${borderColor} border rounded-xl p-3 text-center`}
            >
              <p className={`text-2xl font-black ${textColor}`}>{d.value}</p>
              <p className="text-[10px] text-[#bccabb]/60 font-mono uppercase tracking-widest mt-1">
                {d.axis.split(" / ")[0]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

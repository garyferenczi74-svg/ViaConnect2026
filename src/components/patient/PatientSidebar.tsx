"use client";

const allergies = ["Penicillin", "Shellfish", "Latex"];
const medications = ["Lisinopril 10mg", "Metformin 500mg", "Levothyroxine 50mcg"];

export default function PatientSidebar() {
  return (
    <div className="w-72 shrink-0">
      <div className="sticky top-4 bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 text-2xl font-bold mb-3">
            JS
          </div>
          <span className="bg-purple-400/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full">
            GX360 Complete
          </span>
        </div>

        {/* Vitals */}
        <div>
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
            Vitals
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Height", value: "5'6\"" },
              { label: "Weight", value: "145 lb" },
              { label: "BMI", value: "23.4" },
            ].map((v) => (
              <div key={v.label} className="text-center">
                <p className="text-sm font-bold text-green-400">{v.value}</p>
                <p className="text-[10px] text-white/40">{v.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div>
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
            Allergies
          </h4>
          <div className="space-y-1.5">
            {allergies.map((a) => (
              <div key={a} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-sm text-white/80">{a}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div>
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
            Current Medications
          </h4>
          <div className="space-y-1.5">
            {medications.map((m) => (
              <p key={m} className="text-sm text-white/80">
                {m}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

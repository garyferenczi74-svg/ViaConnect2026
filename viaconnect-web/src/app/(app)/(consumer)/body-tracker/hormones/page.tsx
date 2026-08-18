/**
 * Prompt 221B: My Biology Hormones section (Male/Female Hormone Report).
 * Mobile-first, 44px targets, no em/en dashes. Education only.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, Loader2, Upload } from "lucide-react";
import { BackToHubLink } from "@/components/body-tracker/hub/BackToHubLink";
import type { HormoneReportPayload, HormoneReportResult } from "@/lib/kb/hormones/types";

type Phase =
  | { kind: "loading" }
  | { kind: "needsSex" }
  | { kind: "ready"; report: HormoneReportPayload; track: "male" | "female" }
  | { kind: "error"; message: string };

export default function HormonesPage() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [submittingSex, setSubmittingSex] = useState(false);

  const load = useCallback(async () => {
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/hormones/report", { method: "GET" });
      if (res.status === 401) {
        setPhase({ kind: "error", message: "Sign in to view your Hormone Report." });
        return;
      }
      const data = (await res.json()) as HormoneReportResult & { error?: string };
      if (!data.ok) {
        setPhase({
          kind: "error",
          message: data.error ?? "We could not load your Hormone Report.",
        });
        return;
      }
      if (data.needsSex) {
        setPhase({ kind: "needsSex" });
        return;
      }
      if (data.report && data.track) {
        setPhase({ kind: "ready", report: data.report, track: data.track });
        return;
      }
      setPhase({ kind: "error", message: "We could not load your Hormone Report." });
    } catch {
      setPhase({ kind: "error", message: "We could not load your Hormone Report." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chooseSex = useCallback(
    async (sex: "male" | "female") => {
      setSubmittingSex(true);
      try {
        const res = await fetch("/api/hormones/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sex }),
        });
        const data = (await res.json()) as HormoneReportResult & { error?: string };
        if (data.ok && !data.needsSex && data.report && data.track) {
          setPhase({ kind: "ready", report: data.report, track: data.track });
        } else {
          setPhase({
            kind: "error",
            message: data.error ?? "We could not generate your Hormone Report.",
          });
        }
      } catch {
        setPhase({
          kind: "error",
          message: "We could not generate your Hormone Report.",
        });
      } finally {
        setSubmittingSex(false);
      }
    },
    []
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4 text-white">
      <BackToHubLink />
      <header className="mt-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[#2DA5A0]">
          My Biology
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
          <FlaskConical className="h-6 w-6 text-[#2DA5A0]" strokeWidth={1.5} />
          Hormones
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Educational Hormone Report mapped to your labs and genetics where available.
        </p>
      </header>

      {phase.kind === "loading" && (
        <div className="flex min-h-[120px] items-center justify-center gap-2 text-white/70">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
          Loading report
        </div>
      )}

      {phase.kind === "error" && (
        <div className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4">
          <p className="text-sm">{phase.message}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-4 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {phase.kind === "needsSex" && (
        <div className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4">
          <h2 className="text-lg font-medium">Choose your report track</h2>
          <p className="mt-2 text-sm text-white/70">
            Hormone reports are sex-specific for physiology and reference context.
            We do not guess. Pick the track that matches your biological sex for this
            report.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={submittingSex}
              onClick={() => void chooseSex("male")}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#2DA5A0] px-4 text-sm font-medium text-[#0B1220] disabled:opacity-50"
            >
              Male Hormone Report
            </button>
            <button
              type="button"
              disabled={submittingSex}
              onClick={() => void chooseSex("female")}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium disabled:opacity-50"
            >
              Female Hormone Report
            </button>
          </div>
        </div>
      )}

      {phase.kind === "ready" && <ReportView report={phase.report} track={phase.track} />}
    </div>
  );
}

function ReportView({
  report,
  track,
}: {
  report: HormoneReportPayload;
  track: "male" | "female";
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4">
        <h2 className="text-lg font-medium">
          {track === "male" ? "Male" : "Female"} Hormone Report
        </h2>
        <p className="mt-1 text-xs text-white/60">
          Generated {new Date(report.overview.generated_at).toLocaleString()}
        </p>
        <p className="mt-3 text-sm text-white/80">{report.overview.what_this_is}</p>
        <p className="mt-2 text-sm text-white/60">{report.overview.what_this_is_not}</p>
        <p className="mt-3 text-xs leading-relaxed text-white/55">
          {report.overview.disclaimer}
        </p>
      </section>

      {report.cycle_phase_note && (
        <section className="rounded-xl border border-[#B75E18]/40 bg-[rgba(30,48,84,0.92)] p-4 text-sm text-white/80">
          {report.cycle_phase_note}
        </section>
      )}

      <section className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4">
        <h3 className="font-medium">Your labs, mapped</h3>
        {report.your_labs_mapped.length === 0 ? (
          <p className="mt-2 text-sm text-white/65">
            No matched hormone markers in your labs yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {report.your_labs_mapped.map((m) => (
              <li
                key={`${m.hormone_slug}-${m.lab.biomarker}`}
                className="rounded-lg border border-white/10 p-3 text-sm"
              >
                <div className="font-medium">{m.display_name}</div>
                <div className="mt-1 text-white/70">
                  Value: {m.lab.value ?? "UNKNOWN"} {m.lab.unit ?? ""}
                </div>
                {m.lab_reference ? (
                  <div className="mt-1 text-xs text-white/55">
                    Lab reference range: {m.lab_reference.low ?? "UNKNOWN"} to{" "}
                    {m.lab_reference.high ?? "UNKNOWN"} (from your upload)
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-white/55">
                    Lab reference range not present on this upload.
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {report.labs_not_present.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-white/65">Not in your labs yet</p>
            <ul className="mt-2 space-y-1 text-sm text-white/55">
              {report.labs_not_present.slice(0, 12).map((n) => (
                <li key={n.hormone_slug}>{n.display_name}</li>
              ))}
            </ul>
            <Link
              href="/lab-results"
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 px-4 text-sm"
            >
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              Upload Labs
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4">
        <h3 className="font-medium">Your genetics context</h3>
        {report.genetics_context.length === 0 ? (
          <p className="mt-2 text-sm text-white/65">
            No consumer-safe hormonal genetic associations available yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {report.genetics_context.map((g) => (
              <li key={g.rsid}>
                <span className="font-medium">{g.rsid}</span>: {g.summary}
                {g.evidence_grade ? ` (grade ${g.evidence_grade})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4">
        <h3 className="font-medium">Education track</h3>
        {report.education_track.length === 0 ? (
          <p className="mt-2 text-sm text-white/65">
            Hormone education entries are awaiting Marshall consumer_safe review
            (flagship drafts remain blocked on consumer surfaces).
          </p>
        ) : (
          <ul className="mt-2 space-y-3 text-sm">
            {report.education_track.map((e) => (
              <li key={e.hormone_slug}>
                <div className="font-medium">{e.display_name}</div>
                <p className="mt-1 text-white/70">{e.sex_block}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4">
        <h3 className="font-medium">Influences you control</h3>
        <ul className="mt-2 space-y-2 text-sm text-white/70">
          {report.influences_you_control.map((i) => (
            <li key={i.factor}>
              <span className="font-medium capitalize text-white">{i.factor}</span>
              {i.personalized ? " (from your data): " : ": "}
              {i.note}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/15 bg-[rgba(30,48,84,0.92)] p-4">
        <h3 className="font-medium">Talk to your practitioner</h3>
        <p className="mt-2 text-sm text-white/70">
          {report.talk_to_your_practitioner.pathway}
        </p>
        <p className="mt-2 text-sm text-white/60">
          {report.talk_to_your_practitioner.therapy_note}
        </p>
      </section>
    </div>
  );
}

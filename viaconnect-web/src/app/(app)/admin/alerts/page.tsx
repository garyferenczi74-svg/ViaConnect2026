"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition, StaggerChild } from "@/lib/motion";

const supabase = createClient();

const statusVariant: Record<string, "danger" | "warning" | "pending" | "active"> = {
  RED: "danger",
  AMBER: "warning",
  YELLOW: "pending",
  GREEN: "active",
};

const severityVariant: Record<string, "danger" | "warning" | "info" | "neutral"> = {
  CRITICAL: "danger",
  WARNING: "warning",
  INFO: "info",
};

const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

export default function AlertsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: snapshot, isLoading: snapLoading } = useQuery({
    queryKey: ["alerts-snapshot-detail"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alert_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data as any;
    },
    enabled: !!userId,
  });

  const { data: risks, isLoading: risksLoading } = useQuery({
    queryKey: ["executive-risks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("executive_risks")
        .select("category, severity, risk, detail, action");
      return (data ?? []) as any[];
    },
    enabled: !!userId,
  });

  const alerts: any[] = snapshot?.alerts ?? [];
  const grouped = alerts.reduce<Record<string, any[]>>((acc, a) => {
    const sev = a.severity ?? "INFO";
    (acc[sev] ??= []).push(a);
    return acc;
  }, {});
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => (severityOrder[a] ?? 9) - (severityOrder[b] ?? 9)
  );

  const isLoading = snapLoading || risksLoading;

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <StaggerChild>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Alerts &amp; Risk Register</h1>
            <p className="text-gray-400 text-sm mt-1">Real-time monitoring &amp; executive risk factors</p>
          </div>
          {snapshot && (
            <Badge variant={statusVariant[snapshot.overall_status] ?? "neutral"}>
              {snapshot.overall_status}
            </Badge>
          )}
        </div>
      </StaggerChild>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <>
          {snapshot && (
            <StaggerChild className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <Badge variant="danger">CRITICAL</Badge>
                <span className="text-sm text-white font-medium">{snapshot.critical_count ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <Badge variant="warning">WARNING</Badge>
                <span className="text-sm text-white font-medium">{snapshot.warning_count ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <Badge variant="info">INFO</Badge>
                <span className="text-sm text-white font-medium">{snapshot.info_count ?? 0}</span>
              </div>
            </StaggerChild>
          )}

          {sortedGroups.length > 0 ? (
            sortedGroups.map(([severity, items]) => (
              <StaggerChild key={severity}>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant={severityVariant[severity] ?? "neutral"}>{severity}</Badge>
                    <span className="text-xs text-gray-400">{items.length} alert{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((a: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
                      >
                        <Badge variant={severityVariant[a.severity] ?? "neutral"} className="mt-0.5 shrink-0">
                          {a.severity}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium">{a.title}</p>
                          {a.action && <p className="text-xs text-gray-400 mt-0.5">{a.action}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </StaggerChild>
            ))
          ) : (
            <Card className="p-6 text-center">
              <p className="text-gray-400">No active alerts.</p>
            </Card>
          )}

          {risks && risks.length > 0 && (
            <StaggerChild>
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Executive Risks</h2>
                <div className="space-y-3">
                  {risks.map((r: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant={
                            r.severity === "HIGH"
                              ? "danger"
                              : r.severity === "MEDIUM"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {r.severity}
                        </Badge>
                        <span className="text-xs text-gray-400">{r.category}</span>
                      </div>
                      <p className="text-sm text-white font-medium">{r.risk}</p>
                      {r.detail && <p className="text-xs text-gray-400 mt-1">{r.detail}</p>}
                      {r.action && (
                        <p className="text-xs text-copper mt-1.5">Action: {r.action}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </StaggerChild>
          )}
        </>
      )}
    </PageTransition>
  );
}

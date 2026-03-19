export interface ComplianceCategory {
  label: string;
  score: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: "success" | "warning" | "failed";
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  source: string;
}

export const overallScore = 94;

export const categories: ComplianceCategory[] = [
  { label: "Data Encryption", score: 100 },
  { label: "Access Control", score: 96 },
  { label: "Audit Logging", score: 92 },
  { label: "Breach Detection", score: 88 },
  { label: "Training", score: 94 },
];

export const users = [
  "All Users",
  "Dr. Sterling",
  "Dr. Nexus",
  "Admin: J. Park",
  "Nurse: M. Rivera",
  "System",
  "API Gateway",
];

export const actionTypes = [
  "All Actions",
  "Login",
  "Logout",
  "Data Access",
  "Data Export",
  "Config Change",
  "Patient Record",
  "Prescription",
  "Report Generation",
  "Permission Change",
];

const now = new Date();
function ts(minutesAgo: number): string {
  const d = new Date(now.getTime() - minutesAgo * 60000);
  return d.toISOString();
}

export const auditLog: AuditLogEntry[] = [
  { id: "al1", timestamp: ts(3), user: "Dr. Sterling", action: "Patient Record", resource: "Patient #4821 — Lab Results", ipAddress: "10.0.1.42", status: "success" },
  { id: "al2", timestamp: ts(7), user: "System", action: "Data Export", resource: "Compliance Report Q1-2026", ipAddress: "10.0.0.1", status: "success" },
  { id: "al3", timestamp: ts(12), user: "Admin: J. Park", action: "Permission Change", resource: "Role: Clinical Intern → Resident", ipAddress: "10.0.1.55", status: "warning" },
  { id: "al4", timestamp: ts(18), user: "API Gateway", action: "Login", resource: "OAuth2 Token Refresh", ipAddress: "203.0.113.45", status: "failed" },
  { id: "al5", timestamp: ts(25), user: "Dr. Nexus", action: "Prescription", resource: "Patient #3199 — Ashwagandha 600mg", ipAddress: "10.0.1.38", status: "success" },
  { id: "al6", timestamp: ts(32), user: "Nurse: M. Rivera", action: "Data Access", resource: "Patient #5012 — Vitals Dashboard", ipAddress: "10.0.2.14", status: "success" },
  { id: "al7", timestamp: ts(40), user: "System", action: "Config Change", resource: "Firewall Rule: Block 198.51.100.0/24", ipAddress: "10.0.0.1", status: "success" },
  { id: "al8", timestamp: ts(55), user: "Dr. Sterling", action: "Data Export", resource: "Patient Cohort — GI Protocol Outcomes", ipAddress: "10.0.1.42", status: "warning" },
  { id: "al9", timestamp: ts(68), user: "API Gateway", action: "Login", resource: "Service Account: lab-integration", ipAddress: "198.51.100.22", status: "failed" },
  { id: "al10", timestamp: ts(75), user: "Admin: J. Park", action: "Config Change", resource: "MFA Policy Update — Enforce TOTP", ipAddress: "10.0.1.55", status: "success" },
  { id: "al11", timestamp: ts(90), user: "Dr. Nexus", action: "Patient Record", resource: "Patient #2847 — Assessment Notes", ipAddress: "10.0.1.38", status: "success" },
  { id: "al12", timestamp: ts(105), user: "System", action: "Report Generation", resource: "Weekly Security Digest", ipAddress: "10.0.0.1", status: "success" },
  { id: "al13", timestamp: ts(120), user: "Nurse: M. Rivera", action: "Patient Record", resource: "Patient #5012 — Medication Log", ipAddress: "10.0.2.14", status: "success" },
  { id: "al14", timestamp: ts(140), user: "Dr. Sterling", action: "Login", resource: "Web Console — 2FA Verified", ipAddress: "10.0.1.42", status: "success" },
  { id: "al15", timestamp: ts(160), user: "API Gateway", action: "Data Access", resource: "EHR Sync — 142 records", ipAddress: "10.0.0.5", status: "success" },
  { id: "al16", timestamp: ts(180), user: "Admin: J. Park", action: "Permission Change", resource: "Revoke: Extern Access to Lab Module", ipAddress: "10.0.1.55", status: "success" },
  { id: "al17", timestamp: ts(210), user: "System", action: "Login", resource: "Automated Backup Agent", ipAddress: "10.0.0.1", status: "success" },
  { id: "al18", timestamp: ts(240), user: "Dr. Nexus", action: "Data Export", resource: "Research Dataset — Anonymized", ipAddress: "10.0.1.38", status: "warning" },
  { id: "al19", timestamp: ts(280), user: "API Gateway", action: "Login", resource: "Unknown Client Certificate", ipAddress: "203.0.113.99", status: "failed" },
  { id: "al20", timestamp: ts(320), user: "Dr. Sterling", action: "Patient Record", resource: "Patient #4821 — Protocol Update", ipAddress: "10.0.1.42", status: "success" },
  { id: "al21", timestamp: ts(360), user: "System", action: "Config Change", resource: "SSL Certificate Rotation", ipAddress: "10.0.0.1", status: "success" },
  { id: "al22", timestamp: ts(400), user: "Nurse: M. Rivera", action: "Login", resource: "Mobile App — Biometric Auth", ipAddress: "10.0.2.78", status: "success" },
  { id: "al23", timestamp: ts(440), user: "Admin: J. Park", action: "Data Access", resource: "Audit Trail — Full Export", ipAddress: "10.0.1.55", status: "success" },
  { id: "al24", timestamp: ts(500), user: "Dr. Nexus", action: "Patient Record", resource: "Patient #3199 — Follow-up Notes", ipAddress: "10.0.1.38", status: "success" },
  { id: "al25", timestamp: ts(560), user: "System", action: "Report Generation", resource: "Monthly HIPAA Compliance Report", ipAddress: "10.0.0.1", status: "success" },
];

export const securityEvents: SecurityEvent[] = [
  {
    id: "se1",
    timestamp: ts(14),
    severity: "info",
    title: "Security Scan Completed",
    description: "Infrastructure scan detected no critical vulnerabilities.",
    source: "Vulnerability Scanner v4.2",
  },
  {
    id: "se2",
    timestamp: ts(42),
    severity: "warning",
    title: "Failed Login Attempt",
    description: "User 'dr.wilson' exceeded attempt limit from IP 192.168.1.42.",
    source: "Identity & Access Management",
  },
  {
    id: "se3",
    timestamp: ts(120),
    severity: "critical",
    title: "Unauthorized File Access",
    description: "Attempted retrieval of PHI records from external API node.",
    source: "Data Loss Prevention Engine",
  },
  {
    id: "se4",
    timestamp: ts(55),
    severity: "warning",
    title: "Unusual data export pattern detected",
    description: "Dr. Sterling exported patient cohort data outside normal operating hours. Dataset flagged for review per DLP policy.",
    source: "Data Loss Prevention Engine",
  },
  {
    id: "se5",
    timestamp: ts(68),
    severity: "critical",
    title: "Repeated authentication failure — service account",
    description: "Service account 'lab-integration' failed authentication 5 times in 10 minutes. Credentials may be compromised. Account temporarily locked.",
    source: "Identity & Access Management",
  },
  {
    id: "se6",
    timestamp: ts(90),
    severity: "info",
    title: "Security scan completed — no vulnerabilities found",
    description: "Automated weekly vulnerability scan completed across all 14 endpoints. Zero critical, zero high, 2 informational findings.",
    source: "Vulnerability Scanner v4.2",
  },
  {
    id: "se7",
    timestamp: ts(180),
    severity: "info",
    title: "Firewall rules updated successfully",
    description: "Blocked IP range 198.51.100.0/24 added to perimeter firewall. Rule propagated to all 3 edge nodes within 12 seconds.",
    source: "Network Security / Firewall",
  },
  {
    id: "se8",
    timestamp: ts(240),
    severity: "warning",
    title: "Sensitive data export flagged for review",
    description: "Dr. Nexus exported anonymized research dataset. Automated PII scan detected 0 identifiers but flagged 3 quasi-identifiers for manual review.",
    source: "Data Loss Prevention Engine",
  },
  {
    id: "se9",
    timestamp: ts(280),
    severity: "critical",
    title: "Unknown client certificate presented",
    description: "Connection from 203.0.113.99 presented an unrecognized client certificate. Connection rejected.",
    source: "TLS Gateway / Certificate Authority",
  },
  {
    id: "se10",
    timestamp: ts(500),
    severity: "info",
    title: "MFA enforcement policy activated",
    description: "TOTP-based multi-factor authentication now enforced for all clinical roles. 100% enrollment confirmed across 24 active accounts.",
    source: "Identity & Access Management",
  },
];

export const STATUS_STYLES: Record<AuditLogEntry["status"], { bg: string; text: string; border: string; label: string }> = {
  success: { bg: "bg-[#4ade80]/10", text: "text-[#4ade80]", border: "border-[#4ade80]/20", label: "Success" },
  warning: { bg: "bg-[#ffb657]/10", text: "text-[#ffb657]", border: "border-[#ffb657]/20", label: "Warning" },
  failed: { bg: "bg-[#a40217]", text: "text-[#68000a]", border: "border-transparent", label: "Failed" },
};

export const SEVERITY_STYLES: Record<SecurityEvent["severity"], {
  border: string;
  bg: string;
  text: string;
  dot: string;
  label: string;
  iconBg: string;
  iconColor: string;
  iconPath: string;
}> = {
  critical: {
    border: "border-l-4 border-[#a40217]",
    bg: "bg-[#a40217]/5",
    text: "text-[#ffb3ad]",
    dot: "bg-[#f87171]",
    label: "Critical",
    iconBg: "rgba(164, 2, 23, 0.1)",
    iconColor: "#ffb3ad",
    iconPath: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  },
  warning: {
    border: "border-l-4 border-[#ffb657]",
    bg: "bg-[#ffb657]/5",
    text: "text-[#ffdab2]",
    dot: "bg-[#fbbf24]",
    label: "Warning",
    iconBg: "rgba(255, 182, 87, 0.1)",
    iconColor: "#ffdab2",
    iconPath: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  },
  info: {
    border: "border-l-4 border-[#6bfb9a]",
    bg: "bg-[#6bfb9a]/5",
    text: "text-[#6bfb9a]",
    dot: "bg-[#4ade80]",
    label: "Info",
    iconBg: "rgba(107, 251, 154, 0.1)",
    iconColor: "#6bfb9a",
    iconPath: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

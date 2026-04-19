// Prompt #91 Phase 4: LMS integration layer.
//
// Pluggable provider interface so the certification module can swap between
// Thinkific (default) and other providers (Teachable, Kajabi, custom)
// without rewiring the enrollment flow. Each provider speaks the LMSProvider
// interface; getLMSProvider chooses the implementation by env var.
//
// All LMS calls happen server-side; never instantiate from the browser.

export interface LMSEnrollmentRequest {
  practitionerId: string;
  email: string;
  firstName: string;
  lastName: string;
  courseId: string;
}

export interface LMSEnrollmentResult {
  enrollmentId: string;
  courseAccessUrl: string;
}

export interface LMSProgressResult {
  progressPercent: number;
  completedAt: Date | null;
}

export interface LMSProvider {
  readonly name: string;
  enrollPractitioner(req: LMSEnrollmentRequest): Promise<LMSEnrollmentResult>;
  getProgress(enrollmentId: string): Promise<LMSProgressResult>;
  revokeAccess(enrollmentId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Thinkific
// ---------------------------------------------------------------------------

const THINKIFIC_BASE = 'https://api.thinkific.com/api/public/v1';

export class ThinkificProvider implements LMSProvider {
  readonly name = 'thinkific';
  private readonly apiKey: string;
  private readonly subdomain: string;

  constructor(opts?: { apiKey?: string; subdomain?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.THINKIFIC_API_KEY ?? '';
    this.subdomain = opts?.subdomain ?? process.env.THINKIFIC_SUBDOMAIN ?? '';
    if (!this.apiKey || !this.subdomain) {
      throw new Error(
        'ThinkificProvider requires THINKIFIC_API_KEY and THINKIFIC_SUBDOMAIN.',
      );
    }
  }

  private headers(): HeadersInit {
    return {
      'X-Auth-API-Key': this.apiKey,
      'X-Auth-Subdomain': this.subdomain,
      'Content-Type': 'application/json',
    };
  }

  async enrollPractitioner(req: LMSEnrollmentRequest): Promise<LMSEnrollmentResult> {
    const res = await fetch(`${THINKIFIC_BASE}/enrollments`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        course_id: req.courseId,
        user: {
          email: req.email,
          first_name: req.firstName,
          last_name: req.lastName,
        },
        activated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Thinkific enrollment failed: ${res.status} ${res.statusText}: ${body.slice(0, 300)}`,
      );
    }
    const data = await res.json();
    return {
      enrollmentId: String(data.id),
      courseAccessUrl: data.course_access_url ?? data.courseAccessUrl ?? '',
    };
  }

  async getProgress(enrollmentId: string): Promise<LMSProgressResult> {
    const res = await fetch(`${THINKIFIC_BASE}/enrollments/${enrollmentId}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(
        `Thinkific progress fetch failed: ${res.status} ${res.statusText}`,
      );
    }
    const data = await res.json();
    return {
      progressPercent: clampPercent(Number(data.percentage_completed ?? 0)),
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
    };
  }

  async revokeAccess(enrollmentId: string): Promise<void> {
    const res = await fetch(`${THINKIFIC_BASE}/enrollments/${enrollmentId}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(
        `Thinkific revoke failed: ${res.status} ${res.statusText}`,
      );
    }
  }
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export function getLMSProvider(): LMSProvider {
  const id = (process.env.LMS_PROVIDER ?? 'thinkific').toLowerCase();
  switch (id) {
    case 'thinkific':
      return new ThinkificProvider();
    default:
      throw new Error(`Unknown LMS provider: ${id}`);
  }
}

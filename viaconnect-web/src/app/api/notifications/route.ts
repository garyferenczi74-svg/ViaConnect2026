import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function apiEnvelope(
  success: boolean,
  data?: unknown,
  error?: string,
  errorCode?: string
) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error, errorCode: errorCode ?? "UNKNOWN" }),
    timestamp: new Date().toISOString(),
  };
}

// Notification types with subject templates
const NOTIFICATION_TEMPLATES: Record<
  string,
  { subject: string; category: string }
> = {
  welcome: {
    subject: "Welcome to ViaConnect GeneX360",
    category: "onboarding",
  },
  genex_results: {
    subject: "Your GENEX360 Results Are Ready",
    category: "genetics",
  },
  supplement_reminder: {
    subject: "Supplement Reminder — ViaConnect",
    category: "adherence",
  },
  payment_failed: {
    subject: "Action Required: Payment Failed",
    category: "billing",
  },
  appointment_reminder: {
    subject: "Upcoming Appointment Reminder",
    category: "scheduling",
  },
  protocol_update: {
    subject: "Your Protocol Has Been Updated",
    category: "protocol",
  },
  achievement_unlocked: {
    subject: "Achievement Unlocked! 🎯",
    category: "gamification",
  },
  message_received: {
    subject: "New Message from Your Practitioner",
    category: "messaging",
  },
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      apiEnvelope(false, undefined, "Unauthorized", "AUTH_REQUIRED"),
      { status: 401 }
    );
  }

  let body: {
    userId?: string;
    type?: string;
    message?: string;
    channel?: "email" | "in_app" | "both";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      apiEnvelope(false, undefined, "Invalid JSON body", "INVALID_BODY"),
      { status: 400 }
    );
  }

  const { userId, type, message, channel = "both" } = body;

  if (!userId) {
    return NextResponse.json(
      apiEnvelope(false, undefined, "userId required", "MISSING_USER_ID"),
      { status: 400 }
    );
  }

  if (!type) {
    return NextResponse.json(
      apiEnvelope(false, undefined, "type required", "MISSING_TYPE"),
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      apiEnvelope(false, undefined, "message required", "MISSING_MESSAGE"),
      { status: 400 }
    );
  }

  const template = NOTIFICATION_TEMPLATES[type];
  const subject = template?.subject ?? `ViaConnect Notification: ${type}`;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? null;
  const results: { email?: boolean; in_app?: boolean } = {};

  try {
    // In-app notification
    if (channel === "in_app" || channel === "both") {
      const { error: dbError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          notification_type: type,
          title: subject,
          message,
        });

      results.in_app = !dbError;
    }

    // Email notification via SendGrid
    if (channel === "email" || channel === "both") {
      const sendgridKey = process.env.SENDGRID_API_KEY;

      if (sendgridKey) {
        // Look up user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .single();

        if (profile) {
          // Get the target user's email from auth
          // Since we can't access auth.users from client, use the provided userId
          // The email is fetched from the user's auth record via service role
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          let recipientEmail: string | null = null;

          if (serviceKey) {
            const authResponse = await fetch(
              `${supabaseUrl}/auth/v1/admin/users/${userId}`,
              {
                headers: {
                  Authorization: `Bearer ${serviceKey}`,
                  apikey: serviceKey,
                },
              }
            );

            if (authResponse.ok) {
              const authData = await authResponse.json();
              recipientEmail = authData.email ?? null;
            }
          }

          if (recipientEmail) {
            const emailResponse = await fetch(
              "https://api.sendgrid.com/v3/mail/send",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sendgridKey}`,
                },
                body: JSON.stringify({
                  personalizations: [
                    {
                      to: [{ email: recipientEmail }],
                      subject,
                    },
                  ],
                  from: {
                    email: "noreply@viaconnect.health",
                    name: "ViaConnect GeneX360",
                  },
                  content: [
                    {
                      type: "text/html",
                      value: `
                        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                          <div style="background: #224852; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                            <h1 style="color: white; font-size: 20px; margin: 0;">ViaConnect GeneX360</h1>
                          </div>
                          <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
                            <h2 style="color: #224852; margin-top: 0;">${subject}</h2>
                            <p style="color: #374151; line-height: 1.6;">${message}</p>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                            <p style="color: #9ca3af; font-size: 12px;">
                              ViaConnect · Buffalo, NY<br/>
                              One Genome. One Formulation. One Life at a Time.
                            </p>
                          </div>
                        </div>
                      `.trim(),
                    },
                  ],
                }),
              }
            );

            results.email = emailResponse.ok;
          } else {
            results.email = false;
          }
        }
      } else {
        results.email = false;
      }
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "notification_sent",
      resource_type: "notification",
      metadata: {
        target_user_id: userId,
        type,
        channel,
        results,
      },
      ip_address: ip,
    });

    return NextResponse.json(
      apiEnvelope(true, {
        sent: true,
        channel,
        results,
      })
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Notification send failed";
    return NextResponse.json(
      apiEnvelope(false, undefined, errorMessage, "NOTIFICATION_ERROR"),
      { status: 500 }
    );
  }
}

import { corsHeaders } from './cors.ts';

interface SuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

interface ErrorEnvelope {
  success: false;
  error: string;
  errorCode: string;
  timestamp: string;
  supportReference: string;
}

export function ok<T>(data: T, status = 200): Response {
  const body: SuccessEnvelope<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function err(
  message: string,
  errorCode: string,
  status = 400,
): Response {
  const body: ErrorEnvelope = {
    success: false,
    error: message,
    errorCode,
    timestamp: new Date().toISOString(),
    supportReference: `SR-${Date.now().toString(36).toUpperCase()}`,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      setStatus('success');
      setTimeout(() => {
        window.location.href = '/onboarding';
      }, 2000);
    } else {
      setStatus('error');
    }
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl text-center">
      {status === 'verifying' && (
        <>
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h2 className="text-2xl font-bold text-white">Verifying Email</h2>
          <p className="mt-2 text-slate-400">Please wait...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Email Verified!</h2>
          <p className="mt-2 text-slate-400">Redirecting to onboarding...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
          <p className="mt-2 text-slate-400">The link may have expired or is invalid.</p>
          <Link href="/login" className="mt-4 inline-block text-emerald-400 hover:text-emerald-300">
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

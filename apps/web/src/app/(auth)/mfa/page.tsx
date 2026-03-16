'use client';

import { useState, useEffect } from 'react';

type MFAStep = 'setup' | 'verify' | 'complete';

export default function MFAPage() {
  const [step, setStep] = useState<MFAStep>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step === 'setup') {
      enrollMFA();
    }
  }, [step]);

  async function enrollMFA() {
    try {
      const { createBrowserClient } = await import('@genex360/api-client');
      const supabase = createBrowserClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'GeneX360 Authenticator',
      });
      if (enrollError) {
        setError(enrollError.message);
        return;
      }
      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('verify');
      }
    } catch {
      setError('Failed to set up MFA');
    }
  }

  async function verifyMFA(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { createBrowserClient } = await import('@genex360/api-client');
      const supabase = createBrowserClient();
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) {
        setError(challengeError.message);
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      setStep('complete');
      setTimeout(() => {
        window.location.href = '/wellness';
      }, 2000);
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-white">
          {step === 'setup' && 'Setting Up MFA'}
          {step === 'verify' && 'Verify Authenticator'}
          {step === 'complete' && 'MFA Enabled'}
        </h1>
        <p className="mt-2 text-slate-400">
          {step === 'setup' && 'Preparing your authenticator...'}
          {step === 'verify' && 'Scan the QR code with your authenticator app'}
          {step === 'complete' && 'Your account is now protected'}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === 'setup' && (
        <div className="flex justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-6">
          {qrCode && (
            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-4">
                <img src={qrCode} alt="MFA QR Code" className="h-48 w-48" />
              </div>
            </div>
          )}
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-slate-400 mb-1">Manual entry code:</p>
            <p className="font-mono text-sm text-emerald-400 break-all">{secret}</p>
          </div>
          <form onSubmit={verifyMFA} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Verification Code</label>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl tracking-widest text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading || verifyCode.length !== 6}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-medium text-white hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 transition-all"
            >
              {loading ? 'Verifying...' : 'Verify & Enable MFA'}
            </button>
          </form>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-slate-400">Redirecting to your portal...</p>
        </div>
      )}
    </div>
  );
}

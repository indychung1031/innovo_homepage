import { useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { adminLogin, adminVerify2fa } from '@/api/admin';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName } from '@/components/forms/PrivacyConsent';
import { useAdminAuth } from '@/features/admin/AdminAuthContext';
import { getAdminToken } from '@/lib/adminSession';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { staff, refresh } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [otp, setOtp] = useState('');
  const [step2fa, setStep2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (staff || getAdminToken()) {
      navigate('/admin/quotes', { replace: true });
    }
  }, [staff, navigate]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await adminLogin(email.trim(), password);
      setChallengeToken(token);
      setStep2fa(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setSubmitting(true);
    try {
      await adminVerify2fa(challengeToken, otp.trim());
      await refresh();
      navigate('/admin/quotes', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Helmet>
        <title>Admin Login | Innovo</title>
      </Helmet>
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-xl font-bold text-navy">Innovo Admin</h1>

        {!step2fa ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-navy py-2 text-white disabled:opacity-60"
            >
              Continue
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void handleVerify(); }}>
            <p className="text-sm text-gray-mid">Enter the 6-digit code sent to your email.</p>
            <p className="text-xs text-gray-mid">Dev: use 000000 if SMTP is unavailable.</p>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className={inputClassName}
              autoFocus
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-sky py-2 text-white disabled:opacity-60"
            >
              Verify
            </button>
          </form>
        )}

        {error ? <FormAlert variant="error" message={error} /> : null}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import { setAccessToken, setRefreshToken } from '@/lib/auth';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useToast } from '@/components/ui/ToastProvider';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [verificationStep, setVerificationStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useToast();

  const passwordRules = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'One number', valid: /\d/.test(password) },
    { label: 'One special character', valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const isPasswordValid = passwordRules.every((rule) => rule.valid);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      showError('Password does not meet security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest<{ message: string }>('/auth/register', {
        method: 'POST',
        body: { email, password },
      });
      showSuccess(data.message || 'Verification code sent. Check your email.');
      setVerificationStep(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiRequest<AuthResponse>('/auth/verify-email', {
        method: 'POST',
        body: { email, code },
      });
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      showSuccess('Email verified successfully.');
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-main flex items-center justify-center p-6">
      <motion.form
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={verificationStep ? handleVerifyEmail : handleRegister}
        className="w-full max-w-md space-y-4"
      >
        <GlassPanel strong className="p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Create account</h1>
            <p className="text-sm text-muted">
              {verificationStep
                ? 'Enter the 6-digit code sent to your email.'
                : 'Secure registration with email verification.'}
            </p>
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none"
            required
            disabled={verificationStep}
          />

          {!verificationStep && (
            <>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none"
                required
                minLength={8}
              />
              <input
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none"
                required
                minLength={8}
              />
              <div className="rounded-xl border border-white/15 p-3 space-y-1">
                {passwordRules.map((rule) => (
                  <p
                    key={rule.label}
                    className={`text-xs ${rule.valid ? 'text-emerald-400' : 'text-muted'}`}
                  >
                    {rule.valid ? '✓' : '•'} {rule.label}
                  </p>
                ))}
              </div>
            </>
          )}

          {verificationStep && (
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              placeholder="Verification code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none tracking-[0.25em]"
              required
            />
          )}

          <AnimatedButton
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-white/15 px-4 font-medium disabled:opacity-60"
          >
            {loading
              ? 'Loading...'
              : verificationStep
                ? 'Verify and continue'
                : 'Register'}
          </AnimatedButton>
          <p className="text-sm text-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="underline">
              Login
            </Link>
          </p>
        </GlassPanel>
      </motion.form>
    </main>
  );
}

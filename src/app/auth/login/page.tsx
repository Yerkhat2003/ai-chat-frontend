'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import { setAccessToken } from '@/lib/auth';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useToast } from '@/components/ui/ToastProvider';

type AuthResponse = {
  accessToken: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setAccessToken(data.accessToken);
      router.push('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-main flex items-center justify-center p-6">
      <motion.form
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4"
      >
        <GlassPanel strong className="p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <p className="text-sm text-muted">Sign in to continue your conversations.</p>
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none"
            required
          />
          <AnimatedButton
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-white/15 px-4 font-medium disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Login'}
          </AnimatedButton>
          <p className="text-sm text-muted">
            No account?{' '}
            <Link href="/auth/register" className="underline">
              Register
            </Link>
          </p>
        </GlassPanel>
      </motion.form>
    </main>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Incorrect password. Try again.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-bg-panel border border-border-base flex items-center justify-center mx-auto mb-4 shadow-elevation-card-rest">
            <Lock size={20} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text-base tracking-tight">Mission Control</h1>
          <p className="text-sm text-text-muted mt-1">Enter your password to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full bg-bg-panel border border-border-base rounded-lg px-4 py-3 pr-12 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-base transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-accent hover:bg-accent/90 text-white py-3 rounded-lg text-sm font-medium transition-colors shadow-elevation-card-rest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Enter Mission Control'}
          </button>
        </form>
      </div>
    </div>
  );
}

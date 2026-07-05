'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('auth.invalidCredentials'));
      } else {
        router.push(`/${locale}/dashboard`);
        router.refresh();
      }
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageToggle = () => {
    const nextLocale = locale === 'hi' ? 'en' : 'hi';
    router.push(`/` + nextLocale + `/login`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        
        {/* Header & i18n Switcher */}
        <div className="relative">
          <button
            onClick={handleLanguageToggle}
            className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 transition-all cursor-pointer"
          >
            {locale === 'hi' ? 'English' : 'हिंदी'}
          </button>
          
          <div className="flex flex-col items-center justify-center">
            {/* Minimal Dairy Logo */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mb-4">
              <img src="/logo.png" alt="Dairy Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('common.appName')}
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('auth.signIn')}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('auth.username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                placeholder={t('auth.username')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? t('common.loading') : t('auth.signIn')}
            </button>
          </div>
        </form>

        {/* Toggle to Register */}
        <div className="text-center text-sm">
          <span className="text-slate-500 dark:text-slate-400">{t('auth.noAccount')} </span>
          <Link href={`/${locale}/register`} className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
            {t('auth.signUp')}
          </Link>
        </div>

      </div>
    </div>
  );
}

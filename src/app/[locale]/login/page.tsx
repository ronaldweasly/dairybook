'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePasswordMode, setUsePasswordMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const submitUsername = usePasswordMode ? username : 'admin';
    const submitPassword = usePasswordMode ? password : pin;

    if (!submitPassword) {
      setError(locale === 'hi' ? 'कृपया पिन या पासवर्ड दर्ज करें' : 'Please enter your PIN or password');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: submitUsername, password: submitPassword }),
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

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (!usePasswordMode && pin.length === 4) {
      handleSubmit();
    }
  }, [pin, usePasswordMode]);

  const handleLanguageToggle = () => {
    const nextLocale = locale === 'hi' ? 'en' : 'hi';
    router.push(`/` + nextLocale + `/login`);
  };

  const handlePinTap = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-900 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        
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
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {t('common.appName')}
            </h2>
            <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400 font-bold">
              {usePasswordMode 
                ? (locale === 'hi' ? 'लॉगिन करें' : 'Sign In') 
                : (locale === 'hi' ? '🔐 4-अंकों का लॉगिन पिन दर्ज करें' : '🔐 Enter 4-Digit Login PIN')
              }
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-xs font-semibold text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
            {error}
          </div>
        )}

        {/* ATM PIN Pad Mode */}
        {!usePasswordMode ? (
          <div className="space-y-6">
            {/* Display Circles */}
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                    pin.length > index
                      ? 'border-emerald-600 bg-emerald-55 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-inner scale-[1.02]'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  {pin.length > index ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Numerical Pad Grid */}
            <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinTap(String(num))}
                  className="h-14 w-14 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-white font-extrabold text-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinClear}
                className="h-14 w-14 text-xs font-extrabold text-rose-600 hover:bg-rose-50 dark:text-rose-450 dark:hover:bg-rose-950/20 rounded-full flex items-center justify-center cursor-pointer select-none"
              >
                {locale === 'hi' ? 'साफ़' : 'Clear'}
              </button>
              <button
                type="button"
                onClick={() => handlePinTap('0')}
                className="h-14 w-14 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-white font-extrabold text-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                className="h-14 w-14 text-xl font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full flex items-center justify-center cursor-pointer select-none"
              >
                ⌫
              </button>
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={loading || pin.length < 4}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-md rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : (locale === 'hi' ? 'प्रवेश करें (Login) →' : 'Login →')}
            </button>
          </div>
        ) : (
          /* Standard Username / Password Mode */
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                  {t('auth.username')}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                  placeholder={t('auth.username')}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                  {t('auth.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-md rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('auth.signIn')}
              </button>
            </div>
          </form>
        )}

        {/* Toggle Login Method */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setUsePasswordMode(!usePasswordMode);
              setPin('');
              setPassword('');
              setError('');
            }}
            className="text-xs font-bold text-emerald-650 hover:text-emerald-500 dark:text-emerald-400 cursor-pointer"
          >
            {usePasswordMode 
              ? (locale === 'hi' ? '🔐 एटीएम पिन (PIN) से लॉगिन करें' : '🔐 Login using 4-digit PIN')
              : (locale === 'hi' ? '⌨️ यूज़रनेम और पासवर्ड से लॉगिन करें' : '⌨️ Login using Username & Password')
            }
          </button>
        </div>

        {/* Toggle to Register */}
        <div className="text-center text-sm pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">{t('auth.noAccount')} </span>
          <Link href={`/${locale}/register`} className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
            {t('auth.signUp')}
          </Link>
        </div>

      </div>
    </div>
  );
}

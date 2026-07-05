'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Receipt, 
  IndianRupee, 
  BarChart3, 
  Settings, 
  LogOut,
  Globe,
  Sun,
  Moon
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  locale: string;
  userName: string;
  dairyName: string;
}

export default function DashboardLayoutClient({ children, locale, userName, dairyName }: Props) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  const navItems = [
    { name: t('nav.dashboard'), href: `/${locale}/dashboard`, icon: LayoutDashboard },
    { name: t('nav.customers'), href: `/${locale}/dashboard/customers`, icon: Users },
    { name: t('nav.dailyEntry'), href: `/${locale}/dashboard/daily-entry`, icon: ClipboardList },
    { name: t('nav.billing'), href: `/${locale}/dashboard/billing`, icon: Receipt },
    { name: t('nav.payments'), href: `/${locale}/dashboard/payments`, icon: IndianRupee },
    { name: t('nav.reports'), href: `/${locale}/dashboard/reports`, icon: BarChart3 },
    { name: t('nav.settings'), href: `/${locale}/dashboard/settings`, icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push(`/${locale}/login`);
        router.refresh();
      }
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleLanguageToggle = () => {
    const nextLocale = locale === 'hi' ? 'en' : 'hi';
    // Replace locale in path
    const pathSegments = pathname.split('/');
    pathSegments[1] = nextLocale;
    router.push(pathSegments.join('/'));
  };

  useEffect(() => {
    const isDark = window.document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark';
    if (isDark) {
      window.document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      window.document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  const isActive = (href: string) => {
    if (href.endsWith('/dashboard') && pathname.endsWith('/dashboard')) return true;
    if (!href.endsWith('/dashboard') && pathname.includes(href)) return true;
    return false;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm z-30 transition-colors">
        
        {/* Sidebar Header */}
        <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-white">
            <img src="/logo.png" alt="Dairy Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white truncate max-w-[160px]">{dairyName}</h1>
            <p className="text-[10px] text-slate-400 font-semibold">{t('common.appName')}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                  active 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {locale === 'hi' ? 'भाषा: हिंदी' : 'Lang: English'}
            </div>
            <button 
              onClick={handleLanguageToggle} 
              className="flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 gap-1 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === 'hi' ? 'EN' : 'हिंदी'}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 md:pl-64 flex flex-col pb-20 md:pb-6">
        
        {/* Desktop Topbar */}
        <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 z-20 md:shadow-none shadow-sm transition-colors">
          <div className="md:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-white">
              <img src="/logo.png" alt="Dairy Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-md font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{dairyName}</h1>
          </div>

          <div className="hidden md:block">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t('common.today')}: {new Date().toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Dark mode button */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Mobile language toggle */}
            <button
              onClick={handleLanguageToggle}
              className="md:hidden flex items-center p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Globe className="h-5 w-5" />
            </button>

            {/* Mobile logout */}
            <button
              onClick={handleLogout}
              className="md:hidden flex items-center p-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
            </button>

            {/* User Profile Info */}
            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-400">
                {userName[0]?.toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{userName}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{t('common.active')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Page wrapper */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (fixed at bottom on mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg px-2 flex justify-around items-center h-16 transition-colors">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-12 py-1 select-none transition-all ${
                active 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="text-[9px] font-semibold truncate w-full text-center">{item.name}</span>
            </Link>
          );
        })}
      </div>

    </div>
  );
}

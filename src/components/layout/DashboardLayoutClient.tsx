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

  // ── 4 bottom-nav items: Home · Customers · Daily Entry · Billing+Payments · Settings
  // Reports moved inside Settings page as a tab
  const navItems = [
    {
      name: locale === 'hi' ? 'होम' : 'Home',
      href: `/${locale}/dashboard`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: locale === 'hi' ? 'ग्राहक' : 'Customers',
      href: `/${locale}/dashboard/customers`,
      icon: Users,
      exact: false,
    },
    {
      name: locale === 'hi' ? 'दूध' : 'Milk',
      href: `/${locale}/dashboard/daily-entry`,
      icon: ClipboardList,
      exact: false,
    },
    {
      name: locale === 'hi' ? 'बिल' : 'Billing',
      href: `/${locale}/dashboard/billing`,
      icon: Receipt,
      exact: false,
    },
    {
      name: locale === 'hi' ? 'सेटिंग' : 'Settings',
      href: `/${locale}/dashboard/settings`,
      icon: Settings,
      exact: false,
    },
  ];

  // Full sidebar nav (desktop) — keep all pages accessible
  const sidebarItems = [
    { name: t('nav.dashboard'),   href: `/${locale}/dashboard`,             icon: LayoutDashboard },
    { name: t('nav.customers'),   href: `/${locale}/dashboard/customers`,   icon: Users },
    { name: t('nav.dailyEntry'),  href: `/${locale}/dashboard/daily-entry`, icon: ClipboardList },
    { name: t('nav.billing'),     href: `/${locale}/dashboard/billing`,     icon: Receipt },
    { name: t('nav.payments'),    href: `/${locale}/dashboard/payments`,    icon: Receipt },
    { name: t('nav.reports'),     href: `/${locale}/dashboard/reports`,     icon: Receipt },
    { name: t('nav.settings'),    href: `/${locale}/dashboard/settings`,    icon: Settings },
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

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href || pathname.endsWith('/dashboard');
    return pathname.startsWith(href);
  };

  // Billing tab is active for both billing AND payments pages
  const isBillingTabActive = pathname.includes('/billing') || pathname.includes('/payments');

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm z-30 transition-colors">

        {/* Sidebar Header */}
        <div className="flex h-16 items-center px-5 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-white">
            <img src="/logo.png" alt="Dairy Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[140px]">{dairyName}</h1>
            <p className="text-[10px] text-slate-400 font-semibold">{t('common.appName')}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.href.endsWith('/dashboard'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`mr-3 h-4 w-4 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <button
              onClick={handleLanguageToggle}
              className="flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 gap-1 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === 'hi' ? 'English' : 'हिंदी'}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 md:pl-60 flex flex-col pb-20 md:pb-6">

        {/* Topbar */}
        <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-between px-4 z-20 shadow-sm transition-colors">

          {/* Mobile: logo + dairy name */}
          <div className="flex items-center gap-2">
            <div className="md:hidden flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-white">
              <img src="/logo.png" alt="Dairy Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="md:hidden text-sm font-bold text-slate-800 dark:text-white truncate max-w-[140px]">{dairyName}</h1>
            {/* Desktop: show date */}
            <h2 className="hidden md:block text-sm font-semibold text-slate-500 dark:text-slate-400">
              {new Date().toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Language toggle (mobile) */}
            <button
              onClick={handleLanguageToggle}
              className="md:hidden flex items-center px-2 py-1 rounded-full text-xs font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 cursor-pointer"
            >
              {locale === 'hi' ? 'EN' : 'हि'}
            </button>

            {/* Logout (mobile) */}
            <button
              onClick={handleLogout}
              className="md:hidden p-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Desktop user pill */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                {userName[0]?.toUpperCase()}
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{userName}</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav (4 + 1 = 5 items, clean) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg transition-colors">
        <div className="flex items-stretch h-[60px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Special: billing tab matches billing OR payments
            const active = item.href.includes('/billing')
              ? isBillingTabActive
              : isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 select-none transition-all relative ${
                  active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {/* Active indicator pill */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full" />
                )}
                <Icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
                <span className={`text-[10px] font-semibold leading-none ${active ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

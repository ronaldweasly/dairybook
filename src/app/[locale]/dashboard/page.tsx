'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, 
  ClipboardList, 
  Receipt, 
  IndianRupee, 
  TrendingUp, 
  Activity, 
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Percent,
  Plus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  totalCustomers: number;
  activeCustomers: number;
  todayMilk: number;
  monthlyMilk: number;
  monthlyRevenue: number;
  pendingPayments: number;
  receivedPayments: number;
  chartData: { date: string; liters: number }[];
}

export default function DashboardPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/reports?type=summary');
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        }
      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('dashboard.todayMilk'),
      value: `${data?.todayMilk?.toFixed(1) || 0} L`,
      sub: locale === 'hi' ? 'सुबह + शाम' : 'Morning + Evening',
      icon: ClipboardList,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400',
    },
    {
      title: t('dashboard.monthlyMilk'),
      value: `${data?.monthlyMilk?.toFixed(1) || 0} L`,
      sub: locale === 'hi' ? 'इस महीने एकत्र किया गया' : 'Collected this month',
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400',
    },
    {
      title: t('dashboard.pendingPayments'),
      value: `₹${data?.pendingPayments?.toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-US') || 0}`,
      sub: locale === 'hi' ? 'कुल बकाया राशि' : 'Total Outstanding Balance',
      icon: Percent,
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400',
    },
  ];

  const advancedStatCards = [
    {
      title: t('dashboard.totalCustomers'),
      value: data?.totalCustomers || 0,
      sub: locale === 'hi' ? `${data?.activeCustomers || 0} सक्रिय` : `${data?.activeCustomers || 0} active`,
      icon: Users,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400',
    },
    {
      title: t('dashboard.monthlyRevenue'),
      value: `₹${data?.monthlyRevenue?.toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-US') || 0}`,
      sub: locale === 'hi' ? 'संभावित बिलिंग' : 'Expected billing',
      icon: IndianRupee,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
    },
    {
      title: locale === 'hi' ? 'प्राप्त कुल भुगतान' : 'Received Payments',
      value: `₹${data?.receivedPayments?.toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-US') || 0}`,
      sub: locale === 'hi' ? 'संग्रहीत कुल नकद राशि' : 'Total cash collected',
      icon: ShieldCheck,
      color: 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400',
    },
  ];

  const quickActions = [
    { name: locale === 'hi' ? '1. 👥 ग्राहक (Add Customer)' : '1. 👥 Add/View Customers', href: `/${locale}/dashboard/customers`, color: 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' },
    { name: locale === 'hi' ? '2. 🥛 दूध लिखें (Daily Entry)' : '2. 🥛 Enter Daily Milk', href: `/${locale}/dashboard/daily-entry`, color: 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' },
    { name: locale === 'hi' ? '3. 📄 बिल बनाएं (Billing)' : '3. 📄 Get Invoices & Bills', href: `/${locale}/dashboard/billing`, color: 'bg-amber-50 border-amber-100 text-amber-750 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' },
    { name: locale === 'hi' ? '4. 💰 पैसे मिले (Payments)' : '4. 💰 Record Got Paid', href: `/${locale}/dashboard/payments`, color: 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Massive Call To Action for Daily Entries */}
      <div className="bg-emerald-600 dark:bg-emerald-800 text-white rounded-3xl p-6 shadow-md border border-emerald-500/20 flex flex-col items-center text-center space-y-4">
        <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
          <ClipboardList className="h-9 w-9 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {locale === 'hi' ? 'आज का दूध दर्ज करें' : 'Write Today\'s Milk'}
          </h2>
          <p className="text-emerald-100 text-xs mt-1">
            {locale === 'hi' ? 'रोजाना सुबह और शाम का दूध लिखने के लिए यहाँ दबाएं' : 'Click here to enter daily morning and evening milk logs'}
          </p>
        </div>
        <button
          onClick={() => router.push(`/${locale}/dashboard/daily-entry`)}
          className="w-full sm:w-auto px-8 py-3.5 bg-white text-emerald-700 font-extrabold text-lg rounded-2xl shadow-lg hover:bg-emerald-50 hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all uppercase tracking-wide"
        >
          {locale === 'hi' ? '🥛 दूध लिखें (Start Entry) →' : '🥛 Start Entry →'}
        </button>
      </div>

      {/* Simplified Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{stat.title}</span>
                <h3 className="text-3xl font-extrabold text-slate-950 dark:text-white mt-1 leading-none">{stat.value}</h3>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-2 font-bold">{stat.sub}</span>
              </div>
              <div className={`p-4 rounded-2xl ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Steps Quick Action Hub */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
          {locale === 'hi' ? 'डेयरी के 4 मुख्य काम (Main Tasks)' : '4 Main Steps'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            return (
              <button
                key={idx}
                onClick={() => router.push(action.href)}
                className={`flex items-center justify-between p-5 rounded-2xl border font-bold text-left cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${action.color}`}
              >
                <span className="text-md font-extrabold">{action.name}</span>
                <ArrowUpRight className="h-5 w-5 opacity-70 shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Details Collapsible Toggle */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:text-slate-400 rounded-full cursor-pointer transition-all"
        >
          {showAdvanced ? (
            <>
              {locale === 'hi' ? 'छिपाएं (Hide Advanced)' : 'Hide Extra Details'}
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              {locale === 'hi' ? 'अधिक विवरण देखें (Show Extra Details)' : 'Show Extra Details'}
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-6 animate-fadeIn">
          {/* Extra Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {advancedStatCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex items-center justify-between opacity-90"
                >
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{stat.title}</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 leading-none">{stat.value}</h3>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-2 font-bold">{stat.sub}</span>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Graphical Trends & Help Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Milk trend Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-md font-bold text-slate-800 dark:text-white">{t('dashboard.milkTrend')}</h3>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full cursor-pointer" onClick={() => router.push(`/${locale}/dashboard/reports`)}>
                  {locale === 'hi' ? 'रिपोर्ट देखें' : 'View Reports'}
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
              <div className="h-64 w-full">
                {data?.chartData && data.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                        labelClassName="font-bold text-slate-800"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="liters" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    {locale === 'hi' ? 'कोई संग्रह रिकॉर्ड उपलब्ध नहीं है' : 'No collection records available'}
                  </div>
                )}
              </div>
            </div>

            {/* Info panel / help center */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-md font-bold text-slate-800 dark:text-white border-b border-slate-50 dark:border-slate-800 pb-3 mb-4">
                  {locale === 'hi' ? 'डेयरी मालिक मार्गदर्शिका' : 'Dairy Owner Guide'}
                </h3>
                <ul className="space-y-3.5 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold dark:bg-emerald-950/20">1</span>
                    {locale === 'hi' ? (
                      <span><strong>1. 👥 ग्राहक</strong> में अपने ग्राहकों को जोड़ें। डिफ़ॉल्ट सुबह/शाम के लीटर और दर तय करें।</span>
                    ) : (
                      <span>Add your customers in <strong>1. 👥 Customers</strong>. Set default morning/evening liters and price rate.</span>
                    )}
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold dark:bg-emerald-950/20">2</span>
                    {locale === 'hi' ? (
                      <span>रोज <strong>2. 🥛 दूध लिखें</strong> खोलें। आवश्यकतानुसार दूध की मात्रा बदलें, फिर \'सभी सहेजें\' पर क्लिक करें।</span>
                    ) : (
                      <span>Open <strong>2. 🥛 Enter Milk</strong> everyday. Change milk quantities if needed, then click "Save All".</span>
                    )}
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold dark:bg-emerald-950/20">3</span>
                    {locale === 'hi' ? (
                      <span>महीने के अंत में, बिल बनाने और व्हाट्सएप पर शेयर करने के लिए <strong>3. 📄 बिल बनाएं</strong> पर जाएं।</span>
                    ) : (
                      <span>At the end of the month, go to <strong>3. 📄 Get Bills</strong> to generate invoices and share bills via WhatsApp.</span>
                    )}
                  </li>
                </ul>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    {locale === 'hi' ? 'ऑफ़लाइन तैयार' : 'Offline Ready'}
                  </p>
                  <p className="text-[10px] text-slate-450">
                    {locale === 'hi' ? 'यह ऐप ऑफ़लाइन मोबाइल उपयोग के लिए पेज सुरक्षित रखता है।' : 'This app caches pages for offline mobile usage.'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

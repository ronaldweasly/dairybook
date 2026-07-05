import React from 'react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import DashboardLayoutClient from '@/components/layout/DashboardLayoutClient';

type Params = Promise<{ locale: string }>;

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Get session
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }

  // Get Dairy name
  const dairy = await prisma.dairy.findUnique({
    where: { id: session.dairyId },
    select: { name: true },
  });

  const dairyName = dairy?.name || 'DairyBook';

  return (
    <DashboardLayoutClient 
      locale={locale} 
      userName={session.username} 
      dairyName={dairyName}
    >
      {children}
    </DashboardLayoutClient>
  );
}

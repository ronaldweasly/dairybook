import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { runDailyMilkAutosave, runAutoBilling } from '@/lib/automation';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Trigger daily milk autosave & auto-billing rules at request time
    await runDailyMilkAutosave(session.dairyId);
    await runAutoBilling(session.dairyId);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary'; // 'summary', 'ledger'

    if (type === 'summary') {
      // 1. Calculate general dashboard/report totals
      const customersCount = await prisma.customer.count({
        where: { dairyId: session.dairyId, isArchived: false },
      });

      const activeCustomersCount = await prisma.customer.count({
        where: { dairyId: session.dairyId, isActive: true, isArchived: false },
      });

      // Today's milk
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEntries = await prisma.dailyEntry.findMany({
        where: {
          date: today,
          customer: { dairyId: session.dairyId },
        },
      });

      let todayMorningQty = 0;
      let todayEveningQty = 0;
      todayEntries.forEach((e: any) => {
        if (!e.isHoliday) {
          todayMorningQty += e.morningQty;
          todayEveningQty += e.eveningQty;
        }
      });
      const todayTotalQty = todayMorningQty + todayEveningQty;

      // This Month's milk
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

      const monthEntries = await prisma.dailyEntry.findMany({
        where: {
          date: { gte: startOfMonth, lte: endOfMonth },
          customer: { dairyId: session.dairyId },
        },
      });

      let monthTotalQty = 0;
      let monthExpectedRevenue = 0;
      monthEntries.forEach((e: any) => {
        if (!e.isHoliday) {
          const qty = e.morningQty + e.eveningQty;
          monthTotalQty += qty;
          monthExpectedRevenue += qty * e.ratePerLiter + e.extraCharges - e.discount;
        }
      });

      // Total generated invoices and payments
      const invoices = await prisma.invoice.findMany({
        where: { dairyId: session.dairyId },
        include: { payments: true },
      });

      let totalInvoiceAmount = 0;
      let totalReceivedAmount = 0;
      invoices.forEach((inv: any) => {
        totalInvoiceAmount += inv.grandTotal;
        const paid = inv.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
        totalReceivedAmount += paid;
      });

      const pendingAmount = Math.max(0, totalInvoiceAmount - totalReceivedAmount);

      // Past 7 Days Milk Collection Trend Data
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const dayEntries = await prisma.dailyEntry.findMany({
          where: {
            date: d,
            customer: { dairyId: session.dairyId },
          },
        });

        let qty = 0;
        dayEntries.forEach((e: any) => {
          if (!e.isHoliday) {
            qty += e.morningQty + e.eveningQty;
          }
        });

        chartData.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          liters: qty,
        });
      }

      // Fetch auto-generated invoices for today
      const pendingBills = await prisma.invoice.findMany({
        where: {
          dairyId: session.dairyId,
          createdAt: { gte: today },
          whatsappSentAt: null,
        },
        include: {
          customer: true,
        },
      });

      const sentBills = await prisma.invoice.findMany({
        where: {
          dairyId: session.dairyId,
          createdAt: { gte: today },
          whatsappSentAt: { not: null },
        },
        include: {
          customer: true,
        },
      });

      return NextResponse.json({
        totalCustomers: customersCount,
        activeCustomers: activeCustomersCount,
        todayMilk: todayTotalQty,
        monthlyMilk: monthTotalQty,
        monthlyRevenue: monthExpectedRevenue,
        pendingPayments: pendingAmount,
        receivedPayments: totalReceivedAmount,
        chartData,
        todayPendingBills: pendingBills,
        todaySentBills: sentBills,
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getLocalizedName } from '@/lib/translit';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '');
    const year = parseInt(searchParams.get('year') || '');

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const locale = searchParams.get('locale') || cookieStore.get('NEXT_LOCALE')?.value || 'hi';

    const invoices = await prisma.invoice.findMany({
      where: {
        dairyId: session.dairyId,
        billingMonth: month,
        billingYear: year,
      },
      include: {
        customer: true,
        payments: true,
      },
      orderBy: { customer: { customerId: 'asc' } },
    });

    const localizedInvoices = invoices.map((inv: any) => ({
      ...inv,
      customer: {
        ...inv.customer,
        name: getLocalizedName(inv.customer.name, locale),
      },
    }));

    return NextResponse.json(localizedInvoices);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month, year } = await request.json();

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 });
    }

    // Billing period
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // 1. Fetch active customers
    const customers = await prisma.customer.findMany({
      where: {
        dairyId: session.dairyId,
        isActive: true,
        isArchived: false,
      },
    });

    const generatedInvoices = [];

    // Process in transaction or loop
    for (const customer of customers) {
      // 2. Fetch daily entries for customer in period
      const entries = await prisma.dailyEntry.findMany({
        where: {
          customerId: customer.id,
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      // Calculate how many days are in the billing period
      const daysInPeriod: Date[] = [];
      let currentDate = new Date(periodStart);
      while (currentDate <= periodEnd) {
        daysInPeriod.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Map existing entries by date string (YYYY-MM-DD) for fast lookup
      const entriesMap = new Map(entries.map((e: any) => {
        const dateKey = new Date(e.date).toISOString().split('T')[0];
        return [dateKey, e];
      }));

      let totalMorningQty = 0;
      let totalEveningQty = 0;
      let milkAmount = 0;
      let extraCharges = 0;
      let discount = 0;
      let hasAnyRecord = false;

      // Loop through every day of the period
      for (const day of daysInPeriod) {
        // Skip days before customer's start date
        const customerStart = new Date(customer.startDate);
        customerStart.setHours(0, 0, 0, 0);
        const dayCompare = new Date(day);
        dayCompare.setHours(0, 0, 0, 0);
        if (dayCompare < customerStart) continue;

        const dateKey = day.toISOString().split('T')[0];
        const existingEntry = entriesMap.get(dateKey);

        if (existingEntry) {
          hasAnyRecord = true;
          if (!existingEntry.isHoliday) {
            totalMorningQty += existingEntry.morningQty;
            totalEveningQty += existingEntry.eveningQty;
            milkAmount += (existingEntry.morningQty * existingEntry.ratePerLiter) + (existingEntry.eveningQty * existingEntry.ratePerLiter);
            extraCharges += existingEntry.extraCharges;
            discount += existingEntry.discount;
          }
        } else {
          // Carry forward: Find the most recent non-holiday entry before this day
          const lastEntry = await prisma.dailyEntry.findFirst({
            where: {
              customerId: customer.id,
              date: { lt: day },
              isHoliday: false,
            },
            orderBy: { date: 'desc' },
          });

          if (lastEntry) {
            hasAnyRecord = true;
            totalMorningQty += lastEntry.morningQty;
            totalEveningQty += lastEntry.eveningQty;
            milkAmount += (lastEntry.morningQty * lastEntry.ratePerLiter) + (lastEntry.eveningQty * lastEntry.ratePerLiter);
            extraCharges += lastEntry.extraCharges;
            discount += lastEntry.discount;
          } else {
            // Fallback to customer default quantities if they are > 0
            if (customer.morningQty > 0 || customer.eveningQty > 0) {
              hasAnyRecord = true;
              totalMorningQty += customer.morningQty;
              totalEveningQty += customer.eveningQty;
              milkAmount += (customer.morningQty * customer.ratePerLiter) + (customer.eveningQty * customer.ratePerLiter);
            }
          }
        }
      }

      // Skip generating invoice if there are absolutely no records or default quantities for this customer
      if (!hasAnyRecord) continue;

      const totalQty = totalMorningQty + totalEveningQty;
      const avgRate = totalQty > 0 ? milkAmount / totalQty : customer.ratePerLiter;

      // 3. Compute Previous Balance from past unpaid invoices
      const pastInvoices = await prisma.invoice.findMany({
        where: {
          customerId: customer.id,
          OR: [
            { billingYear: { lt: year } },
            { billingYear: year, billingMonth: { lt: month } },
          ],
        },
        include: { payments: true },
      });

      let previousBalance = 0;
      pastInvoices.forEach((inv: any) => {
        const paid = inv.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const outstanding = inv.grandTotal - paid;
        if (outstanding > 0) {
          previousBalance += outstanding;
        }
      });

      // 4. Fetch Advance Payments (payments with isAdvance=true and not linked to any invoice)
      const advances = await prisma.payment.findMany({
        where: {
          customerId: customer.id,
          isAdvance: true,
          invoiceId: null,
        },
      });

      const advancePayment = advances.reduce((sum: number, p: any) => sum + p.amount, 0);

      // 5. Grand Total Calculation
      const grandTotal = Math.max(0, milkAmount + extraCharges - discount + previousBalance - advancePayment);

      // Due date is 10th of next month by default
      const dueDate = new Date(year, month, 10);

      // Format Invoice Number: e.g. DB-2026-07-001
      const monthStr = String(month).padStart(2, '0');
      const invoiceNumber = `INV-${year}-${monthStr}-${customer.customerId}`;

      // Upsert Invoice
      const invoice = await prisma.invoice.upsert({
        where: {
          customerId_billingMonth_billingYear: {
            customerId: customer.id,
            billingMonth: month,
            billingYear: year,
          },
        },
        update: {
          invoiceNumber,
          periodStart,
          periodEnd,
          totalMorningQty,
          totalEveningQty,
          totalQty,
          avgRate,
          milkAmount,
          extraCharges,
          discount,
          previousBalance,
          advancePayment,
          grandTotal,
          dueDate,
          status: grandTotal === 0 ? 'PAID' : 'GENERATED',
        },
        create: {
          invoiceNumber,
          customerId: customer.id,
          dairyId: session.dairyId,
          billingMonth: month,
          billingYear: year,
          periodStart,
          periodEnd,
          totalMorningQty,
          totalEveningQty,
          totalQty,
          avgRate,
          milkAmount,
          extraCharges,
          discount,
          previousBalance,
          advancePayment,
          grandTotal,
          dueDate,
          status: grandTotal === 0 ? 'PAID' : 'GENERATED',
        },
      });

      // 6. Link advances to this invoice if it consumes them
      if (advances.length > 0 && grandTotal > 0) {
        await prisma.payment.updateMany({
          where: {
            id: { in: advances.map((adv: any) => adv.id) },
          },
          data: {
            invoiceId: invoice.id,
          },
        });
      }

      generatedInvoices.push(invoice);
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'GENERATE_BILLS',
        entity: 'Invoice',
        entityId: `${year}-${month}`,
        details: { count: generatedInvoices.length },
      },
    });

    return NextResponse.json({ success: true, count: generatedInvoices.length });
  } catch (error: any) {
    console.error('Invoice generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

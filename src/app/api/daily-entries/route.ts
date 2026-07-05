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
    const dateStr = searchParams.get('date');

    if (!dateStr) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const targetDate = new Date(dateStr);
    
    // Get active locale from cookie
    const cookieStore = await cookies();
    const locale = searchParams.get('locale') || cookieStore.get('NEXT_LOCALE')?.value || 'hi';

    // 1. Fetch all active customers
    const customers = await prisma.customer.findMany({
      where: {
        dairyId: session.dairyId,
        isActive: true,
        isArchived: false,
      },
      orderBy: { customerId: 'asc' },
    });

    // 2. Fetch existing daily entries for this date
    const existingEntries = await prisma.dailyEntry.findMany({
      where: {
        date: targetDate,
        customer: {
          dairyId: session.dairyId,
        },
      },
    });

    const entriesMap = new Map(existingEntries.map((e: any) => [e.customerId, e]));

    // 3. Merge: for each customer, return existing entry or carry forward the most recent entry
    const results = await Promise.all(customers.map(async (c: any) => {
      const localizedName = getLocalizedName(c.name, locale);
      const existing: any = entriesMap.get(c.id);
      if (existing) {
        return {
          id: existing.id,
          customerId: c.id,
          customerName: localizedName,
          customerIdStr: c.customerId,
          date: existing.date,
          morningQty: existing.morningQty,
          eveningQty: existing.eveningQty,
          milkType: existing.milkType,
          ratePerLiter: existing.ratePerLiter,
          extraCharges: existing.extraCharges,
          discount: existing.discount,
          remarks: existing.remarks,
          isHoliday: existing.isHoliday,
          isSaved: true,
        };
      } else {
        // Find the most recent non-holiday entry before targetDate
        const lastEntry = await prisma.dailyEntry.findFirst({
          where: {
            customerId: c.id,
            date: {
              lt: targetDate,
            },
            isHoliday: false,
          },
          orderBy: {
            date: 'desc',
          },
        });

        if (lastEntry) {
          return {
            id: null,
            customerId: c.id,
            customerName: localizedName,
            customerIdStr: c.customerId,
            date: targetDate,
            morningQty: lastEntry.morningQty,
            eveningQty: lastEntry.eveningQty,
            milkType: lastEntry.milkType,
            ratePerLiter: lastEntry.ratePerLiter,
            extraCharges: lastEntry.extraCharges,
            discount: lastEntry.discount,
            remarks: lastEntry.remarks,
            isHoliday: false, // Default new entry to non-holiday
            isSaved: false,
          };
        }

        // Return pre-filled default data from customer profile
        return {
          id: null,
          customerId: c.id,
          customerName: localizedName,
          customerIdStr: c.customerId,
          date: targetDate,
          morningQty: c.morningQty,
          eveningQty: c.eveningQty,
          milkType: c.milkType,
          ratePerLiter: c.ratePerLiter,
          extraCharges: 0,
          discount: 0,
          remarks: '',
          isHoliday: false,
          isSaved: false,
        };
      }
    }));

    return NextResponse.json(results);
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

    const { date, entries } = await request.json();

    if (!date || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const targetDate = new Date(date);

    // Save in transaction
    const savedEntries = await prisma.$transaction(
      entries.map((e: any) => {
        const entryData = {
          date: targetDate,
          customerId: e.customerId,
          morningQty: parseFloat(e.morningQty) || 0,
          eveningQty: parseFloat(e.eveningQty) || 0,
          milkType: e.milkType || 'COW',
          ratePerLiter: parseFloat(e.ratePerLiter) || 0,
          extraCharges: parseFloat(e.extraCharges) || 0,
          discount: parseFloat(e.discount) || 0,
          remarks: e.remarks || '',
          isHoliday: !!e.isHoliday,
        };

        return prisma.dailyEntry.upsert({
          where: {
            customerId_date: {
              customerId: e.customerId,
              date: targetDate,
            },
          },
          update: entryData,
          create: entryData,
        });
      })
    );

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPSERT_BULK',
        entity: 'DailyEntry',
        entityId: date,
        details: { count: savedEntries.length },
      },
    });

    return NextResponse.json({ success: true, count: savedEntries.length });
  } catch (error: any) {
    console.error('Save entries error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

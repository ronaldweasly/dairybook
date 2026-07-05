import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await request.json();
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const targetDate = new Date(date);
    
    // Calculate yesterday (1 day before targetDate)
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Fetch entries from yesterday
    const yesterdayEntries = await prisma.dailyEntry.findMany({
      where: {
        date: yesterday,
        customer: {
          dairyId: session.dairyId,
          isActive: true,
          isArchived: false,
        },
      },
    });

    if (yesterdayEntries.length === 0) {
      return NextResponse.json(
        { error: 'No entries found for yesterday to copy' },
        { status: 404 }
      );
    }

    // 2. Clone them onto targetDate in a transaction
    const saved = await prisma.$transaction(
      yesterdayEntries.map((e: any) => {
        const entryData = {
          date: targetDate,
          customerId: e.customerId,
          morningQty: e.morningQty,
          eveningQty: e.eveningQty,
          milkType: e.milkType,
          ratePerLiter: e.ratePerLiter,
          extraCharges: e.extraCharges,
          discount: e.discount,
          remarks: e.remarks,
          isHoliday: e.isHoliday,
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
        action: 'COPY_YESTERDAY',
        entity: 'DailyEntry',
        entityId: date,
        details: { count: saved.length },
      },
    });

    return NextResponse.json({ success: true, count: saved.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

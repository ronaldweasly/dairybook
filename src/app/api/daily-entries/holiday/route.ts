import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, isHoliday } = await request.json();
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const targetDate = new Date(date);

    if (isHoliday) {
      // 1. Fetch all active customers
      const customers = await prisma.customer.findMany({
        where: {
          dairyId: session.dairyId,
          isActive: true,
          isArchived: false,
        },
      });

      // 2. Mark holiday in database (upsert entries with 0 quantities and isHoliday=true)
      const saved = await prisma.$transaction(
        customers.map((c: any) => {
          const entryData = {
            date: targetDate,
            customerId: c.id,
            morningQty: 0,
            eveningQty: 0,
            milkType: c.milkType,
            ratePerLiter: c.ratePerLiter,
            extraCharges: 0,
            discount: 0,
            remarks: 'छुट्टी (Holiday)',
            isHoliday: true,
          };

          return prisma.dailyEntry.upsert({
            where: {
              customerId_date: {
                customerId: c.id,
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
          action: 'MARK_HOLIDAY',
          entity: 'DailyEntry',
          entityId: date,
        },
      });

      return NextResponse.json({ success: true, count: saved.length });
    } else {
      // 3. Clear holiday (delete all entries for that date so it resets to defaults)
      const deleted = await prisma.dailyEntry.deleteMany({
        where: {
          date: targetDate,
          customer: {
            dairyId: session.dairyId,
          },
        },
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'CLEAR_HOLIDAY',
          entity: 'DailyEntry',
          entityId: date,
        },
      });

      return NextResponse.json({ success: true, count: deleted.count });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

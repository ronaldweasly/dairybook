import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data for this dairy
    const dairy = await prisma.dairy.findUnique({
      where: { id: session.dairyId },
    });

    const customers = await prisma.customer.findMany({
      where: { dairyId: session.dairyId },
    });

    const rateHistory = await prisma.rateHistory.findMany({
      where: { customer: { dairyId: session.dairyId } },
    });

    const dailyEntries = await prisma.dailyEntry.findMany({
      where: { customer: { dairyId: session.dairyId } },
    });

    const invoices = await prisma.invoice.findMany({
      where: { dairyId: session.dairyId },
    });

    const payments = await prisma.payment.findMany({
      where: { customer: { dairyId: session.dairyId } },
    });

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      dairyId: session.dairyId,
      dairy,
      customers,
      rateHistory,
      dailyEntries,
      invoices,
      payments,
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dairybook_backup_${new Date()
          .toISOString()
          .split('T')[0]}.json"`,
      },
    });
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

    const backupData = await request.json();

    if (!backupData || backupData.version !== '1.0' || !backupData.dairy) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Run restore inside a transaction
    await prisma.$transaction(async (tx: any) => {
      // 1. Delete all existing records for this dairy (to clear old data before restore)
      await tx.payment.deleteMany({ where: { customer: { dairyId: session.dairyId } } });
      await tx.invoice.deleteMany({ where: { dairyId: session.dairyId } });
      await tx.dailyEntry.deleteMany({ where: { customer: { dairyId: session.dairyId } } });
      await tx.rateHistory.deleteMany({ where: { customer: { dairyId: session.dairyId } } });
      await tx.customer.deleteMany({ where: { dairyId: session.dairyId } });

      // 2. Restore Customers
      if (backupData.customers && backupData.customers.length > 0) {
        await tx.customer.createMany({
          data: backupData.customers.map((c: any) => ({
            ...c,
            startDate: new Date(c.startDate),
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          })),
        });
      }

      // 3. Restore Rate History
      if (backupData.rateHistory && backupData.rateHistory.length > 0) {
        await tx.rateHistory.createMany({
          data: backupData.rateHistory.map((rh: any) => ({
            ...rh,
            effectiveFrom: new Date(rh.effectiveFrom),
            effectiveTo: rh.effectiveTo ? new Date(rh.effectiveTo) : null,
            createdAt: new Date(rh.createdAt),
          })),
        });
      }

      // 4. Restore Daily Entries
      if (backupData.dailyEntries && backupData.dailyEntries.length > 0) {
        await tx.dailyEntry.createMany({
          data: backupData.dailyEntries.map((de: any) => ({
            ...de,
            date: new Date(de.date),
            createdAt: new Date(de.createdAt),
            updatedAt: new Date(de.updatedAt),
          })),
        });
      }

      // 5. Restore Invoices
      if (backupData.invoices && backupData.invoices.length > 0) {
        await tx.invoice.createMany({
          data: backupData.invoices.map((inv: any) => ({
            ...inv,
            periodStart: new Date(inv.periodStart),
            periodEnd: new Date(inv.periodEnd),
            dueDate: new Date(inv.dueDate),
            whatsappSentAt: inv.whatsappSentAt ? new Date(inv.whatsappSentAt) : null,
            createdAt: new Date(inv.createdAt),
            updatedAt: new Date(inv.updatedAt),
          })),
        });
      }

      // 6. Restore Payments
      if (backupData.payments && backupData.payments.length > 0) {
        await tx.payment.createMany({
          data: backupData.payments.map((p: any) => ({
            ...p,
            paidAt: new Date(p.paidAt),
            createdAt: new Date(p.createdAt),
          })),
        });
      }

      // 7. Update Dairy Settings
      await tx.dairy.update({
        where: { id: session.dairyId },
        data: {
          name: backupData.dairy.name,
          address: backupData.dairy.address,
          phone: backupData.dairy.phone,
          gstNumber: backupData.dairy.gstNumber,
          upiId: backupData.dairy.upiId,
          bankName: backupData.dairy.bankName,
          bankAccount: backupData.dairy.bankAccount,
          bankIfsc: backupData.dairy.bankIfsc,
          language: backupData.dairy.language,
          invoicePrefix: backupData.dairy.invoicePrefix,
        },
      });
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'RESTORE_BACKUP',
        entity: 'Dairy',
        entityId: session.dairyId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Backup restore error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

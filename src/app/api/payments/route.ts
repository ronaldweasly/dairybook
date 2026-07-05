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
    const customerId = searchParams.get('customerId');

    let whereClause: any = {
      customer: {
        dairyId: session.dairyId,
      },
    };

    if (customerId) {
      whereClause.customerId = customerId;
    }

    const cookieStore = await cookies();
    const locale = searchParams.get('locale') || cookieStore.get('NEXT_LOCALE')?.value || 'hi';

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        customer: true,
        invoice: true,
      },
      orderBy: { paidAt: 'desc' },
      take: 50, // limit to last 50
    });

    const localizedPayments = payments.map((p: any) => ({
      ...p,
      customer: p.customer ? {
        ...p.customer,
        name: getLocalizedName(p.customer.name, locale),
      } : null,
    }));

    return NextResponse.json(localizedPayments);
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

    const body = await request.json();
    const { customerId, invoiceId, amount, method, reference, notes, isAdvance, date } = body;

    const parsedAmount = parseFloat(amount);
    if (!customerId || isNaN(parsedAmount) || parsedAmount <= 0 || !method) {
      return NextResponse.json(
        { error: 'Customer, Amount and Method are required' },
        { status: 400 }
      );
    }

    const paymentDate = date ? new Date(date) : new Date();

    const payment = await prisma.$transaction(async (tx: any) => {
      // 1. Create payment record
      const newPayment = await tx.payment.create({
        data: {
          customerId,
          invoiceId: isAdvance ? null : invoiceId || null,
          amount: parsedAmount,
          method,
          reference,
          notes,
          isAdvance: !!isAdvance,
          paidAt: paymentDate,
        },
      });

      // 2. If linked to an invoice, update invoice status
      if (invoiceId && !isAdvance) {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { payments: true },
        });

        if (invoice) {
          const totalPaid = invoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0) + parsedAmount;
          let status: 'PAID' | 'PARTIALLY_PAID' = 'PARTIALLY_PAID';

          if (totalPaid >= invoice.grandTotal) {
            status = 'PAID';
          }

          await tx.invoice.update({
            where: { id: invoiceId },
            data: { status },
          });
        }
      }

      return newPayment;
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'RECORD_PAYMENT',
        entity: 'Payment',
        entityId: payment.id,
        details: { amount: payment.amount, method: payment.method },
      },
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

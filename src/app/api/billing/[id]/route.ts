import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type Params = Promise<{ id: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        dairy: true,
        payments: true,
      },
    });

    if (!invoice || invoice.dairyId !== session.dairyId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Fetch daily entries for this period to display the detailed statement table
    const entries = await prisma.dailyEntry.findMany({
      where: {
        customerId: invoice.customerId,
        date: {
          gte: invoice.periodStart,
          lte: invoice.periodEnd,
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ invoice, entries });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, whatsappSentAt } = body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice || existingInvoice.dairyId !== session.dairyId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: status !== undefined ? status : existingInvoice.status,
        whatsappSentAt: whatsappSentAt !== undefined ? new Date(whatsappSentAt) : existingInvoice.whatsappSentAt,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

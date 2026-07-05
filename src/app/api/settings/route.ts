import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dairy = await prisma.dairy.findUnique({
      where: { id: session.dairyId },
    });

    if (!dairy) {
      return NextResponse.json({ error: 'Dairy profile not found' }, { status: 404 });
    }

    return NextResponse.json(dairy);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      address,
      phone,
      gstNumber,
      upiId,
      bankName,
      bankAccount,
      bankIfsc,
      language,
      invoicePrefix,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Dairy name is required' }, { status: 400 });
    }

    const updatedDairy = await prisma.dairy.update({
      where: { id: session.dairyId },
      data: {
        name,
        address,
        phone,
        gstNumber,
        upiId,
        bankName,
        bankAccount,
        bankIfsc,
        language: language || 'hi',
        invoicePrefix: invoicePrefix || 'DB',
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE_SETTINGS',
        entity: 'Dairy',
        entityId: session.dairyId,
      },
    });

    return NextResponse.json(updatedDairy);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

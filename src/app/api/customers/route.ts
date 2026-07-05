import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { splitName, formatNameCombined } from '@/lib/translit';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active'; // 'active', 'inactive', 'archived', 'all'

    let whereClause: any = {
      dairyId: session.dairyId,
      isArchived: false,
    };

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    } else if (status === 'archived') {
      whereClause.isArchived = true;
    } else if (status === 'all') {
      // both active and inactive, but not archived
      whereClause.isArchived = false;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { customerId: { contains: search, mode: 'insensitive' } },
        { village: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { customerId: 'asc' },
    });

    return NextResponse.json(customers);
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
    const {
      name,
      phone,
      whatsappNumber,
      address,
      village,
      milkType,
      morningQty,
      eveningQty,
      ratePerLiter,
      notes,
    } = body;

    if (!name || !phone || !ratePerLiter) {
      return NextResponse.json(
        { error: 'Name, Phone and Rate are required' },
        { status: 400 }
      );
    }

    // Auto-generate Customer ID
    const lastCustomer = await prisma.customer.findFirst({
      where: { dairyId: session.dairyId },
      orderBy: { createdAt: 'desc' },
    });

    let newCustomerId = 'CUST-001';
    if (lastCustomer && lastCustomer.customerId.startsWith('CUST-')) {
      const parts = lastCustomer.customerId.split('-');
      const num = parseInt(parts[1]);
      if (!isNaN(num)) {
        newCustomerId = `CUST-${String(num + 1).padStart(3, '0')}`;
      }
    }

    const { engName, hinName } = splitName(name);
    const combinedName = formatNameCombined(engName, hinName);

    const customer = await prisma.customer.create({
      data: {
        customerId: newCustomerId,
        name: combinedName,
        phone,
        whatsappNumber: whatsappNumber || phone,
        address,
        village,
        milkType: milkType || 'COW',
        morningQty: parseFloat(morningQty) || 0,
        eveningQty: parseFloat(eveningQty) || 0,
        ratePerLiter: parseFloat(ratePerLiter),
        notes,
        dairyId: session.dairyId,
      },
    });

    // Create Initial Rate History
    await prisma.rateHistory.create({
      data: {
        customerId: customer.id,
        milkType: customer.milkType,
        ratePerLiter: customer.ratePerLiter,
        effectiveFrom: new Date(),
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE',
        entity: 'Customer',
        entityId: customer.id,
        details: { name: customer.name, customerId: customer.customerId },
      },
    });

    return NextResponse.json(customer);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { splitName, formatNameCombined } from '@/lib/translit';

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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        rateHistory: {
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    if (!customer || customer.dairyId !== session.dairyId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
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

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer || existingCustomer.dairyId !== session.dairyId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

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
      isActive,
      isArchived,
    } = body;

    const updatedRate = parseFloat(ratePerLiter);
    const hasRateChanged = updatedRate !== existingCustomer.ratePerLiter || milkType !== existingCustomer.milkType;

    let combinedName = existingCustomer.name;
    if (name !== undefined) {
      const { engName, hinName } = splitName(name);
      combinedName = formatNameCombined(engName, hinName);
    }

    const customer = await prisma.$transaction(async (tx: any) => {
      // 1. Update customer profile
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: {
          name: combinedName,
          phone: phone ?? existingCustomer.phone,
          whatsappNumber: whatsappNumber ?? existingCustomer.whatsappNumber,
          address: address ?? existingCustomer.address,
          village: village ?? existingCustomer.village,
          milkType: milkType ?? existingCustomer.milkType,
          morningQty: morningQty !== undefined ? parseFloat(morningQty) : existingCustomer.morningQty,
          eveningQty: eveningQty !== undefined ? parseFloat(eveningQty) : existingCustomer.eveningQty,
          ratePerLiter: ratePerLiter !== undefined ? updatedRate : existingCustomer.ratePerLiter,
          notes: notes ?? existingCustomer.notes,
          isActive: isActive !== undefined ? isActive : existingCustomer.isActive,
          isArchived: isArchived !== undefined ? isArchived : existingCustomer.isArchived,
        },
      });

      // 2. If rate changed, update history
      if (hasRateChanged && ratePerLiter !== undefined) {
        const now = new Date();

        // Close the previous active rate history
        await tx.rateHistory.updateMany({
          where: {
            customerId: id,
            effectiveTo: null,
          },
          data: {
            effectiveTo: now,
          },
        });

        // Insert new active rate history
        await tx.rateHistory.create({
          data: {
            customerId: id,
            milkType: milkType ?? existingCustomer.milkType,
            ratePerLiter: updatedRate,
            effectiveFrom: now,
          },
        });
      }

      return updatedCustomer;
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE',
        entity: 'Customer',
        entityId: id,
        details: { name: customer.name, rateChanged: hasRateChanged },
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

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer || existingCustomer.dairyId !== session.dairyId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Archive instead of hard delete to preserve financial and milk record history
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        isArchived: true,
        isActive: false,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'ARCHIVE',
        entity: 'Customer',
        entityId: id,
      },
    });

    return NextResponse.json({ success: true, message: 'Customer archived' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

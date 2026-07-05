import { NextResponse } from 'next/server';
import { clearAuthCookie, getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getSession();
    if (session) {
      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'LOGOUT',
          entity: 'User',
          entityId: session.userId,
        },
      });
    }

    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

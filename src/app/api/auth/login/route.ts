import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      include: { dairy: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Get dairy ID (for employees, we would find their associated dairy, for owner it's user.dairy)
    let dairyId = '';
    if (user.role === 'OWNER' && user.dairy) {
      dairyId = user.dairy.id;
    } else {
      // Handle employee dairy lookup if added later, or get default
      const dairy = await prisma.dairy.findFirst({
        where: { ownerId: user.id }, // Fallback
      });
      dairyId = dairy ? dairy.id : '';
    }

    // Create session token
    const token = await createToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      dairyId: dairyId,
    });

    // Set HTTP-only cookie
    await setAuthCookie(token);

    // Create an audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
      dairyId,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

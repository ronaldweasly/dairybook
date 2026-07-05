import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, username, password, dairyName } = await request.json();

    if (!name || !username || !password || !dairyName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and dairy in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name,
          username,
          password: hashedPassword,
          role: 'OWNER',
        },
      });

      const dairy = await tx.dairy.create({
        data: {
          name: dairyName,
          ownerId: user.id,
          language: 'hi', // Default to Hindi
        },
      });

      return { user, dairy };
    });

    // Create token
    const token = await createToken({
      userId: result.user.id,
      username: result.user.username,
      role: result.user.role,
      dairyId: result.dairy.id,
    });

    // Set cookie
    await setAuthCookie(token);

    // Create an audit log
    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: 'REGISTER',
        entity: 'User',
        entityId: result.user.id,
        details: { dairyName },
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: result.user.id, name: result.user.name, username: result.user.username },
      dairy: { id: result.dairy.id, name: result.dairy.name },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

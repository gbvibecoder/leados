import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password must be strings' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password - support both bcrypt and legacy SHA256 hashes
    let passwordValid = false;

    if (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$')) {
      // bcrypt hash
      passwordValid = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Legacy SHA256 hash (from older signups)
      const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
      passwordValid = sha256Hash === user.passwordHash;

      // Upgrade to bcrypt if SHA256 matched
      if (passwordValid) {
        const bcryptHash = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: bcryptHash },
        });
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = signToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

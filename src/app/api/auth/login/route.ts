import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // TODO: Replace with real authentication once user management is set up
    // For now, accept any email/password and generate a session token
    const token = generateToken();
    const namePart = email.split('@')[0];

    return NextResponse.json({
      token,
      user: {
        id: crypto.randomUUID(),
        email: email.toLowerCase().trim(),
        name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

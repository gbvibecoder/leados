import { NextResponse } from 'next/server';
import { validateToken } from '@/lib/meta-api';

export async function GET() {
  const result = await validateToken();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { valid: true, name: result.data?.name, id: result.data?.id },
  });
}

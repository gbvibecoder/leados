import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    id,
    name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    status: 'idle',
    description: `Agent ${id} — ready to process`,
    lastRun: null,
    lastOutput: null,
  });
}

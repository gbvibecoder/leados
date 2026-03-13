import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = body.url;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });
      if (!res.ok && res.status >= 400) {
        return NextResponse.json(
          { error: `URL not reachable — got status ${res.status}. Please enter a valid, live URL.` },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'URL not reachable. Please check the URL and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}

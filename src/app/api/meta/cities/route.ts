import { NextRequest, NextResponse } from 'next/server';

const META_BASE = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v21.0'}`;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  const country = req.nextUrl.searchParams.get('country') || '';
  const token = process.env.META_ACCESS_TOKEN;

  if (!query || query.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'META_ACCESS_TOKEN not configured' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      q: query,
      type: 'adgeolocation',
      location_types: '["city"]',
      access_token: token,
    });
    if (country) {
      params.set('country_code', country);
    }

    const res = await fetch(`${META_BASE}/search?${params.toString()}`);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error.message },
        { status: 400 }
      );
    }

    const cities = (data.data || []).map((city: any) => ({
      key: city.key,
      name: city.name,
      region: city.region || '',
      country_name: city.country_name || '',
      type: city.type,
    }));

    return NextResponse.json({ success: true, data: cities });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

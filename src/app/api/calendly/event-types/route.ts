import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'CALENDLY_API_KEY not configured' }, { status: 400 });
  }

  try {
    // Get current user
    const userRes = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const userData = await userRes.json();
    const userUri = userData.resource?.uri;

    if (!userUri) {
      return NextResponse.json({ error: 'Could not fetch Calendly user' }, { status: 500 });
    }

    // Get active event types
    const eventsRes = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const eventsData = await eventsRes.json();
    const eventTypes = eventsData.collection || [];

    if (eventTypes.length === 0) {
      return NextResponse.json({ error: 'No active event types found' }, { status: 404 });
    }

    // Return the first active event type's scheduling URL
    const eventType = eventTypes[0];
    return NextResponse.json({
      url: eventType.scheduling_url,
      name: eventType.name,
      duration: eventType.duration,
      slug: eventType.slug,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

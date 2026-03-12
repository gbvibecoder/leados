'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, MessageSquare, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BookingData {
  provider: string;
  url: string;
  meetingType: string;
  meetingDuration: number;
  bufferTime: number;
  availability: string;
  preCallQuestions: string[];
  confirmationRedirect: string;
}

export default function BookingPage() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingData();
  }, []);

  async function fetchBookingData() {
    try {
      const res = await fetch('/api/agents/funnel-builder/runs');
      const runs = await res.json();
      const latestRun = Array.isArray(runs)
        ? runs.find((r: any) => r.status === 'done' && r.outputsJson)
        : null;

      if (!latestRun) {
        setError('No funnel has been built yet. Run the Funnel Builder agent first.');
        setLoading(false);
        return;
      }

      const output = typeof latestRun.outputsJson === 'string'
        ? JSON.parse(latestRun.outputsJson)
        : latestRun.outputsJson;

      const data = output.data || output;
      const calendar = data.bookingCalendar || null;

      // If the stored URL is a mock/placeholder, try fetching real Calendly URL
      if (calendar && (!calendar.url || calendar.url.includes('calendly.com/leados'))) {
        try {
          const calRes = await fetch('/api/calendly/event-types');
          const calData = await calRes.json();
          if (calData.url) {
            calendar.url = calData.url;
          }
        } catch {
          // Keep existing URL
        }
      }

      setBookingData(calendar);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking data');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{error || 'No booking data available'}</p>
          <Link href="/funnel" className="text-blue-400 hover:text-blue-300 underline">
            Back to Landing Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/funnel" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Landing Page
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-10">
          {/* Left — Details */}
          <div className="space-y-8">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-white">
                {bookingData.meetingType || 'Strategy Call'}
              </h1>
              <p className="text-zinc-400 text-lg">
                Book your free call and get a custom growth plan for your business.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">{bookingData.meetingDuration} minutes</p>
                  <p className="text-sm text-zinc-500">No commitment required</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-zinc-300">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">{bookingData.provider}</p>
                  <p className="text-sm text-zinc-500">{bookingData.availability}</p>
                </div>
              </div>
            </div>

            {/* Pre-call Questions */}
            {bookingData.preCallQuestions && bookingData.preCallQuestions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  We&apos;ll Cover
                </h2>
                <ul className="space-y-2">
                  {bookingData.preCallQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-400 text-sm">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right — Calendly Embed or Link */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {bookingData.url && !bookingData.url.includes('mock') && !bookingData.url.includes('calendly.com/leados') ? (
                <iframe
                  src={bookingData.url}
                  width="100%"
                  height="630"
                  frameBorder="0"
                  className="bg-white rounded-xl"
                  title="Book a call"
                />
              ) : (
                <div className="p-8 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
                    <Calendar className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">Book Your Strategy Call</h3>
                    <p className="text-zinc-400 text-sm">
                      Calendly integration is ready. Add your <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-blue-400">CALENDLY_API_KEY</code> to <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-blue-400">.env</code> for live booking.
                    </p>
                  </div>
                  <a
                    href={bookingData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    Open Booking Link
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

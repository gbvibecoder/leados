'use client';

import { CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-[#020205] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">You&apos;re In!</h1>
          <p className="text-gray-400 text-lg">
            Your details have been received. We&apos;ll review your information and reach out within 24 hours.
          </p>
        </div>

        <div className="bg-zinc-900 border border-white/[0.04] rounded-xl p-6 space-y-4 text-left">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            What Happens Next
          </h2>
          <ol className="space-y-3 text-gray-400 text-sm">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
              <span>Our team reviews your submission and prepares a custom growth analysis</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
              <span>You&apos;ll receive a calendar link to book your free 30-minute strategy call</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
              <span>On the call, we&apos;ll walk through your custom acquisition plan — no obligation</span>
            </li>
          </ol>
        </div>

        <Link
          href="/leads"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all leads in dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

'use client';

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function AnalyticsCharts({ data }: { data: any; type?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Trends Line Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Lead Generation Trends</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2} dot={false} name="Leads" />
            <Line type="monotone" dataKey="qualified" stroke="#10b981" strokeWidth={2} dot={false} name="Qualified" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel Bar Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Funnel Drop-off</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.funnelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lead Sources Pie */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Lead Sources</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data.channelBreakdown}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="leads"
              nameKey="channel"
              label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.channelBreakdown?.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Trend */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`$${v}`, 'Revenue']} />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

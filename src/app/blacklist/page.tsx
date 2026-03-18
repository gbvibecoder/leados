'use client';

import { useState, useEffect } from 'react';
import { ShieldBan, Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { motion, AnimatePresence } from 'framer-motion';

function BlacklistPageInner() {
  const { blacklist, addToBlacklist, removeFromBlacklist, loadBlacklist } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  const handleAdd = async () => {
    if (!companyName.trim() || saving) return;
    setSaving(true);
    try {
      await addToBlacklist({
        companyName: companyName.trim(),
        domain: domain.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setCompanyName('');
      setDomain('');
      setReason('');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const filtered = blacklist.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.companyName.toLowerCase().includes(q) ||
      e.domain?.toLowerCase().includes(q) ||
      e.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Blacklist</h1>
          <p className="mt-1 text-sm text-gray-400">
            Companies on this list will be skipped during outreach &middot; {blacklist.length} entries
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          <Plus className="h-4 w-4" /> Add to Blacklist
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <p className="text-sm text-amber-400/80">
          Blacklisted companies are automatically checked before outbound outreach and cold email campaigns.
          Leads from blacklisted companies will be flagged and skipped.
        </p>
      </div>

      {/* Add form */}
      <AnimatePresence>
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="overflow-hidden"
        >
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-lg font-medium text-white">Add Company to Blacklist</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g., acme.com"
                className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Competitor, Do Not Contact, Previous bad experience"
              className="w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!companyName.trim() || saving}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add to Blacklist'}
            </button>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search blacklist..."
          className="h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] pl-10 pr-4 text-sm text-gray-300 placeholder-gray-600 focus:border-red-500 focus:outline-none"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg rounded-xl p-12 text-center">
          <ShieldBan className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-sm text-gray-400">
            {search ? 'No matching entries' : 'No blacklisted companies yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.04]">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.04] bg-[rgba(2,2,5,0.6)]/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Added</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtered.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-white/5/30">
                  <td className="px-4 py-3 font-medium text-gray-100">{entry.companyName}</td>
                  <td className="px-4 py-3 text-gray-400">{entry.domain || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{entry.reason || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { removeFromBlacklist(entry.id); }}
                      className="rounded p-1 text-gray-500 hover:bg-zinc-700 hover:text-red-400"
                      title="Remove from blacklist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BlacklistPage() {
  return <ErrorBoundary><BlacklistPageInner /></ErrorBoundary>;
}

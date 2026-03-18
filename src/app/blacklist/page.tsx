'use client';

import { useState, useEffect } from 'react';
import { ShieldBan, Plus, Trash2, Search, AlertTriangle, Shield, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

function BlacklistPageInner() {
  const { blacklist, addToBlacklist, removeFromBlacklist, loadBlacklist } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { loadBlacklist(); }, [loadBlacklist]);

  const handleAdd = async () => {
    if (!companyName.trim() || saving) return;
    setSaving(true);
    try {
      await addToBlacklist({ companyName: companyName.trim(), domain: domain.trim() || undefined, reason: reason.trim() || undefined });
      setCompanyName(''); setDomain(''); setReason(''); setShowAdd(false);
    } finally { setSaving(false); }
  };

  const filtered = blacklist.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.companyName.toLowerCase().includes(q) || e.domain?.toLowerCase().includes(q) || e.reason?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">

      {/* ══════ HEADER ══════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.03), rgba(245,158,11,0.02), rgba(2,2,5,0.8))', border: '1px solid rgba(239,68,68,0.08)' }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="mono-ui text-[8px] text-red-400/50 mb-1.5 flex items-center gap-2">
              <span className="w-3 h-px bg-red-500/30" />Compliance Shield
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl text-white">Blacklist</h1>
            <p className="text-sm text-gray-500 mt-1">Companies skipped during outreach &middot; {blacklist.length} entries</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-red-400 shrink-0 transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Plus className="h-4 w-4" /> Add to Blacklist
          </motion.button>
        </div>
      </motion.div>

      {/* ══════ INFO BANNER ══════ */}
      <div className="flex items-start gap-3 rounded-2xl px-5 py-4"
        style={{ background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.1)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(245,158,11,0.1)' }}>
          <Shield className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm text-amber-400/90 font-medium mb-0.5">Automatic Protection</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Blacklisted companies are automatically checked before outbound outreach and cold email campaigns.
            Leads from blacklisted companies will be flagged and skipped.
          </p>
        </div>
      </div>

      {/* ══════ ADD FORM ══════ */}
      <AnimatePresence>
      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }} className="overflow-hidden">
          <div className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: 'rgba(2,2,5,0.7)', border: '1px solid rgba(239,68,68,0.1)', backdropFilter: 'blur(20px)' }}>
            {/* Red aurora */}
            <div className="absolute top-0 left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.2), transparent)' }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <ShieldBan className="h-5 w-5 text-red-400" />
                  <h3 className="text-base font-medium text-white">Add Company to Blacklist</h3>
                </div>
                <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div>
                  <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Company Name *</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Acme Corp" autoFocus className="w-full rounded-xl px-4 py-2.5 text-sm cosmic-input" />
                </div>
                <div>
                  <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Domain</label>
                  <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g., acme.com" className="w-full rounded-xl px-4 py-2.5 text-sm cosmic-input" />
                </div>
              </div>
              <div className="mb-4">
                <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">Reason</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Competitor, Do Not Contact" className="w-full rounded-xl px-4 py-2.5 text-sm cosmic-input" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleAdd} disabled={!companyName.trim() || saving}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 transition-all disabled:opacity-40"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  {saving ? 'Saving...' : 'Add to Blacklist'}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ══════ SEARCH ══════ */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search blacklist by company, domain, or reason..."
          className="h-10 w-full rounded-xl pl-11 pr-4 text-sm cosmic-input" />
      </div>

      {/* ══════ BLACKLIST ENTRIES ══════ */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl p-16 text-center relative overflow-hidden"
          style={{ background: 'rgba(2,2,5,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 pointer-events-none opacity-10">
            <div className="w-full h-full rounded-full border border-red-400/20 orbit-rotate-slow" />
          </div>
          <ShieldBan className="mx-auto mb-3 h-10 w-10 text-gray-700" />
          <p className="text-sm text-gray-400">{search ? 'No matching entries' : 'No blacklisted companies yet'}</p>
          <p className="text-xs text-gray-600 mt-1">Add companies to protect your outreach quality.</p>
        </motion.div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-2">
          {filtered.map((entry) => (
            <motion.div key={entry.id} variants={fadeUp}
              whileHover={{ x: 3, transition: { duration: 0.2 } }}
              className="group relative rounded-xl p-4 flex items-center gap-4 transition-all duration-300"
              style={{ background: 'rgba(2,2,5,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}>
              {/* Red side accent */}
              <div className="absolute left-0 top-[25%] bottom-[25%] w-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }} />

              {/* Shield icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
                <ShieldBan className="h-4 w-4 text-red-400/70" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-gray-100 truncate">{entry.companyName}</p>
                  {entry.domain && (
                    <span className="mono-ui text-[7px] text-gray-500 flex items-center gap-1 shrink-0">
                      <Globe className="h-2.5 w-2.5" />{entry.domain}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {entry.reason && <p className="text-xs text-gray-500 truncate">{entry.reason}</p>}
                  <span className="mono-ui text-[7px] text-gray-700 shrink-0">{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Delete */}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => setDeleteConfirm(entry.id)}
                className="rounded-lg p-2 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all shrink-0"
                style={{ border: '1px solid rgba(255,255,255,0.04)' }} title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ══════ DELETE CONFIRM ══════ */}
      <AnimatePresence>
      {deleteConfirm && (() => {
        const entry = blacklist.find(e => e.id === deleteConfirm);
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="mx-4 w-full max-w-sm rounded-2xl p-6"
              style={{ background: 'rgba(2,2,5,0.95)', border: '1px solid rgba(239,68,68,0.15)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Remove from Blacklist</h3>
                  <p className="text-xs text-gray-500">This company will no longer be blocked.</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-5">
                Remove <span className="text-white font-medium">{entry?.companyName}</span> from the blacklist?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={() => { removeFromBlacklist(deleteConfirm); setDeleteConfirm(null); }}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium text-red-400 transition-colors"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  Remove
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
      </AnimatePresence>
    </div>
  );
}

export default function BlacklistPage() {
  return <ErrorBoundary><BlacklistPageInner /></ErrorBoundary>;
}

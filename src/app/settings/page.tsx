'use client';

import { useState } from 'react';
import { Save, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Key, Bell, Bot, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { settings as settingsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { motion } from 'framer-motion';

interface IntegrationField { label: string; key: string; category: string; envVar: string; }

const integrationFields: IntegrationField[] = [
  { label: 'Anthropic API Key', key: 'anthropic', category: 'AI', envVar: 'ANTHROPIC_API_KEY' },
  { label: 'HubSpot API Key', key: 'hubspot', category: 'CRM', envVar: 'HUBSPOT_API_KEY' },
  { label: 'GoHighLevel API Key', key: 'ghl', category: 'CRM', envVar: 'GHL_API_KEY' },
  { label: 'Instantly API Key', key: 'instantly', category: 'Email Outreach', envVar: 'INSTANTLY_API_KEY' },
  { label: 'Smartlead API Key', key: 'smartlead', category: 'Email Outreach', envVar: 'SMARTLEAD_API_KEY' },
  { label: 'PhantomBuster API Key', key: 'phantombuster', category: 'LinkedIn', envVar: 'PHANTOMBUSTER_API_KEY' },
  { label: 'Bland.ai API Key', key: 'blandai', category: 'Voice AI', envVar: 'BLANDAI_API_KEY' },
  { label: 'VAPI API Key', key: 'vapi', category: 'Voice AI', envVar: 'VAPI_API_KEY' },
  { label: 'Meta App ID', key: 'meta_app_id', category: 'Ads', envVar: 'META_APP_ID' },
  { label: 'Meta Access Token', key: 'meta_access_token', category: 'Ads', envVar: 'META_ACCESS_TOKEN' },
  { label: 'Google Ads Client ID', key: 'google_client_id', category: 'Ads', envVar: 'GOOGLE_ADS_CLIENT_ID' },
];

const CATEGORY_ICONS: Record<string, { icon: typeof Key; accent: string }> = {
  'AI': { icon: Bot, accent: '#8b5cf6' },
  'CRM': { icon: Users, accent: '#00f2ff' },
  'Email Outreach': { icon: Mail, accent: '#f59e0b' },
  'LinkedIn': { icon: Users, accent: '#3b82f6' },
  'Voice AI': { icon: Phone, accent: '#ec4899' },
  'Ads': { icon: Target, accent: '#10b981' },
};

import { Users, Mail, Phone, Target } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

function SettingsPageInner() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, slack: false, webhook: false });
  const [agentConfig, setAgentConfig] = useState({ maxRetries: '3', timeoutSeconds: '300', model: 'gemini-2.0-flash' });

  const categories = [...new Set(integrationFields.map(f => f.category))];

  const handleSave = async () => {
    setSaving(true);
    try { await settingsApi.update({ integrations: values, notifications, agentDefaults: agentConfig }); } catch {}
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* ══════ HEADER ══════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.03), rgba(139,92,246,0.02), rgba(2,2,5,0.8))', border: '1px solid rgba(0,242,255,0.08)' }}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="mono-ui text-[8px] text-cyan-400/50 mb-1.5 flex items-center gap-2">
              <span className="w-3 h-px bg-cyan-500/30" />System Configuration
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl text-white">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Configure API keys, integrations, and preferences</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
            className={cn('flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all shrink-0',
              saved ? 'text-emerald-400' : 'text-cyan-400')}
            style={{ background: saved ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg, rgba(0,242,255,0.08), rgba(139,92,246,0.05))',
              border: `1px solid ${saved ? 'rgba(16,185,129,0.25)' : 'rgba(0,242,255,0.2)'}` }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </motion.button>
        </div>
      </motion.div>

      {/* ══════ INTEGRATION KEYS ══════ */}
      <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-5">
        {categories.map((category, ci) => {
          const catCfg = CATEGORY_ICONS[category] || { icon: Key, accent: '#00f2ff' };
          const CatIcon = catCfg.icon;
          return (
            <motion.div key={category} variants={fadeUp}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
              {/* Subtle blob */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${catCfg.accent}30, transparent 70%)` }} />
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${catCfg.accent}10`, border: `1px solid ${catCfg.accent}15` }}>
                    <CatIcon className="h-4 w-4" style={{ color: catCfg.accent }} />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-200">{category}</h3>
                  <span className="mono-ui text-[7px] text-gray-600">{integrationFields.filter(f => f.category === category).length} keys</span>
                </div>
                <div className="space-y-3">
                  {integrationFields.filter(f => f.category === category).map(field => (
                    <div key={field.key} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">{field.label}</label>
                        <div className="relative">
                          <input type={showKeys[field.key] ? 'text' : 'password'} value={values[field.key] || ''}
                            onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                            placeholder={field.envVar} className="w-full h-10 rounded-xl pl-4 pr-10 text-sm cosmic-input" />
                          <button onClick={() => setShowKeys({ ...showKeys, [field.key]: !showKeys[field.key] })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                            {showKeys[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="mt-6">
                        {values[field.key] ? (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <XCircle className="h-3.5 w-3.5 text-gray-700" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ══════ NOTIFICATIONS ══════ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl p-5" style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Bell className="h-4 w-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-200">Notification Preferences</h3>
        </div>
        <div className="space-y-4">
          {(['email', 'slack', 'webhook'] as const).map(key => (
            <div key={key} className="flex items-center justify-between rounded-xl p-3 transition-colors"
              style={{ background: notifications[key] ? 'rgba(0,242,255,0.02)' : 'transparent', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <span className="text-sm text-gray-200 capitalize">{key} Notifications</span>
                <p className="mono-ui text-[7px] text-gray-600 mt-0.5">
                  {key === 'email' ? 'Pipeline completion alerts' : key === 'slack' ? 'Real-time agent updates' : 'Custom webhook events'}
                </p>
              </div>
              <button onClick={() => setNotifications({ ...notifications, [key]: !notifications[key] })}
                className={cn('relative h-6 w-11 rounded-full transition-all duration-300',
                  notifications[key] ? '' : '')}
                style={{ background: notifications[key] ? 'rgba(0,242,255,0.3)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${notifications[key] ? 'rgba(0,242,255,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform duration-300',
                  notifications[key] ? 'translate-x-5' : 'translate-x-0')}
                  style={{ background: notifications[key] ? '#00f2ff' : 'rgba(255,255,255,0.3)',
                    boxShadow: notifications[key] ? '0 0 8px rgba(0,242,255,0.4)' : undefined }} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══════ AGENT DEFAULTS ══════ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-2xl p-5" style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <Bot className="h-4 w-4 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-200">Agent Configuration</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Max Retries', value: agentConfig.maxRetries, key: 'maxRetries', type: 'number' },
            { label: 'Timeout (seconds)', value: agentConfig.timeoutSeconds, key: 'timeoutSeconds', type: 'number' },
          ].map(field => (
            <div key={field.key}>
              <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">{field.label}</label>
              <input type={field.type} value={field.value}
                onChange={(e) => setAgentConfig({ ...agentConfig, [field.key]: e.target.value })}
                className="w-full h-10 rounded-xl px-4 text-sm cosmic-input" />
            </div>
          ))}
          <div>
            <label className="mono-ui text-[8px] text-gray-500 block mb-1.5">AI Model</label>
            <select value={agentConfig.model} onChange={(e) => setAgentConfig({ ...agentConfig, model: e.target.value })}
              className="w-full h-10 rounded-xl px-4 text-sm text-gray-200 cosmic-input appearance-none cursor-pointer">
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Anthropic)</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5 (Anthropic)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Free)</option>
              <option value="gemini-2.0-pro">Gemini 2.0 Pro (Free)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Free)</option>
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SettingsPage() {
  return <ErrorBoundary><SettingsPageInner /></ErrorBoundary>;
}

'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Key, Bell, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { settings as settingsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { motion } from 'framer-motion';

interface IntegrationField {
  label: string;
  key: string;
  category: string;
  envVar: string;
}

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
    try {
      await settingsApi.update({ integrations: values, notifications, agentDefaults: agentConfig });
    } catch {}
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-400">Configure API keys, integrations, and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
            saved ? 'bg-emerald-600' : 'bg-cyan-600 hover:bg-cyan-700',
            saving && 'opacity-70'
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      {/* Integration API Keys */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-6"
      >
        {categories.map(category => (
          <motion.div
            key={category}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] } } }}
            className="rounded-xl p-5"
          >
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <Key className="h-4 w-4 text-cyan-400" />
              {category}
            </h3>
            <div className="space-y-3">
              {integrationFields.filter(f => f.category === category).map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-400">{field.label}</label>
                    <div className="relative">
                      <input
                        type={showKeys[field.key] ? 'text' : 'password'}
                        value={values[field.key] || ''}
                        onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                        placeholder={field.envVar}
                        className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/5 pl-3 pr-10 text-sm text-gray-200 placeholder-zinc-600 focus:border-cyan-400 focus:outline-none"
                      />
                      <button
                        onClick={() => setShowKeys({ ...showKeys, [field.key]: !showKeys[field.key] })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showKeys[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    {values[field.key] ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className="rounded-xl p-5"
      >
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Bell className="h-4 w-4 text-cyan-400" />
          Notification Preferences
        </h3>
        <div className="space-y-3">
          {(['email', 'slack', 'webhook'] as const).map(key => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm capitalize text-gray-300">{key} Notifications</span>
              <button
                onClick={() => setNotifications({ ...notifications, [key]: !notifications[key] })}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  notifications[key] ? 'bg-cyan-600' : 'bg-zinc-700'
                )}
              >
                <span className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  notifications[key] && 'translate-x-5'
                )} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Agent Defaults */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
        className="rounded-xl p-5"
      >
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Bot className="h-4 w-4 text-cyan-400" />
          Agent Configuration Defaults
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Max Retries</label>
            <input
              type="number"
              value={agentConfig.maxRetries}
              onChange={(e) => setAgentConfig({ ...agentConfig, maxRetries: e.target.value })}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 text-sm text-gray-200 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Timeout (seconds)</label>
            <input
              type="number"
              value={agentConfig.timeoutSeconds}
              onChange={(e) => setAgentConfig({ ...agentConfig, timeoutSeconds: e.target.value })}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 text-sm text-gray-200 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">AI Model</label>
            <select
              value={agentConfig.model}
              onChange={(e) => setAgentConfig({ ...agentConfig, model: e.target.value })}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/5 px-3 text-sm text-gray-200 focus:outline-none"
            >
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

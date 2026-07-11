import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { riskAPI, metricsAPI } from '../api/client';
import toast from 'react-hot-toast';
import { Trash2, Users, TrendingUp, ShieldAlert, Activity, Loader2, RefreshCw } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { SectionHeader } from '../components/SectionHeader';

export const CounselorDashboard: React.FC = () => {
  const [flags, setFlags] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingFlagId, setDeletingFlagId] = useState<string | null>(null);
  const { socket } = useSocket();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      toast.custom(() => (
        <div className="flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-lg">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900">High-Risk Alert</p>
            <p className="text-sm text-red-700"><strong>{data.studentName || 'A student'}</strong> sent a high-risk message</p>
            <p className="text-xs text-red-600 mt-0.5">Severity {data.severity} · {data.tags?.join(', ')}</p>
          </div>
        </div>
      ), { position: 'top-right', duration: 6000 });
      loadData();
    };
    socket.on('riskFlag:created', handler);
    return () => { socket.off('riskFlag:created', handler); };
  }, [socket]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [flagsRes, metricsRes] = await Promise.all([
        riskAPI.getFlags({ status: 'open' }),
        metricsAPI.getAggregate({ days: 7 }),
      ]);
      setFlags(flagsRes.data.flags || []);
      setMetrics(metricsRes.data || {});
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to load dashboard data';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFlag = async (flagId: string) => {
    if (!confirm('Delete this risk flag?')) return;
    setDeletingFlagId(flagId);
    try {
      await riskAPI.deleteFlag(flagId);
      toast.success('Flag removed');
      loadData();
    } catch { toast.error('Failed to delete flag'); }
    finally { setDeletingFlagId(null); }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-wellness-sage-400" />
        <p className="text-sm text-muted">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-muted" />
        <p className="text-base font-semibold text-text">Could not load dashboard</p>
        <p className="text-sm text-muted max-w-xs">{error}</p>
        <button onClick={loadData} className="flex items-center gap-2 rounded-xl bg-wellness-sage-500 px-4 py-2 text-sm font-semibold text-white">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const users = metrics?.users || {};
  const mood  = metrics?.mood  || {};
  const risk  = metrics?.risk  || {};

  const statCards = [
    { icon: Users,       label: 'Total students',  value: users.total  || 0, color: 'text-wellness-sage-500',     bg: 'bg-wellness-sage-50' },
    { icon: Activity,    label: 'Active (7 days)',  value: users.active || 0, color: 'text-wellness-sky-500',      bg: 'bg-wellness-sky-50' },
    { icon: TrendingUp,  label: 'Avg mood',         value: `${(mood.average || 0).toFixed(1)}/5`, color: 'text-wellness-lavender-500', bg: 'bg-wellness-lavender-50' },
    { icon: ShieldAlert, label: 'Open risk flags',  value: risk.openFlags || 0, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Counselor Dashboard</h1>
          <p className="text-sm text-muted">Weekly overview — last 7 days</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface-alt">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card-wellness flex items-center gap-3 p-5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted">{label}</p>
              <p className="text-xl font-bold text-text">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Open flags */}
      <div className="card-wellness p-6">
        <SectionHeader icon={ShieldAlert} title="Open risk flags" description="Flags requiring your attention" />

        {flags.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border py-10 text-center">
            <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-wellness-sage-300" />
            <p className="text-sm text-muted">No open flags — all clear.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {flags.map((flag) => (
              <motion.div
                key={flag._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition ${
                  flag.severity >= 3
                    ? 'border-red-200 bg-red-50'
                    : flag.severity >= 2
                    ? 'border-wellness-peach-200 bg-wellness-peach-50'
                    : 'border-border bg-surface-alt'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-text">{flag.userId?.name || 'Unknown'}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                      flag.severity >= 3 ? 'border-red-300 bg-red-100 text-red-700' :
                      flag.severity >= 2 ? 'border-wellness-peach-300 bg-wellness-peach-100 text-wellness-peach-700' :
                      'border-wellness-sage-300 bg-wellness-sage-100 text-wellness-sage-700'
                    }`}>
                      Severity {flag.severity}
                    </span>
                    {flag.tags?.map((tag: string) => (
                      <span key={tag} className="rounded-full border border-wellness-sky-200 bg-wellness-sky-50 px-2 py-0.5 text-xs font-medium text-wellness-sky-700">{tag}</span>
                    ))}
                  </div>
                  <p className="text-sm text-muted truncate">{flag.messageId?.text?.substring(0, 100) || 'No message preview'}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(flag.createdAt).toLocaleString('en-SG')}</p>
                </div>
                <button
                  onClick={() => handleDeleteFlag(flag._id)}
                  disabled={deletingFlagId === flag._id}
                  className="shrink-0 rounded-xl border border-red-200 p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                  title="Delete flag"
                >
                  {deletingFlagId === flag._id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

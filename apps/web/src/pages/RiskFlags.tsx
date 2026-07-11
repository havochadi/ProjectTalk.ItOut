import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { riskAPI } from '../api/client';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Clock, ChevronRight, ShieldAlert, Loader2 } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

interface RiskFlag {
  _id: string;
  userId: { _id: string; name: string; email: string };
  messageId: string;
  tags: string[];
  severity: number;
  status: 'open' | 'in_review' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

interface GroupedStudent {
  userId: string;
  userName: string;
  userEmail: string;
  flags: RiskFlag[];
  highestSeverity: number;
  openCount: number;
  inReviewCount: number;
  resolvedCount: number;
}

const severityStyle = (s: number) =>
  s >= 3 ? 'border-red-200 bg-red-50 text-red-700' :
  s >= 2 ? 'border-wellness-peach-200 bg-wellness-peach-50 text-wellness-peach-700' :
  'border-wellness-sage-200 bg-wellness-sage-50 text-wellness-sage-700';

const severityLabel = (s: number) => s >= 3 ? 'High' : s >= 2 ? 'Medium' : 'Low';

const statusIcon = (s: string) =>
  s === 'resolved' ? <CheckCircle className="h-4 w-4" /> :
  s === 'in_review' ? <Clock className="h-4 w-4" /> :
  <AlertTriangle className="h-4 w-4" />;

const statusStyle = (s: string) =>
  s === 'resolved' ? 'border-wellness-sage-200 bg-wellness-sage-50 text-wellness-sage-700' :
  s === 'in_review' ? 'border-wellness-sky-200 bg-wellness-sky-50 text-wellness-sky-700' :
  'border-red-200 bg-red-50 text-red-700';

const studentRowSelectedClass = 'border-primary-l bg-primary text-white shadow-glow';
const studentRowDefaultClass = 'border-border bg-surface-alt hover:border-primary-l hover:bg-surface';

export const RiskFlagsPage: React.FC = () => {
  const [flags, setFlags] = useState<RiskFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingFlagId, setUpdatingFlagId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_review' | 'resolved'>('all');
  const [selectedStudent, setSelectedStudent] = useState<GroupedStudent | null>(null);
  const { socket } = useSocket();

  useEffect(() => { loadFlags(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      toast.success(`High-risk alert: ${data.studentName || 'A student'} sent a high-risk message`);
      loadFlags();
    };
    socket.on('riskFlag:created', handler);
    return () => { socket.off('riskFlag:created', handler); };
  }, [socket]);

  const loadFlags = async () => {
    setIsLoading(true);
    try {
      const res = await riskAPI.getFlags();
      setFlags(res.data.flags || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to load risk flags');
    } finally { setIsLoading(false); }
  };

  const handleStatusUpdate = async (flagId: string, newStatus: 'open' | 'in_review' | 'resolved') => {
    if (updatingFlagId) return;
    setUpdatingFlagId(flagId);
    try {
      await riskAPI.updateFlag(flagId, { status: newStatus });
      setFlags((prev) => prev.map((f) => f._id === flagId ? { ...f, status: newStatus, updatedAt: new Date().toISOString() } : f));
      toast.success('Flag updated');
      void loadFlags();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to update flag');
    } finally { setUpdatingFlagId(null); }
  };

  const groupedStudents: GroupedStudent[] = React.useMemo(() => {
    const map = new Map<string, GroupedStudent>();
    flags.forEach((flag) => {
      if (!flag.userId) return;
      const id = flag.userId._id;
      if (!map.has(id)) map.set(id, { userId: id, userName: flag.userId.name, userEmail: flag.userId.email, flags: [], highestSeverity: 0, openCount: 0, inReviewCount: 0, resolvedCount: 0 });
      const s = map.get(id)!;
      s.flags.push(flag);
      s.highestSeverity = Math.max(s.highestSeverity, flag.severity);
      if (flag.status === 'open') s.openCount++;
      else if (flag.status === 'in_review') s.inReviewCount++;
      else s.resolvedCount++;
    });
    return Array.from(map.values()).sort((a, b) => b.highestSeverity - a.highestSeverity || b.openCount - a.openCount);
  }, [flags]);

  const filteredStudents = React.useMemo(() => {
    if (filter === 'all') return groupedStudents;
    return groupedStudents.filter((s) => {
      if (filter === 'open') return s.openCount > 0;
      if (filter === 'in_review') return s.inReviewCount > 0;
      if (filter === 'resolved') return s.resolvedCount > 0 && s.openCount === 0 && s.inReviewCount === 0;
      return true;
    });
  }, [groupedStudents, filter]);

  React.useEffect(() => {
    if (!selectedStudent?.userId) return;
    setSelectedStudent(groupedStudents.find((s) => s.userId === selectedStudent.userId) || null);
  }, [groupedStudents, selectedStudent?.userId]);

  const counts = { all: groupedStudents.length, open: groupedStudents.filter(s => s.openCount > 0).length, in_review: groupedStudents.filter(s => s.inReviewCount > 0).length, resolved: groupedStudents.filter(s => s.resolvedCount > 0 && s.openCount === 0 && s.inReviewCount === 0).length };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-wellness-sage-400" />
        <p className="text-sm text-muted">Loading risk flags…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Risk Flags</h1>
        <p className="text-sm text-muted">Monitor and manage student risk indicators</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Students list */}
        <div className="card-wellness p-5">
          <p className="mb-3 text-sm font-bold text-text">Students with flags</p>

          {/* Filter tabs */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(['all', 'open', 'in_review', 'resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filter === s
                    ? 'bg-wellness-sage-500 text-white shadow-glow'
                    : 'border border-border bg-surface-alt text-muted hover:border-wellness-sage-300 hover:text-wellness-sage-600'
                }`}
              >
                {s === 'in_review' ? 'In Review' : s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
              </button>
            ))}
          </div>

          <div className="max-h-[600px] space-y-2 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="py-10 text-center">
                <ShieldAlert className="mx-auto mb-2 h-7 w-7 text-muted" />
                <p className="text-sm text-muted">No students in this filter</p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudent?.userId === student.userId;

                return (
                  <motion.div
                    key={student.userId}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setSelectedStudent(student)}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      isSelected ? studentRowSelectedClass : studentRowDefaultClass
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${isSelected ? 'text-white' : 'text-text'}`}>{student.userName}</p>
                        <p className={`truncate text-xs ${isSelected ? 'text-white/80' : 'text-muted'}`}>{student.userEmail}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {student.openCount > 0 && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{student.openCount} Open</span>}
                          {student.inReviewCount > 0 && <span className="rounded-full border border-wellness-sky-200 bg-wellness-sky-50 px-2 py-0.5 text-xs font-medium text-wellness-sky-700">{student.inReviewCount} Review</span>}
                          {student.resolvedCount > 0 && <span className="rounded-full border border-wellness-sage-200 bg-wellness-sage-50 px-2 py-0.5 text-xs font-medium text-wellness-sage-700">{student.resolvedCount} Done</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${severityStyle(student.highestSeverity)}`}>
                          {severityLabel(student.highestSeverity)}
                        </span>
                        <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-white/80' : 'text-muted'}`} />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Flag detail */}
        <div className="lg:col-span-2">
          {!selectedStudent ? (
            <div className="card-wellness flex flex-col items-center justify-center py-24 text-center">
              <ShieldAlert className="mb-3 h-12 w-12 text-muted" />
              <p className="text-sm text-muted">Select a student to view their risk flags</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Student header */}
              <div className="card-wellness p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-text">{selectedStudent.userName}</h2>
                    <p className="text-xs text-muted">{selectedStudent.userEmail}</p>
                  </div>
                  <span className={`rounded-lg border px-3 py-1 text-sm font-bold ${severityStyle(selectedStudent.highestSeverity)}`}>
                    Highest: {severityLabel(selectedStudent.highestSeverity)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Open',      val: selectedStudent.openCount,      bg: 'bg-red-50',                  text: 'text-red-600' },
                    { label: 'In Review', val: selectedStudent.inReviewCount,  bg: 'bg-wellness-sky-50',         text: 'text-wellness-sky-600' },
                    { label: 'Resolved',  val: selectedStudent.resolvedCount,  bg: 'bg-wellness-sage-50',        text: 'text-wellness-sage-600' },
                  ].map(({ label, val, bg, text }) => (
                    <div key={label} className={`rounded-xl ${bg} py-3 text-center`}>
                      <p className={`text-2xl font-bold ${text}`}>{val}</p>
                      <p className="text-xs text-muted">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual flags */}
              <AnimatePresence>
                {selectedStudent.flags.map((flag) => (
                  <motion.div
                    key={flag._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="card-wellness p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle(flag.status)}`}>
                            {statusIcon(flag.status)}
                            {flag.status === 'in_review' ? 'In Review' : flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}
                          </span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${severityStyle(flag.severity)}`}>
                            {severityLabel(flag.severity)} Risk
                          </span>
                          {flag.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-wellness-lavender-200 bg-wellness-lavender-50 px-2.5 py-0.5 text-xs font-medium text-wellness-lavender-700">{tag}</span>
                          ))}
                        </div>
                        <p className="text-xs text-muted">Flagged {new Date(flag.createdAt).toLocaleString('en-SG')}</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {flag.status !== 'in_review' && (
                          <button
                            disabled={!!updatingFlagId}
                            onClick={() => handleStatusUpdate(flag._id, 'in_review')}
                            className="rounded-lg border border-wellness-sky-300 bg-wellness-sky-50 px-2.5 py-1.5 text-xs font-semibold text-wellness-sky-700 transition hover:bg-wellness-sky-100 disabled:opacity-60"
                          >
                            Review
                          </button>
                        )}
                        {flag.status !== 'resolved' && (
                          <button
                            disabled={!!updatingFlagId}
                            onClick={() => handleStatusUpdate(flag._id, 'resolved')}
                            className="rounded-lg border border-wellness-sage-300 bg-wellness-sage-50 px-2.5 py-1.5 text-xs font-semibold text-wellness-sage-700 transition hover:bg-wellness-sage-100 disabled:opacity-60"
                          >
                            Resolve
                          </button>
                        )}
                        {flag.status !== 'open' && (
                          <button
                            disabled={!!updatingFlagId}
                            onClick={() => handleStatusUpdate(flag._id, 'open')}
                            className="rounded-lg border border-border bg-surface-alt px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface disabled:opacity-60"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

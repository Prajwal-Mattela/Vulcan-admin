import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { STAGES, getDeadlineDays, getTierLabel } from '../constants/stages';

interface UpdateProgressProps {
  initialClientId?: string;
  onJumpConsumed?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(raw: string | { seconds: number } | null | undefined): string {
  if (!raw) return '—';
  let date: Date;
  if (typeof raw === 'string') date = new Date(raw);
  else date = new Date(raw.seconds * 1000);
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function getDeadlineInfo(
  createdAt: { seconds: number } | null | undefined,
  packageTier: string,
  packageDeadlineDays?: number,
) {
  if (!createdAt) return null;
  const days = packageDeadlineDays ?? getDeadlineDays(packageTier);
  const start = new Date(createdAt.seconds * 1000);
  const deadline = new Date(start.getTime() + days * 86400 * 1000);
  const now = new Date();
  const totalMs = deadline.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const pct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
  const overdue = now > deadline;
  return { deadline, days, pct, daysLeft, overdue, start };
}

// ─── Deadline Bar ─────────────────────────────────────────────────────────────

function DeadlineBar({
  createdAt,
  packageTier,
  packageDeadlineDays,
  status,
}: {
  createdAt: { seconds: number } | null | undefined;
  packageTier: string;
  packageDeadlineDays?: number;
  status?: string;
}) {
  const info = getDeadlineInfo(createdAt, packageTier, packageDeadlineDays);
  if (!info) return null;

  const { pct, daysLeft, overdue, deadline, days } = info;
  const tier = getTierLabel(packageTier);
  const completed = status === 'completed';

  const barColor = completed
    ? '#3B82F6'
    : overdue
    ? '#EF4444'
    : pct >= 80
    ? '#F59E0B'
    : '#22C55E';

  const label = completed
    ? 'Project Completed ✓'
    : overdue
    ? `${Math.abs(daysLeft)}d overdue`
    : `${daysLeft}d remaining`;

  const labelColor = completed
    ? '#60A5FA'
    : overdue
    ? '#F87171'
    : pct >= 80
    ? '#FCD34D'
    : '#4ADE80';

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#6B6B6B]">
            {tier} Plan · {days}-Day Deadline
          </span>
        </div>
        <span className="text-xs font-semibold" style={{ color: labelColor }}>
          {label}
        </span>
      </div>

      {/* Bar */}
      <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${completed ? 100 : pct}%`, background: barColor }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#3A3A3A]">
        <span>Started {new Date(info.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        <span className="font-mono">{pct}% time elapsed</span>
        <span>Due {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const UpdateProgress: React.FC<UpdateProgressProps> = ({ initialClientId, onJumpConsumed }) => {
  const [searchId, setSearchId] = useState('');
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundId, setFoundId] = useState('');
  const [stage, setStage] = useState<number>(0);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  // Auto-search when navigated from ClientList
  useEffect(() => {
    if (initialClientId && initialClientId.trim()) {
      setSearchId(initialClientId);
      handleSearchById(initialClientId);
      onJumpConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId]);

  const handleSearchById = async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setClient(null);
    try {
      const ref = doc(db, 'clients', trimmed);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setClient(data);
        setFoundId(trimmed);
        setStage(data.currentStage as number);
      } else {
        setError('No client found with this ID');
      }
    } catch (err) {
      setError('Error fetching client');
      console.error(err);
    }
    setLoading(false);
  };

  const handleSearch = () => handleSearchById(searchId);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setUpdating(true);
    try {
      const ref = doc(db, 'clients', foundId);
      await updateDoc(ref, {
        currentStage: stage,
        currentStageName: STAGES[stage],
        lastUpdated: serverTimestamp(),
        stageHistory: arrayUnion({
          stage,
          stageName: STAGES[stage],
          updatedAt: new Date().toISOString(),
          note: note || '',
        }),
        ...(stage === 7 ? { status: 'completed' } : {}),
      });
      setToast(`Progress updated to "${STAGES[stage]}"`);
      setTimeout(() => setToast(''), 3000);
      await handleSearchById(foundId);
      setNote('');
    } catch (err) {
      setError('Error updating progress');
      console.error(err);
    }
    setUpdating(false);
  };

  const clientData = client as {
    clientName: string;
    serviceType: string;
    packageTier: string;
    packageDeadlineDays?: number;
    createdAt?: { seconds: number; toDate?: () => Date };
    lastUpdated?: { seconds: number };
    currentStageName: string;
    currentStage: number;
    status?: string;
    stageHistory?: Array<{ stage: number; stageName: string; updatedAt: string; note: string }>;
  } | null;

  return (
    <section>
      <h2 className="text-xl font-semibold text-[#F5F0EB]">Update Project Progress</h2>
      <div className="text-sm text-[#6B6B6B] mt-1 mb-8">Update the current stage for a client project</div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Enter Client ID — e.g. VLX-2025-A3X9"
          className="flex-1 bg-[#111111] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F0EB] text-sm focus:outline-none focus:border-[#E8450A] transition-colors"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          className="bg-[#E8450A] text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-[#FF6B35] transition-colors disabled:opacity-50"
          onClick={handleSearch}
          disabled={loading || !searchId.trim()}
        >
          {loading
            ? <span className="animate-spin inline-block w-5 h-5 border-2 border-t-transparent border-white rounded-full"></span>
            : 'Find Client'
          }
        </button>
      </div>

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      {clientData && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mt-2">
          {/* Client Info */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <div className="font-semibold text-[#F5F0EB] text-base">{clientData.clientName}</div>
              <div className="text-sm text-[#6B6B6B] mt-0.5">{clientData.serviceType}</div>
              <div className="text-sm text-[#E8450A] mt-0.5">{clientData.packageTier}</div>
              <div className="text-xs text-[#3A3A3A] mt-1">
                {clientData.createdAt?.toDate
                  ? `Created ${clientData.createdAt.toDate().toLocaleDateString('en-IN', { dateStyle: 'medium' })}`
                  : clientData.createdAt?.seconds
                  ? `Created ${new Date(clientData.createdAt.seconds * 1000).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`
                  : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Current Stage</div>
              <span className="bg-[#E8450A]/20 text-[#E8450A] px-3 py-1 rounded text-sm font-medium">
                {clientData.currentStageName}
              </span>
              {clientData.lastUpdated && (
                <div className="text-[10px] text-[#3A3A3A] mt-1.5">
                  Updated {formatTs(clientData.lastUpdated)}
                </div>
              )}
            </div>
          </div>

          {/* Deadline Bar */}
          <DeadlineBar
            createdAt={clientData.createdAt as { seconds: number } | undefined}
            packageTier={clientData.packageTier}
            packageDeadlineDays={clientData.packageDeadlineDays}
            status={clientData.status}
          />

          {/* Progress Stepper */}
          <div className="flex items-start gap-0 mt-8 mb-6 overflow-x-auto pb-2">
            {STAGES.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center min-w-[64px]">
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full border-2 text-xs font-bold transition-all
                      ${i < clientData.currentStage
                        ? 'bg-[#E8450A] border-[#E8450A] text-white'
                        : i === clientData.currentStage
                          ? 'bg-[#E8450A] border-[#E8450A] text-white ring-2 ring-[#E8450A]/30 ring-offset-2 ring-offset-[#1A1A1A]'
                          : 'bg-[#0A0A0A] border-[#2A2A2A] text-[#3A3A3A]'
                      }`}
                  >
                    {i < clientData.currentStage ? '✓' : i + 1}
                  </div>
                  <div className="text-[9px] text-[#6B6B6B] text-center max-w-[60px] mt-1 leading-tight">{s}</div>
                  {/* Stage timestamp */}
                  {(() => {
                    const entry = clientData.stageHistory?.find(h => h.stage === i);
                    return entry?.updatedAt ? (
                      <div className="text-[8px] text-[#3A3A3A] text-center max-w-[60px] mt-0.5 leading-tight font-mono">
                        {new Date(entry.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    ) : null;
                  })()}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-3.5 min-w-[8px] ${i < clientData.currentStage ? 'bg-[#E8450A]' : 'bg-[#2A2A2A]'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Update Form */}
          <form className="mt-4 flex flex-col gap-4 border-t border-[#2A2A2A] pt-6" onSubmit={handleUpdate}>
            <div>
              <label className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2 block">New Stage</label>
              <select
                className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F0EB] text-sm focus:outline-none focus:border-[#E8450A] transition-colors"
                value={stage}
                onChange={e => setStage(Number(e.target.value))}
              >
                {STAGES.map((s, i) => (
                  <option key={s} value={i}>{i + 1}. {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2 block">Update Note (optional)</label>
              <textarea
                className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F0EB] text-sm focus:outline-none focus:border-[#E8450A] transition-colors resize-none"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Design mockups approved by client"
              />
            </div>
            <button
              type="submit"
              className={`bg-[#E8450A] text-white font-semibold px-8 py-3 rounded-lg text-sm hover:bg-[#FF6B35] transition-colors self-start ${updating || stage === clientData.currentStage ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={updating || stage === clientData.currentStage}
            >
              {updating
                ? <span className="flex items-center gap-2"><span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full"></span> Updating...</span>
                : 'Update Progress'
              }
            </button>
          </form>

          {/* Stage History with timestamps */}
          {clientData.stageHistory && clientData.stageHistory.length > 0 && (
            <div className="mt-8">
              <div className="text-sm font-medium text-[#6B6B6B] mb-3 uppercase tracking-wider text-xs">Stage History</div>
              <div className="flex flex-col gap-0 border border-[#2A2A2A] rounded-xl overflow-hidden">
                {[...clientData.stageHistory]
                  .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
                  .map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-start bg-[#111111] border-b border-[#2A2A2A] last:border-0 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 ? 'bg-[#E8450A]' : 'bg-[#2A2A2A]'}`} />
                        <div>
                          <div className="text-[#F5F0EB] text-sm font-medium">{entry.stageName}</div>
                          {entry.note && <div className="text-[#6B6B6B] text-xs mt-0.5">{entry.note}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-[#3A3A3A] whitespace-nowrap ml-4 font-mono text-right">
                        <div>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                        <div className="text-[10px] text-[#2A2A2A]">{entry.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-900 border border-green-600 text-green-300 px-4 py-3 rounded-lg text-sm z-50 shadow-xl">
          ✓ {toast}
        </div>
      )}
    </section>
  );
};

export default UpdateProgress;

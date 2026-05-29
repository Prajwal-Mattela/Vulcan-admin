import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { getDeadlineDays, getTierLabel } from '../constants/stages';

interface ClientListProps {
  onClientClick: (clientId: string) => void;
}

interface ClientDoc {
  clientId: string;
  clientName: string;
  serviceType: string;
  packageTier: string;
  packageDeadlineDays?: number;
  currentStageName: string;
  status: 'active' | 'completed' | 'paused';
  lastUpdated?: { toDate?: () => Date; seconds?: number };
  createdAt?: { toDate?: () => Date; seconds?: number };
}

const getPackageAmount = (pkg: string) => {
  const match = pkg.match(/₹([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : 0;
};

function timeAgo(date: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getCreatedDate(c: ClientDoc): Date | null {
  if (!c.createdAt) return null;
  if (c.createdAt.toDate) return c.createdAt.toDate();
  if (c.createdAt.seconds) return new Date(c.createdAt.seconds * 1000);
  return null;
}

// ─── Mini Deadline Cell ───────────────────────────────────────────────────────

function DeadlineCell({ c }: { c: ClientDoc }) {
  const createdDate = getCreatedDate(c);
  if (!createdDate) return <span className="text-[#3A3A3A] text-xs">—</span>;

  const days = c.packageDeadlineDays ?? getDeadlineDays(c.packageTier);
  const deadline = new Date(createdDate.getTime() + days * 86400 * 1000);
  const now = new Date();
  const totalMs = deadline.getTime() - createdDate.getTime();
  const elapsedMs = now.getTime() - createdDate.getTime();
  const pct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
  const overdue = now > deadline;
  const completed = c.status === 'completed';

  const barColor = completed ? '#3B82F6' : overdue ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#22C55E';
  const label = completed ? 'Done' : overdue ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d left`;
  const labelColor = completed ? '#60A5FA' : overdue ? '#F87171' : pct >= 80 ? '#FCD34D' : '#4ADE80';
  const tier = getTierLabel(c.packageTier);

  return (
    <div className="min-w-[110px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-[#3A3A3A] uppercase tracking-wider">{tier} · {days}d</span>
        <span className="text-[10px] font-semibold" style={{ color: labelColor }}>{label}</span>
      </div>
      <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${completed ? 100 : pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

const ClientList: React.FC<ClientListProps> = ({ onClientClick }) => {
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'clients'));
    const unsub = onSnapshot(q, (snap) => {
      setClients(snap.docs.map(doc => doc.data() as ClientDoc));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = clients.filter(c =>
    (filter === 'all' || c.status === filter) &&
    (
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientId.toLowerCase().includes(search.toLowerCase())
    )
  );

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    completed: clients.filter(c => c.status === 'completed').length,
    paused: clients.filter(c => c.status === 'paused').length,
    revenue: clients.reduce((sum, c) => sum + getPackageAmount(c.packageTier), 0),
  };

  const filterLabels: Array<{ key: 'all' | 'active' | 'completed' | 'paused'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'paused', label: 'Paused' },
  ];

  return (
    <section>
      <h2 className="text-xl font-semibold text-[#F5F0EB]">All Clients</h2>
      <div className="text-sm text-[#6B6B6B] mt-1 mb-8">{stats.active} active project{stats.active !== 1 ? 's' : ''}</div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#F5F0EB]">{stats.total}</div>
          <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mt-1">Total Clients</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mt-1">Active</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.completed}</div>
          <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mt-1">Completed</div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#E8450A]">₹{stats.revenue.toLocaleString('en-IN')}</div>
          <div className="text-xs text-[#6B6B6B] uppercase tracking-wider mt-1">Revenue</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {filterLabels.map(({ key, label }) => (
          <button
            key={key}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === key ? 'bg-[#E8450A] text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#6B6B6B] hover:text-[#F5F0EB]'}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search by name or ID..."
          className="ml-auto bg-[#111111] border border-[#2A2A2A] rounded-lg px-4 py-2 text-[#F5F0EB] text-sm focus:outline-none focus:border-[#E8450A] transition-colors"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table / Loading / Empty */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="animate-spin inline-block w-8 h-8 border-4 border-t-transparent border-[#E8450A] rounded-full"></span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-[#6B6B6B] py-16 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <div className="text-3xl mb-3">📋</div>
          <div>No clients yet. Generate your first client ID.</div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[#2A2A2A]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#111111] text-xs text-[#6B6B6B] uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Client ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-left">Package</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Deadline</th>
                  <th className="px-4 py-3 text-left">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.clientId}
                    className="bg-[#1A1A1A] border-t border-[#2A2A2A] hover:bg-[#1F1F1F] cursor-pointer transition-colors"
                    onClick={() => onClientClick(c.clientId)}
                  >
                    <td className="px-4 py-3 font-mono text-[#E8450A] text-sm">{c.clientId}</td>
                    <td className="px-4 py-3 text-[#F5F0EB] text-sm font-medium">{c.clientName}</td>
                    <td className="px-4 py-3 text-[#6B6B6B] text-sm">{c.serviceType}</td>
                    <td className="px-4 py-3 text-[#6B6B6B] text-sm">{c.packageTier}</td>
                    <td className="px-4 py-3">
                      <span className="bg-[#E8450A]/15 text-[#E8450A] text-xs px-2 py-0.5 rounded">{c.currentStageName}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.status === 'active' && <span className="bg-green-900/30 text-green-400 border border-green-800 text-xs px-2 py-0.5 rounded">Active</span>}
                      {c.status === 'completed' && <span className="bg-blue-900/30 text-blue-400 border border-blue-800 text-xs px-2 py-0.5 rounded">Completed</span>}
                      {c.status === 'paused' && <span className="bg-yellow-900/30 text-yellow-400 border border-yellow-800 text-xs px-2 py-0.5 rounded">Paused</span>}
                    </td>
                    <td className="px-4 py-3">
                      <DeadlineCell c={c} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#3A3A3A]">
                      {c.lastUpdated?.toDate ? timeAgo(c.lastUpdated.toDate()) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(c => (
              <div
                key={c.clientId}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 cursor-pointer hover:border-[#E8450A]/40 transition-colors"
                onClick={() => onClientClick(c.clientId)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-mono text-[#E8450A] text-sm">{c.clientId}</div>
                  {c.status === 'active' && <span className="bg-green-900/30 text-green-400 border border-green-800 text-xs px-2 py-0.5 rounded">Active</span>}
                  {c.status === 'completed' && <span className="bg-blue-900/30 text-blue-400 border border-blue-800 text-xs px-2 py-0.5 rounded">Completed</span>}
                  {c.status === 'paused' && <span className="bg-yellow-900/30 text-yellow-400 border border-yellow-800 text-xs px-2 py-0.5 rounded">Paused</span>}
                </div>
                <div className="text-[#F5F0EB] font-medium">{c.clientName}</div>
                <div className="text-[#6B6B6B] text-sm mt-0.5">{c.serviceType}</div>
                <div className="flex items-center justify-between mt-2 mb-3">
                  <span className="bg-[#E8450A]/15 text-[#E8450A] text-xs px-2 py-0.5 rounded">{c.currentStageName}</span>
                  <span className="text-xs text-[#3A3A3A]">{c.lastUpdated?.toDate ? timeAgo(c.lastUpdated.toDate()) : '—'}</span>
                </div>
                <DeadlineCell c={c} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default ClientList;

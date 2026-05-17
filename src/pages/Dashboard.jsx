import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  Users,
  TrendingUp,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Build a 7-day label array ending today: ['Mon', 'Tue', ..., 'Today's weekday']
function getLast7DayLabels() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: days[d.getDay()], date: d.toISOString().slice(0, 10) };
  });
}

function formatKES(amount) {
  if (amount >= 1_000_000) return `KES ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `KES ${(amount / 1_000).toFixed(1)}K`;
  return `KES ${amount.toLocaleString()}`;
}

// ─── Skeleton card ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse">
      <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-7 w-32 bg-slate-100 rounded mb-2" />
      <div className="h-2 w-16 bg-slate-100 rounded" />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);           // null = loading
  const [priorityRequest, setPriorityRequest] = useState(null);
  const [growthData, setGrowthData] = useState([]);
  const [repaymentData, setRepaymentData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setError(null);
      try {
        const daySlots = getLast7DayLabels();
        const since = daySlots[0].date; // 7 days ago (ISO date)

        const [
          { count: leadsCount,          error: e1 },
          { count: activeLoansCount,    error: e2 },
          { count: pendingCount,        error: e3 },
          { data: activeLoans,          error: e4 },
          { data: topRequest,           error: e5 },
          { data: recentLoans,          error: e6 },
          { data: recentRepayments,     error: e7 },
        ] = await Promise.all([
          // Total leads
          supabase.from('leads').select('*', { count: 'exact', head: true }),
          // Active loans count
          supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          // Pending loan requests
          supabase.from('loan_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          // ✅ FIX 1: Sum `amount` (disbursed), not `repayment_amount` (what's owed)
          supabase.from('loans').select('amount').in('status', ['active', 'disbursed']),
          // ✅ FIX 2: Fetch the real highest-priority pending request with customer info
          supabase
            .from('loan_requests')
            .select('*, customers(full_name, phone)')
            .eq('status', 'pending')
            .order('created_at', { ascending: true }) // oldest = most urgent
            .limit(1)
            .maybeSingle(),
          // ✅ FIX 3: Loans created in the last 7 days for the bar chart
          supabase
            .from('loans')
            .select('amount, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: true }),
          // ✅ FIX 4: Repayments in the last 7 days for the line chart
          supabase
            .from('repayments')
            .select('amount, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: true }),
        ]);

        const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7;
        if (firstError) {
          console.error('Dashboard fetch error:', firstError);
          setError(firstError.message);
        }

        // ── Stats ────────────────────────────────────────────────────────────
        const totalDisbursed = (activeLoans || []).reduce(
          (sum, l) => sum + Number(l.amount || 0), 0
        );

        setStats({
          totalLeads:       leadsCount        || 0,
          activeLoans:      activeLoansCount  || 0,
          pendingRequests:  pendingCount      || 0,
          totalDisbursed,
        });

        // ── Priority request ─────────────────────────────────────────────────
        setPriorityRequest(topRequest || null);

        // ── Chart data: bucket by day label ──────────────────────────────────
        const growthByDay = Object.fromEntries(daySlots.map(d => [d.date, 0]));
        (recentLoans || []).forEach(l => {
          const day = l.created_at?.slice(0, 10);
          if (day in growthByDay) growthByDay[day] += Number(l.amount || 0);
        });
        setGrowthData(
          daySlots.map(({ label, date }) => ({ name: label, value: growthByDay[date] }))
        );

        const repayByDay = Object.fromEntries(daySlots.map(d => [d.date, 0]));
        (recentRepayments || []).forEach(r => {
          const day = r.created_at?.slice(0, 10);
          if (day in repayByDay) repayByDay[day] += Number(r.amount || 0);
        });
        setRepaymentData(
          daySlots.map(({ label, date }) => ({ name: label, value: repayByDay[date] }))
        );
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err.message || 'Unable to load dashboard data.');
      }
    };

    fetchAll();
  }, []);

  // ── Derived stat cards (only built once stats are loaded) ─────────────────
  const statCards = stats
    ? [
        {
          label: 'Active Portfolio',
          value: formatKES(stats.totalDisbursed),
          icon: DollarSign,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          sub: `${stats.activeLoans} active loan${stats.activeLoans !== 1 ? 's' : ''}`,
        },
        {
          label: 'Pending Approvals',
          value: `${stats.pendingRequests} Request${stats.pendingRequests !== 1 ? 's' : ''}`,
          icon: Clock,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          sub: stats.pendingRequests > 0 ? 'Needs review' : 'All clear',
        },
        {
          label: 'Total Leads',
          value: stats.totalLeads,
          icon: Users,
          color: 'text-slate-600',
          bg: 'bg-slate-50',
          sub: 'All time',
        },
        {
          label: 'Active Loans',
          value: stats.activeLoans,
          icon: TrendingUp,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          sub: 'Currently running',
        },
      ]
    : null;

  return (
    <div className="space-y-4 sm:space-y-8">

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* ✅ FIX 5: Show skeleton cards while loading instead of zero-flash */}
        {!statCards
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((stat) => (
              <div
                key={stat.label}
                className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-slate-400 text-[10px] sm:text-xs font-medium">{stat.label}</div>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon size={14} className={stat.color} />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-slate-800">{stat.value}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1">{stat.sub}</div>
              </div>
            ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* ── Priority Request ────────────────────────────────────────────────── */}
      <section className="bg-slate-800 rounded-2xl p-5 sm:p-8 text-white shadow-lg relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-semibold">Priority Request</h2>
            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium">
              Attention Needed
            </span>
          </div>

          {/* ✅ FIX 6: Render real request data, or a friendly empty state */}
          {priorityRequest ? (
            <div className="bg-white border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-50 shrink-0 text-slate-500 font-bold text-lg">
                  {(priorityRequest.customers?.full_name || priorityRequest.customer_name || '?')
                    .charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm sm:text-lg flex items-center gap-2 sm:gap-3 text-slate-800">
                    {priorityRequest.customers?.full_name ||
                      priorityRequest.customer_name ||
                      'Unknown Customer'}
                    {priorityRequest.loan_count > 1 && (
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">
                        Loan #{priorityRequest.loan_count}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[10px] sm:text-sm mt-1">
                    Requesting:{' '}
                    <span className="text-slate-800 font-medium">
                      {formatKES(Number(priorityRequest.amount || 0))}
                    </span>
                    {priorityRequest.term_months && (
                      <>
                        {' '}| Term:{' '}
                        <span className="text-slate-800 font-medium">
                          {priorityRequest.term_months} Mo
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Link
                  to={`/requests`}
                  className="flex-1 md:flex-none px-4 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-medium text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95 text-center"
                >
                  Review
                </Link>
                <Link
                  to="/requests"
                  className="flex-1 md:flex-none px-4 sm:px-8 py-2.5 sm:py-3 bg-slate-50 text-slate-600 rounded-xl font-medium text-xs sm:text-sm hover:bg-slate-100 transition-all border border-slate-100 active:scale-95 text-center"
                >
                  Open Queue
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/50 text-sm">
              {stats === null ? 'Loading…' : 'No pending requests — all clear!'}
            </div>
          )}
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-800 rounded-full blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity" />
      </section>

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm w-full overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Loan Disbursements</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Last 7 days · KES</p>
            </div>
          </div>
          <div className="h-48 sm:h-64 w-full">
            <ResponsiveContainer width="99%" height="100%" minWidth={0}>
              <BarChart data={growthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <Tooltip
                  formatter={(v) => [`KES ${Number(v).toLocaleString()}`, 'Disbursed']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                  cursor={{ fill: '#F8FAFC' }}
                />
                <Bar dataKey="value" fill="#3B82F6" opacity={0.8} radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm w-full overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Repayments Received</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Last 7 days · KES</p>
            </div>
          </div>
          <div className="h-48 sm:h-64 w-full">
            <ResponsiveContainer width="99%" height="100%" minWidth={0}>
              <LineChart data={repaymentData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <Tooltip
                  formatter={(v) => [`KES ${Number(v).toLocaleString()}`, 'Received']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { Users, TrendingUp, Clock, DollarSign, AlertTriangle, CalendarCheck, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getLast7DayLabels() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: days[d.getDay()], date: d.toISOString().slice(0, 10) };
  });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function formatKES(amount) {
  const n = Number(amount) || 0;
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${n.toLocaleString()}`;
}

function SkeletonCard() {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm animate-pulse">
      <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-7 w-32 bg-slate-100 rounded mb-2" />
      <div className="h-2 w-16 bg-slate-100 rounded" />
    </div>
  );
}

export default function Dashboard() {
  const [stats,           setStats]           = useState(null);
  const [priorityRequest, setPriorityRequest] = useState(null);
  const [dueToday,        setDueToday]        = useState([]);
  const [disbursedToday,  setDisbursedToday]  = useState([]);
  const [growthData,      setGrowthData]      = useState([]);
  const [repaymentData,   setRepaymentData]   = useState([]);
  const [error,           setError]           = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setError(null);
      try {
        const today    = todayISO();
        const daySlots = getLast7DayLabels();
        const since    = daySlots[0].date;

        const [
          { count: leadsCount,        error: e1 },
          { count: activeLoansCount,  error: e2 },
          { count: pendingCount,      error: e3 },
          { data: activeLoans,        error: e4 },
          { data: topRequest,         error: e5 },
          { data: recentLoans,        error: e6 },
          { data: recentRepayments,   error: e7 },
          { data: dueTodayData,       error: e8 },
          { data: disbursedTodayData, error: e9 },
          { data: repaidTodayData,    error: e10 },
        ] = await Promise.all([
          supabase.from('leads').select('*', { count: 'exact', head: true }),
          supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('loan_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('loans').select('amount').in('status', ['active', 'disbursed']),
          supabase.from('loan_requests').select('*, customers(full_name, phone)').eq('status', 'pending').order('created_at', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('loans').select('amount, created_at').gte('created_at', since).order('created_at', { ascending: true }),
          supabase.from('repayments').select('amount, created_at').gte('created_at', since).order('created_at', { ascending: true }),
          // Loans due today
          supabase.from('loans').select('id, amount, repayment_amount, due_date, customer:customer_id(name, phone)').in('status', ['active','disbursed']).gte('due_date', `${today}T00:00:00`).lte('due_date', `${today}T23:59:59`),
          // Disbursed today
          supabase.from('loans').select('id, amount, customer:customer_id(name, phone)').gte('disbursement_date', `${today}T00:00:00`).lte('disbursement_date', `${today}T23:59:59`),
          // Repayments today
          supabase.from('repayments').select('id, amount').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
        ]);

        if (e1||e2||e3||e4||e5||e6||e7||e8||e9||e10) {
          const err = e1||e2||e3||e4||e5||e6||e7||e8||e9||e10;
          console.error('Dashboard fetch error:', err);
          setError(err.message);
        }

        const totalDisbursed    = (activeLoans        || []).reduce((s, l) => s + Number(l.amount  || 0), 0);
        const disbursedTodayAmt = (disbursedTodayData || []).reduce((s, l) => s + Number(l.amount  || 0), 0);
        const repaidTodayAmt    = (repaidTodayData    || []).reduce((s, r) => s + Number(r.amount  || 0), 0);

        setStats({
          totalLeads:          leadsCount            || 0,
          activeLoans:         activeLoansCount      || 0,
          pendingRequests:     pendingCount          || 0,
          totalDisbursed,
          dueTodayCount:       (dueTodayData        || []).length,
          disbursedTodayAmt,
          disbursedTodayCount: (disbursedTodayData  || []).length,
          repaidTodayAmt,
        });

        setPriorityRequest(topRequest || null);
        setDueToday(dueTodayData       || []);
        setDisbursedToday(disbursedTodayData || []);

        const growthByDay = Object.fromEntries(daySlots.map(d => [d.date, 0]));
        (recentLoans||[]).forEach(l => { const day = l.created_at?.slice(0,10); if (day in growthByDay) growthByDay[day] += Number(l.amount||0); });
        setGrowthData(daySlots.map(({ label, date }) => ({ name: label, value: growthByDay[date] })));

        const repayByDay = Object.fromEntries(daySlots.map(d => [d.date, 0]));
        (recentRepayments||[]).forEach(r => { const day = r.created_at?.slice(0,10); if (day in repayByDay) repayByDay[day] += Number(r.amount||0); });
        setRepaymentData(daySlots.map(({ label, date }) => ({ name: label, value: repayByDay[date] })));

      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err.message || 'Unable to load dashboard data.');
      }
    };
    fetchAll();
  }, []);

  const statCards = stats ? [
    { label: 'Active Portfolio',  value: formatKES(stats.totalDisbursed),     icon: DollarSign, color: 'text-blue-600',    bg: 'bg-blue-50',    sub: `${stats.activeLoans} active loan${stats.activeLoans!==1?'s':''}` },
    { label: 'Pending Approvals', value: `${stats.pendingRequests} Requests`,  icon: Clock,      color: 'text-amber-600',   bg: 'bg-amber-50',   sub: stats.pendingRequests > 0 ? 'Needs review' : 'All clear' },
    { label: 'Total Leads',       value: stats.totalLeads,                     icon: Users,      color: 'text-slate-600',   bg: 'bg-slate-50',   sub: 'All time' },
    { label: 'Active Loans',      value: stats.activeLoans,                    icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Currently running' },
  ] : null;

  const todayCards = stats ? [
    { label: 'Due Today',        value: stats.dueTodayCount,                                           icon: AlertTriangle, color: 'text-rose-600',    bg: 'bg-rose-50',    sub: stats.dueTodayCount > 0 ? 'Collect today' : 'Nothing due', urgent: stats.dueTodayCount > 0, link: '/active-loans' },
    { label: 'Disbursed Today',  value: `${stats.disbursedTodayCount} loan${stats.disbursedTodayCount!==1?'s':''}`, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-50', sub: formatKES(stats.disbursedTodayAmt), link: '/active-loans' },
    { label: 'Repaid Today',     value: formatKES(stats.repaidTodayAmt),                               icon: ArrowUpRight,   color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Cash collected', link: '/active-loans' },
  ] : null;

  return (
    <div className="space-y-4 sm:space-y-8">

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {!statCards
          ? Array.from({length:4}).map((_,i) => <SkeletonCard key={i} />)
          : statCards.map(stat => (
              <div key={stat.label} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-slate-400 text-[10px] sm:text-xs font-medium">{stat.label}</div>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}><stat.icon size={14} className={stat.color} /></div>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-slate-800">{stat.value}</div>
                <div className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1">{stat.sub}</div>
              </div>
            ))}
      </div>

      {/* Today's snapshot */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Today's Snapshot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {!todayCards
            ? Array.from({length:3}).map((_,i) => <SkeletonCard key={i} />)
            : todayCards.map(card => (
                <Link key={card.label} to={card.link}
                  className={`bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all flex items-center gap-4 group ${card.urgent ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                    <card.icon size={20} className={card.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{card.label}</div>
                    <div className={`text-xl font-bold mt-0.5 ${card.urgent ? 'text-rose-600' : 'text-slate-800'}`}>{card.value}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{card.sub}</div>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                </Link>
              ))}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">{error}</div>}

      {/* Due today list */}
      {dueToday.length > 0 && (
        <section className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-rose-100 flex items-center gap-3">
            <AlertTriangle size={18} className="text-rose-500" />
            <h2 className="font-semibold text-slate-800">Loans Due Today</h2>
            <span className="ml-auto text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">{dueToday.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {dueToday.map(loan => (
              <div key={loan.id} className="flex items-center justify-between px-6 py-4 hover:bg-rose-50/20 transition-colors">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{loan.customer?.name ?? '—'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{loan.customer?.phone ?? ''}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-rose-600 text-sm">{formatKES(loan.repayment_amount ?? loan.amount)}</div>
                  <div className="text-[10px] text-slate-400">repayment due</div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-rose-50/20 border-t border-rose-100">
            <Link to="/active-loans" className="text-xs font-semibold text-rose-600 hover:underline">View all active loans →</Link>
          </div>
        </section>
      )}

      {/* Disbursed today list */}
      {disbursedToday.length > 0 && (
        <section className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-blue-100 flex items-center gap-3">
            <CalendarCheck size={18} className="text-blue-500" />
            <h2 className="font-semibold text-slate-800">Disbursed Today</h2>
            <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">{disbursedToday.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {disbursedToday.map(loan => (
              <div key={loan.id} className="flex items-center justify-between px-6 py-4 hover:bg-blue-50/20 transition-colors">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{loan.customer?.name ?? '—'}</div>
                  <div className="text-xs text-slate-400">{loan.customer?.phone ?? ''}</div>
                </div>
                <div className="font-bold text-blue-600 text-sm">{formatKES(loan.amount)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Priority request */}
      <section className="bg-slate-800 rounded-2xl p-5 sm:p-8 text-white shadow-lg relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-semibold">Priority Request</h2>
            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium">Attention Needed</span>
          </div>
          {priorityRequest ? (
            <div className="bg-white border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                  {(priorityRequest.customers?.full_name || priorityRequest.customer_name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm sm:text-lg text-slate-800">
                    {priorityRequest.customers?.full_name || priorityRequest.customer_name || 'Unknown Customer'}
                  </div>
                  <div className="text-slate-500 text-[10px] sm:text-sm mt-1">
                    Requesting: <span className="text-slate-800 font-medium">{formatKES(priorityRequest.amount)}</span>
                    {priorityRequest.term_months && <> | Term: <span className="text-slate-800 font-medium">{priorityRequest.term_months} Mo</span></>}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Link to="/requests" className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-xs hover:bg-blue-700 transition-all shadow-md active:scale-95 text-center">Review</Link>
                <Link to="/requests" className="flex-1 md:flex-none px-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-medium text-xs hover:bg-slate-100 transition-all border border-slate-100 active:scale-95 text-center">Open Queue</Link>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[
          { title: 'Loan Disbursements', data: growthData, color: '#3B82F6', type: 'bar', label: 'Disbursed' },
          { title: 'Repayments Received', data: repaymentData, color: '#10B981', type: 'line', label: 'Received' },
        ].map(({ title, data, color, type, label }) => (
          <div key={title} className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="mb-8">
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">{title}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Last 7 days · KES</p>
            </div>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                {type === 'bar' ? (
                  <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip formatter={(v) => [`KES ${Number(v).toLocaleString()}`, label]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }} cursor={{ fill: '#F8FAFC' }} />
                    <Bar dataKey="value" fill={color} opacity={0.8} radius={[4,4,0,0]} barSize={32} />
                  </BarChart>
                ) : (
                  <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip formatter={(v) => [`KES ${Number(v).toLocaleString()}`, label]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }} />
                    <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ fill: color, r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
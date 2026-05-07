import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { 
  Users, 
  TrendingUp, 
  Clock, 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const data = [
  { name: 'Mon', value: 4000 },
  { name: 'Tue', value: 3000 },
  { name: 'Wed', value: 2000 },
  { name: 'Thu', value: 2780 },
  { name: 'Fri', value: 1890 },
  { name: 'Sat', value: 2390 },
  { name: 'Sun', value: 3490 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLoans: 0,
    pendingRequests: 0,
    totalDisbursed: 0
  });

  useEffect(() => {
    // Fetch actual stats from Supabase
    const fetchStats = async () => {
      const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
      const { count: activeLoansCount } = await supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active');
      const { count: pendingRequestsCount } = await supabase.from('loan_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      setStats({
        totalLeads: leadsCount || 0,
        activeLoans: activeLoansCount || 0,
        pendingRequests: pendingRequestsCount || 0,
        totalDisbursed: 254300 // Mock for now or sum from disbursed loans
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Active Portfolio', value: `KES ${stats.totalDisbursed.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', change: '+12%', positive: true },
    { label: 'Pending Approvals', value: `${stats.pendingRequests} Requests`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', change: '4 urgent repeat', positive: true },
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50', change: '+5%', positive: true },
    { label: 'Disbursement Target', value: '84%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', change: 'On track', positive: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="text-slate-400 text-[10px] sm:text-xs font-medium mb-1">{stat.label}</div>
            <div className="text-lg sm:text-2xl font-bold text-slate-800">{stat.value}</div>
            {stat.label === 'Disbursement Target' ? (
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '84%' }}></div>
              </div>
            ) : (
              <div className={`text-xs font-medium mt-1 ${stat.positive ? 'text-green-500' : 'text-amber-500'}`}>
                {stat.change} {stat.positive ? 'this month' : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Urgent Section */}
      <section className="bg-slate-800 rounded-2xl p-5 sm:p-8 text-white shadow-lg relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-semibold">Priority Requests</h2>
            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium">Attention Needed</span>
          </div>
          <div className="bg-white border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-5 self-start sm:self-auto">
              <div className="w-12 h-12 sm:w-16 h-16 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-50 shrink-0">
                <img src="https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=400&h=400&fit=crop" alt="Douglas Wekulo" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-semibold text-sm sm:text-lg flex items-center gap-2 sm:gap-3 text-slate-800">
                  Douglas Wekulo 
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">8th Loan</span>
                </div>
                <div className="text-slate-500 text-[10px] sm:text-sm mt-1">Requesting: <span className="text-slate-800 font-medium">KES 5,000</span> | Term: <span className="text-slate-800 font-medium">12 Mo</span></div>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Link to="/requests" className="flex-1 md:flex-none px-4 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-medium text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95 text-center">Review</Link>
              <Link to="/requests" className="flex-1 md:flex-none px-4 sm:px-8 py-2.5 sm:py-3 bg-slate-50 text-slate-600 rounded-xl font-medium text-xs sm:text-sm hover:bg-slate-100 transition-all border border-slate-100 active:scale-95 text-center">Open Queue</Link>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-800 rounded-full blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity"></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts */}
        <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm w-full overflow-hidden">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Monthly Growth</h3>
             <div className="text-[10px] sm:text-xs font-medium text-slate-400">Activity</div>
          </div>
          <div className="h-48 sm:h-64 w-full">
            <ResponsiveContainer width="99%" height="100%" minWidth={0}>
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <Tooltip 
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
             <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Repayment Rates</h3>
             <div className="text-[10px] sm:text-xs font-medium text-slate-400">Efficiency</div>
          </div>
          <div className="h-48 sm:h-64 w-full">
            <ResponsiveContainer width="99%" height="100%" minWidth={0}>
              <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                />
                <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

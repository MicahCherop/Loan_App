import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Download, Calendar } from 'lucide-react';
import { useMemo, useState } from 'react';

const disbursementData = [
  { month: 'Jan', amount: 45000 },
  { month: 'Feb', amount: 52000 },
  { month: 'Mar', amount: 48000 },
  { month: 'Apr', amount: 61000 },
  { month: 'May', amount: 55000 },
  { month: 'Jun', amount: 67000 },
];

const statusData = [
  { name: 'Active', value: 45, color: '#10B981' },
  { name: 'Paid', value: 30, color: '#3B82F6' },
  { name: 'Overdue', value: 15, color: '#EF4444' },
  { name: 'Pending', value: 10, color: '#F59E0B' },
];

export default function Reports() {
  const [period, setPeriod] = useState('monthly');
  const [showDateRange, setShowDateRange] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showRepaymentDetails, setShowRepaymentDetails] = useState(false);

  const activeDisbursementData = useMemo(() => {
    const multipliers = { monthly: 1, quarterly: 3, yearly: 12 };
    const multiplier = multipliers[period] || 1;
    return disbursementData.map((item) => ({
      ...item,
      amount: item.amount * multiplier,
    }));
  }, [period]);

  const downloadReport = () => {
    const rows = [
      ['Period', period],
      ['Date From', dateRange.from || 'All'],
      ['Date To', dateRange.to || 'All'],
      [],
      ['Month', 'Disbursement'],
      ...activeDisbursementData.map((item) => [item.month, item.amount]),
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rfg-capital-ltd-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {['monthly', 'quarterly', 'yearly'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`px-5 py-2 text-xs font-medium rounded-xl transition-colors ${
                period === item ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDateRange((value) => !value)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Calendar size={16} />
            Date Range
          </button>
          <button onClick={downloadReport} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-medium hover:bg-slate-900 transition-all shadow-md active:scale-95">
            <Download size={16} />
            Download
          </button>
        </div>
      </div>

      {showDateRange && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-end shadow-sm">
          <label className="space-y-1 text-xs font-medium text-slate-500">
            From
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="block px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-700"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-500">
            To
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="block px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-700"
            />
          </label>
          <button
            type="button"
            onClick={() => setDateRange({ from: '', to: '' })}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Growth Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative group">
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Loan Growth</h3>
              <p className="text-xs font-medium text-slate-400 mt-1">Total amount across all loans</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">KES 326,000</p>
              <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-500 font-medium mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                +12.4% Up
              </div>
            </div>
          </div>
          <div className="h-80 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeDisbursementData}>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 500 }} />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC', radius: 8 }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '15px' }}
                />
                <Bar dataKey="amount" fill="#3B82F6" opacity={0.8} radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative group">
          <h3 className="text-xl font-bold text-slate-800 mb-1">Loan Status</h3>
          <p className="text-xs font-medium text-slate-400 mb-10">Status breakdown</p>
          
          <div className="h-64 relative mb-6">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-800 tracking-tight">85<span className="text-xl">%</span></span>
                <span className="text-[10px] text-emerald-500 font-medium uppercase mt-1">Paid</span>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-8">
            {statusData.map((status, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></div>
                  <span className="text-[10px] font-medium text-slate-400 tracking-wide">{status.name}</span>
                </div>
                <span className="text-lg font-bold text-slate-700">{status.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Repayment Rate */}
      <div className="bg-slate-800 p-12 rounded-[2.5rem] text-white relative overflow-hidden group">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
           <div className="max-w-xl text-center lg:text-left">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-medium uppercase tracking-wide mb-6">
               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
               Performance
             </div>
             <h3 className="text-4xl font-bold mb-6 tracking-tight">Repayment Rates</h3>
             <p className="text-slate-300 text-lg leading-relaxed mb-10 font-normal">
                Repayments are averaging <span className="text-white font-semibold underline decoration-emerald-500 underline-offset-8">2.4 days early</span>. 
                This confirms strong portfolio quality across all customers.
             </p>
              <button
                type="button"
                onClick={() => setShowRepaymentDetails((value) => !value)}
                className="px-8 py-4 bg-white text-slate-800 text-sm font-medium rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
              >
                {showRepaymentDetails ? 'Hide Details' : 'View Details'}
              </button>
              {showRepaymentDetails && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['On-time rate', '85%'],
                    ['Average early', '2.4 days'],
                    ['Portfolio risk', 'Low'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</div>
                      <div className="text-lg font-bold text-white mt-1">{value}</div>
                    </div>
                  ))}
                </div>
              )}
           </div>
           <div className="flex-1 w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={activeDisbursementData}>
                   <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3B82F6" 
                    strokeWidth={4} 
                    dot={false}
                   />
                 </LineChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}

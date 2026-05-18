import { useState } from 'react';
import { Package, Calculator, Info, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Interest Engine ──────────────────────────────────────────────────────────
// Structure: 21% flat for days 1-21, then 0.75% per day for days 22-30
function calculateRepayment(principal, termDays = 30) {
  const p = Number(principal) || 0;
  if (p <= 0) return { interest: 0, total: 0, breakdown: [] };

  const phases = [];
  let interest = 0;

  // Phase 1: Days 1–21 → flat 21%
  const phase1Days = Math.min(termDays, 21);
  const phase1Interest = p * 0.21 * (phase1Days / 21);
  interest += phase1Interest;
  phases.push({ label: `Weeks 1–${Math.ceil(phase1Days / 7)} (days 1–${phase1Days})`, rate: '21% flat', interest: phase1Interest });

  // Phase 2: Days 22–30 → 0.75% per day
  if (termDays > 21) {
    const phase2Days = Math.min(termDays - 21, 9);
    const phase2Interest = p * 0.0075 * phase2Days;
    interest += phase2Interest;
    phases.push({ label: `Days 22–${21 + phase2Days}`, rate: '0.75%/day', interest: phase2Interest });
  }

  return {
    interest: Math.round(interest),
    total:    Math.round(p + interest),
    breakdown: phases,
  };
}

// ─── Loan Products ────────────────────────────────────────────────────────────
const LOAN_PRODUCTS = [
  {
    id: 'standard-30',
    name: 'Standard 30-Day Loan',
    description: 'Our flagship product. 21% for the first 3 weeks, then 0.75%/day for any extension up to day 30.',
    term: 30,
    minAmount: 1000,
    maxAmount: 50000,
    badge: 'Most Popular',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
    color: 'border-blue-200',
    accent: 'bg-blue-600',
  },
  {
    id: 'quick-21',
    name: 'Quick 21-Day Loan',
    description: 'Clean 3-week product. Fixed 21% interest, repaid in full on day 21.',
    term: 21,
    minAmount: 1000,
    maxAmount: 30000,
    badge: 'Fast Turnaround',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    color: 'border-emerald-200',
    accent: 'bg-emerald-600',
  },
  {
    id: 'micro-7',
    name: 'Micro 7-Day Loan',
    description: 'Short bridge loan. Interest calculated as 21% × (7/21) = 7% flat.',
    term: 7,
    minAmount: 500,
    maxAmount: 10000,
    badge: 'Short Term',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-100',
    color: 'border-violet-200',
    accent: 'bg-violet-600',
  },
];

function formatKES(n) {
  const v = Number(n) || 0;
  return `KES ${v.toLocaleString()}`;
}

// ─── Calculator Card ──────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const [amount,    setAmount]    = useState('');
  const [expanded,  setExpanded]  = useState(false);

  const result = amount ? calculateRepayment(amount, product.term) : null;

  return (
    <div className={`bg-white rounded-2xl border-2 ${product.color} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold text-slate-800 text-base">{product.name}</h3>
          <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full whitespace-nowrap ${product.badgeColor}`}>
            {product.badge}
          </span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{product.description}</p>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-slate-800">{product.term}</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Days</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-slate-800">21%</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Base Rate</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-slate-800">{formatKES(product.maxAmount).replace('KES ', '')}</div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Max</div>
          </div>
        </div>
      </div>

      {/* Calculator */}
      <div className="p-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Quick Calculator
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">KES</span>
            <input
              type="number"
              min={product.minAmount}
              max={product.maxAmount}
              placeholder={`${product.minAmount.toLocaleString()} – ${product.maxAmount.toLocaleString()}`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all"
            />
          </div>
          <button
            onClick={() => setAmount('')}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
        </div>

        {result && (
          <div className="mt-4 rounded-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-4 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Interest</div>
                <div className="text-lg font-bold text-amber-600">{formatKES(result.interest)}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total Repay</div>
                <div className="text-lg font-bold text-slate-800">{formatKES(result.total)}</div>
              </div>
            </div>

            {/* Breakdown toggle */}
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Interest Breakdown
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expanded && (
              <div className="divide-y divide-slate-50">
                {result.breakdown.map((phase, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-xs">
                    <div>
                      <div className="font-medium text-slate-700">{phase.label}</div>
                      <div className="text-slate-400">{phase.rate}</div>
                    </div>
                    <div className="font-bold text-amber-600">{formatKES(phase.interest)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoanProducts() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Loan Products</h2>
          <p className="text-sm text-slate-400 mt-1">Interest: 21% flat for 3 weeks, then 0.75%/day up to day 30.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-medium text-amber-700">
          <Info size={14} />
          30-day maximum term
        </div>
      </div>

      {/* Interest structure explainer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Calculator size={16} className="text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-800">Interest Rate Structure</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
            <div className="text-3xl font-bold text-blue-700 mb-1">21%</div>
            <div className="text-sm font-semibold text-blue-800">Days 1 – 21 (3 Weeks)</div>
            <div className="text-xs text-blue-600 mt-1">Flat rate on principal. Applied in full regardless of early repayment within this window.</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
            <div className="text-3xl font-bold text-amber-700 mb-1">0.75%<span className="text-lg">/day</span></div>
            <div className="text-sm font-semibold text-amber-800">Days 22 – 30 (9 Days)</div>
            <div className="text-xs text-amber-600 mt-1">Daily accrual on principal. Maximum 9 extra days = 6.75% additional interest.</div>
          </div>
        </div>
        <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-xs font-semibold text-slate-600 mb-2">Maximum cost on a KES 10,000 loan</div>
          <div className="flex items-center gap-6 flex-wrap">
            <div><span className="text-slate-400 text-xs">Principal</span><div className="font-bold text-slate-800">KES 10,000</div></div>
            <div className="text-slate-300">+</div>
            <div><span className="text-slate-400 text-xs">Week 1–3 interest</span><div className="font-bold text-blue-700">KES 2,100</div></div>
            <div className="text-slate-300">+</div>
            <div><span className="text-slate-400 text-xs">Days 22–30 interest</span><div className="font-bold text-amber-600">KES 675</div></div>
            <div className="text-slate-300">=</div>
            <div><span className="text-slate-400 text-xs">Total repayment</span><div className="font-bold text-slate-800 text-lg">KES 12,775</div></div>
          </div>
        </div>
      </div>

      {/* Product cards */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Package size={18} className="text-slate-400" />
          <h3 className="font-semibold text-slate-700">Available Products</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {LOAN_PRODUCTS.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
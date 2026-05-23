import { useState } from 'react';
import { Package, Calculator, Info, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Interest engine (server mirrors this exactly in the Edge Function) ───────
// Phase 1: 21% flat for days 1–21
// Phase 2: 0.75%/day for days 22–30 (max 9 extra days = 6.75%)
function calculateRepayment(principal, termDays) {
  const p = Number(principal) || 0;
  if (p <= 0 || termDays <= 0) return { interest: 0, total: p, breakdown: [] };

  const breakdown = [];

  const p1days   = Math.min(termDays, 21);
  const p1int    = p * 0.21 * (p1days / 21);
  breakdown.push({
    label: `Days 1–${p1days} · flat 21%${p1days < 21 ? ` (${p1days}/21 of full term)` : ''}`,
    amount: Math.round(p1int),
  });

  let p2int = 0;
  if (termDays > 21) {
    const p2days = Math.min(termDays - 21, 9);
    p2int = p * 0.0075 * p2days;
    breakdown.push({
      label: `Days 22–${21 + p2days} · 0.75%/day × ${p2days} day${p2days !== 1 ? 's' : ''}`,
      amount: Math.round(p2int),
    });
  }

  const interest        = Math.round(p1int + p2int);
  const total           = p + interest;
  const latePenaltyDay  = Math.round(p * 0.0075);

  return { interest, total, breakdown, latePenaltyDay };
}

function formatKES(n) {
  const v = Number(n) || 0;
  return `KES ${v.toLocaleString()}`;
}

// ─── Loan products catalogue ──────────────────────────────────────────────────
const PRODUCTS = [
  {
    id:          'standard-30',
    name:        'Standard 30-Day Loan',
    description: 'Full 30-day cycle. 21% for the first 3 weeks, then 0.75%/day for days 22–30.',
    term:        30,
    minAmount:   1_000,
    maxAmount:   50_000,
    badge:       'Most Popular',
    badgeColor:  'bg-blue-50 text-blue-700 border-blue-100',
    borderColor: 'border-blue-200',
  },
  {
    id:          'quick-21',
    name:        'Quick 21-Day Loan',
    description: 'Clean 3-week product. Fixed 21% rate, repaid in full on day 21. No daily accrual.',
    term:        21,
    minAmount:   1_000,
    maxAmount:   30_000,
    badge:       'Fast Turnaround',
    badgeColor:  'bg-emerald-50 text-emerald-700 border-emerald-100',
    borderColor: 'border-emerald-200',
  },
  {
    id:          'micro-7',
    name:        'Micro 7-Day Loan',
    description: 'Short bridge product. Interest = 21% × (7/21) = 7% flat. Best for quick cash gaps.',
    term:        7,
    minAmount:   500,
    maxAmount:   10_000,
    badge:       'Short Term',
    badgeColor:  'bg-violet-50 text-violet-700 border-violet-100',
    borderColor: 'border-violet-200',
  },
];

function ProductCard({ product }) {
  const [amount,   setAmount]   = useState('');
  const [expanded, setExpanded] = useState(false);

  const result = amount && Number(amount) >= product.minAmount
    ? calculateRepayment(amount, product.term)
    : null;

  const dueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + product.term);
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className={`bg-white rounded-2xl border-2 ${product.borderColor} shadow-sm overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-bold text-slate-800 text-sm leading-snug">{product.name}</h3>
          <span className={`text-[10px] font-bold border px-2 py-1 rounded-full shrink-0 ${product.badgeColor}`}>
            {product.badge}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{product.description}</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: 'Term',     value: `${product.term}d`                               },
            { label: 'Base rate', value: '21%'                                            },
            { label: 'Max',      value: formatKES(product.maxAmount).replace('KES ', '') },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <div className="text-base font-bold text-slate-800">{value}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculator */}
      <div className="p-5 flex-1">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Quick calculator
        </label>
        <div className="flex items-stretch gap-2 mb-1">
          <div className="flex flex-1 items-center border-2 border-slate-200 focus-within:border-blue-400 rounded-xl overflow-hidden transition-colors">
            <span className="px-3 py-2.5 bg-slate-50 border-r border-slate-200 text-xs text-slate-400 font-medium select-none">KES</span>
            <input
              type="number"
              min={product.minAmount}
              max={product.maxAmount}
              placeholder={`${product.minAmount.toLocaleString()}–${product.maxAmount.toLocaleString()}`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              className="flex-1 px-3 py-2.5 text-sm font-semibold text-slate-800 bg-transparent outline-none w-0"
            />
          </div>
          {amount && (
            <button onClick={() => setAmount('')}
              className="px-3 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Clear
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mb-3">
          Min {formatKES(product.minAmount)} · Max {formatKES(product.maxAmount)}
        </p>

        {result && (
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Interest</div>
                <div className="text-base font-bold text-amber-600">{formatKES(result.interest)}</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total repay</div>
                <div className="text-base font-bold text-slate-800">{formatKES(result.total)}</div>
              </div>
            </div>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between text-xs text-slate-500">
              <span>Due date (approx.)</span>
              <span className="font-medium text-slate-700">{dueDate()}</span>
            </div>
            <div className="px-4 py-2 bg-rose-50 border-t border-rose-100 text-xs text-rose-700">
              Late penalty: <strong>{formatKES(result.latePenaltyDay)}/day</strong> after due date
            </div>

            {/* Breakdown toggle */}
            <button onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors">
              Interest breakdown
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expanded && (
              <div className="divide-y divide-slate-50">
                {result.breakdown.map((phase, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-slate-600">{phase.label}</span>
                    <span className="text-xs font-bold text-amber-600">{formatKES(phase.amount)}</span>
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
          <p className="text-sm text-slate-400 mt-1">
            Interest structure: 21% flat (days 1–21) · 0.75%/day (days 22–30)
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-medium text-amber-700">
          <Info size={14} /> 30-day maximum term
        </div>
      </div>

      {/* Rate structure explainer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Calculator size={16} className="text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-800">Rate Structure</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
            <div className="text-3xl font-bold text-blue-700 mb-1">21%</div>
            <div className="text-sm font-semibold text-blue-800">Days 1–21 · 3 weeks</div>
            <div className="text-xs text-blue-600 mt-1 leading-relaxed">
              Flat rate on the principal. Applied in full for the first 3 weeks regardless of term selected.
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
            <div className="text-3xl font-bold text-amber-700 mb-1">0.75%<span className="text-xl">/day</span></div>
            <div className="text-sm font-semibold text-amber-800">Days 22–30 · up to 9 days</div>
            <div className="text-xs text-amber-600 mt-1 leading-relaxed">
              Daily accrual on principal. Max additional cost = 9 × 0.75% = 6.75% extra.
            </div>
          </div>
        </div>

        {/* Max cost example */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="text-xs font-semibold text-slate-600 mb-3">Example: KES 10,000 — maximum 30-day cost</div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {[
              { label: 'Principal',         value: 'KES 10,000', color: 'text-slate-800' },
              { label: '+  Week 1–3 (21%)', value: 'KES 2,100',  color: 'text-blue-700'  },
              { label: '+  Days 22–30',     value: 'KES 675',    color: 'text-amber-600' },
              { label: '=  Total repay',    value: 'KES 12,775', color: 'text-slate-800 text-lg font-bold' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] text-slate-400">{label}</span>
                <span className={`font-bold ${color}`}>{value}</span>
              </div>
            ))}
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
          {PRODUCTS.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </div>
  );
}

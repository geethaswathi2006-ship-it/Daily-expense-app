import { useState, useEffect, useRef, useMemo } from "react";
import "./app.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = {
  income: [
    { id: "salary", label: "Salary", icon: "💼" },
    { id: "freelance", label: "Freelance", icon: "🖥️" },
    { id: "investments", label: "Investments", icon: "📈" },
    { id: "other_in", label: "Other", icon: "💰" },
  ],
  expense: [
    { id: "food", label: "Food", icon: "🍽️" },
    { id: "transport", label: "Transport", icon: "🚗" },
    { id: "shopping", label: "Shopping", icon: "🛍️" },
    { id: "utilities", label: "Utilities", icon: "⚡" },
    { id: "health", label: "Health", icon: "❤️" },
    { id: "entertainment", label: "Entertainment", icon: "🎬" },
    { id: "rent", label: "Rent", icon: "🏠" },
    { id: "other_ex", label: "Other", icon: "📦" },
  ],
};

const CAT_COLORS = {
  salary: "#1D9E75", freelance: "#0F6E56", investments: "#185FA5",
  other_in: "#888780", food: "#D85A30", transport: "#E24B4A",
  shopping: "#D4537E", utilities: "#BA7517", health: "#7F77DD",
  entertainment: "#378ADD", rent: "#639922", other_ex: "#888780",
};

const SAMPLE_DATA = [
  { id: 1, type: "income",   desc: "Monthly salary",    amount: 75000, cat: "salary",        date: "2026-06-01" },
  { id: 2, type: "expense",  desc: "Rent payment",      amount: 18000, cat: "rent",          date: "2026-06-01" },
  { id: 3, type: "expense",  desc: "Groceries",         amount: 3200,  cat: "food",          date: "2026-06-03" },
  { id: 4, type: "expense",  desc: "Electricity bill",  amount: 1400,  cat: "utilities",     date: "2026-06-05" },
  { id: 5, type: "income",   desc: "Freelance project", amount: 12000, cat: "freelance",     date: "2026-06-07" },
  { id: 6, type: "expense",  desc: "Metro pass",        amount: 600,   cat: "transport",     date: "2026-06-08" },
  { id: 7, type: "expense",  desc: "Netflix + Spotify", amount: 800,   cat: "entertainment", date: "2026-06-09" },
  { id: 8, type: "expense",  desc: "Medicines",         amount: 950,   cat: "health",        date: "2026-06-10" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

const today = () => new Date().toISOString().split("T")[0];

const getAllCat = (id) =>
  [...CATEGORIES.income, ...CATEGORIES.expense].find((c) => c.id === id) ||
  { label: "Other", icon: "📦" };

const loadData = () => {
  try {
    const saved = localStorage.getItem("expense_dash_v2");
    return saved ? JSON.parse(saved) : SAMPLE_DATA;
  } catch {
    return SAMPLE_DATA;
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, variant, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-card-label">
        <span>{icon}</span>{label}
      </div>
      <div className={`metric-card-value${variant ? " " + variant : ""}`}>
        {value}
      </div>
    </div>
  );
}

function CategoryBar({ catId, amount, total }) {
  const cat = getAllCat(catId);
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  const color = CAT_COLORS[catId] || "#888";
  return (
    <div className="cat-bar">
      <div className="cat-bar-top">
        <div className="cat-bar-label">
          <span>{cat.icon}</span>
          <span className="cat-bar-label-text">{cat.label}</span>
        </div>
        <div className="cat-bar-amount">
          {fmt(amount)} <span className="cat-bar-pct">({pct}%)</span>
        </div>
      </div>
      <div className="cat-bar-track">
        {/* width/background are per-category data values, kept inline */}
        <div className="cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function TransactionItem({ txn, onDelete }) {
  const cat = getAllCat(txn.cat);
  const color = CAT_COLORS[txn.cat] || "#888";
  const isIncome = txn.type === "income";
  const dateStr = new Date(txn.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  return (
    <div className="txn-item">
      {/* background tint derives from per-category color, kept inline */}
      <div className="txn-icon" style={{ background: color + "22" }}>
        {cat.icon}
      </div>
      <div className="txn-info">
        <div className="txn-desc">{txn.desc}</div>
        <div className="txn-meta">
          <span className={`txn-type-pill ${isIncome ? "income" : "expense"}`}>{txn.type}</span>
          · {cat.label} · {dateStr}
        </div>
      </div>
      <div className={`txn-amount ${isIncome ? "income" : "expense"}`}>
        {isIncome ? "+" : "-"}{fmt(txn.amount)}
      </div>
      <button
        className="del-btn"
        onClick={() => onDelete(txn.id)}
        aria-label="Delete transaction"
      >
        🗑
      </button>
    </div>
  );
}

function DonutChart({ income, expense }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    if (chartRef.current) chartRef.current.destroy();

    // Dynamically load Chart.js if not present
    const build = () => {
      chartRef.current = new window.Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Income", "Expenses"],
          datasets: [{
            data: [income || 0.001, expense || 0.001],
            backgroundColor: ["#1D9E75", "#E24B4A"],
            borderWidth: 0, hoverOffset: 4,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "72%",
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => " " + fmt(c.raw) } },
          },
        },
      });
    };

    if (window.Chart) {
      build();
    } else {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      s.onload = build;
      document.head.appendChild(s);
    }
    return () => { chartRef.current?.destroy(); };
  }, [income, expense]);

  return (
    <div className="donut-wrap">
      <canvas ref={canvasRef} role="img" aria-label={`Income ${fmt(income)} vs Expenses ${fmt(expense)}`} />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function ExpenseDashboard() {
  const [transactions, setTransactions] = useState(loadData);
  const [txnType, setTxnType]     = useState("income");
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [darkMode, setDarkMode]   = useState(false);
  const [form, setForm]           = useState({ desc: "", amount: "", cat: "salary", date: today() });
  const [shake, setShake]         = useState(false);

  // Sync categories with type
  useEffect(() => {
    setForm((f) => ({ ...f, cat: CATEGORIES[txnType][0].id }));
  }, [txnType]);

  // Persist
  useEffect(() => {
    try { localStorage.setItem("expense_dash_v2", JSON.stringify(transactions)); } catch {}
  }, [transactions]);

  // Metrics
  const income  = useMemo(() => transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [transactions]);
  const expense = useMemo(() => transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [transactions]);
  const balance = income - expense;
  const savings = income > 0 ? Math.round((balance / income) * 100) : 0;

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filter !== "all") list = list.filter((t) => t.type === filter);
    if (search) list = list.filter((t) =>
      t.desc.toLowerCase().includes(search.toLowerCase()) ||
      getAllCat(t.cat).label.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [transactions, filter, search]);

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const expTxns = transactions.filter((t) => t.type === "expense");
    const total = expTxns.reduce((s, t) => s + t.amount, 0);
    const bycat = {};
    expTxns.forEach((t) => { bycat[t.cat] = (bycat[t.cat] || 0) + t.amount; });
    return { total, sorted: Object.entries(bycat).sort((a, b) => b[1] - a[1]).slice(0, 6) };
  }, [transactions]);

  const addTransaction = () => {
    if (!form.desc.trim() || !form.amount || parseFloat(form.amount) <= 0 || !form.date) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setTransactions((prev) => [{
      id: Date.now(),
      type: txnType,
      desc: form.desc.trim(),
      amount: parseFloat(form.amount),
      cat: form.cat,
      date: form.date,
    }, ...prev]);
    setForm((f) => ({ ...f, desc: "", amount: "" }));
  };

  const deleteTransaction = (id) =>
    setTransactions((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className={`eda-root${darkMode ? " dark" : ""}`}>
      <div className="eda-container">

        {/* ── Top Bar ── */}
        <div className="eda-topbar">
          <div className="eda-brand">
            <div className="eda-brand-icon">💹</div>
            <div>
              <div className="eda-brand-title">Expense Analytics</div>
              <div className="eda-brand-subtitle">Track. Analyse. Save.</div>
            </div>
          </div>
          <div className="eda-topbar-actions">
            {/* Search */}
            <div className="eda-search">
              <span className="eda-search-icon">🔍</span>
              <input
                className="eda-search-input"
                type="text" placeholder="Search…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search transactions"
              />
            </div>
            {/* Dark mode */}
            <button
              className="eda-darkmode-btn"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle dark mode"
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </div>

        {/* ── Metrics ── */}
        <div className="eda-grid-metrics">
          <MetricCard label="Balance"      value={fmt(balance)}   variant={balance >= 0 ? "positive" : "negative"} icon="💳" />
          <MetricCard label="Total income" value={fmt(income)}    variant="positive" icon="📥" />
          <MetricCard label="Expenses"     value={fmt(expense)}   variant="negative" icon="📤" />
          <MetricCard label="Savings rate" value={`${savings}%`}  variant="info" icon="🐖" />
        </div>

        {/* ── Form + Transactions ── */}
        <div className="eda-grid-form-list">

          {/* Add form */}
          <div className="eda-card">
            <div className="eda-card-title">➕ Add transaction</div>

            {/* Type toggle */}
            <div className="type-toggle">
              {["income", "expense"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTxnType(t)}
                  className={`type-toggle-btn${txnType === t ? (t === "income" ? " active-income" : " active-expense") : ""}`}
                >
                  {t === "income" ? "📈 Income" : "📉 Expense"}
                </button>
              ))}
            </div>

            <div className={`form-fields${shake ? " shake" : ""}`}>
              <div>
                <label className="form-field-label">Description</label>
                <input type="text" placeholder="e.g. Salary, Rent…" value={form.desc}
                  onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addTransaction()} />
              </div>
              <div className="form-row-2col">
                <div>
                  <label className="form-field-label">Amount (₹)</label>
                  <input type="number" placeholder="0" min="0" value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addTransaction()} />
                </div>
                <div>
                  <label className="form-field-label">Date</label>
                  <input type="date" value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-field-label">Category</label>
                <select value={form.cat} onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))}>
                  {CATEGORIES[txnType].map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <button
                className={`submit-btn ${txnType === "income" ? "income" : "expense"}`}
                onClick={addTransaction}
              >
                ➕ Add {txnType}
              </button>
            </div>
          </div>

          {/* Transaction list */}
          <div className="eda-card">
            <div className="eda-card-title tight">📋 Recent transactions</div>
            <div className="filter-row">
              {["all", "income", "expense"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`filter-btn${filter === f ? " active" : ""}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="txn-list">
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  No transactions found
                </div>
              ) : (
                filtered.slice(0, 20).map((t) => (
                  <div key={t.id} className="slide-in">
                    <TransactionItem txn={t} onDelete={deleteTransaction} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Analytics Row ── */}
        <div className="eda-grid-analytics">

          {/* Category breakdown */}
          <div className="eda-card">
            <div className="eda-card-title">📊 Spending by category</div>
            {catBreakdown.sorted.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💤</div>
                No expenses yet
              </div>
            ) : (
              <div className="cat-breakdown-list">
                {catBreakdown.sorted.map(([catId, amt]) => (
                  <CategoryBar key={catId} catId={catId} amount={amt} total={catBreakdown.total} />
                ))}
              </div>
            )}
          </div>

          {/* Donut chart */}
          <div className="eda-card">
            <div className="eda-card-title tight">🍩 Income vs expenses</div>
            <DonutChart income={income} expense={expense} />
            <div className="donut-legend">
              {[["#1D9E75", "Income", income], ["#E24B4A", "Expenses", expense]].map(([color, label, val]) => (
                <span key={label} className="donut-legend-item">
                  <span className="donut-legend-swatch" style={{ background: color }} />
                  {label}: {fmt(val)}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

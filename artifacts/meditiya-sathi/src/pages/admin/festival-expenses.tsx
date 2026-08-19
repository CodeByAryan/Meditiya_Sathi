import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  IndianRupee,
  Wallet,
  Banknote,
  CreditCard,
  Receipt,
  Landmark,
  HelpCircle,
  Edit3,
  Trash2,
  Download,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  X,
  PieChart as PieIcon,
  Layers,
  CalendarDays,
  User,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn, getApiUrl } from "@/lib/utils";
import * as XLSX from "xlsx";

// ── Types & Constants ─────────────────────────────────────────────────────────

export interface ExpenseItem {
  id: number;
  festivalId: number;
  expenseName: string;
  category: string;
  amount: string;
  paymentMethod: string;
  expenseDate: string;
  createdByAdminId: string;
  createdByAdminName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalDonations: number;
  remainingMoney: number;
  expenseCount: number;
  cash: number;
  upi: number;
  cheque: number;
  bankTransfer: number;
  other: number;
}

export interface FestivalInfo {
  id: number;
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  description?: string;
  status?: string;
  totalCollection?: number;
}

const CATEGORIES = [
  "Decoration",
  "Pooja",
  "Prasad / Food",
  "Sound System",
  "Electricity",
  "Pandal / Setup",
  "Transportation",
  "Printing",
  "Cleaning",
  "Other",
] as const;

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash", icon: Banknote, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  { key: "upi", label: "UPI", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { key: "cheque", label: "Cheque", icon: Receipt, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { key: "bank_transfer", label: "Bank Transfer", icon: Landmark, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  { key: "other", label: "Other", icon: HelpCircle, color: "text-zinc-400", bg: "bg-zinc-400/10", border: "border-zinc-400/20" },
] as const;

const CATEGORY_COLORS: Record<string, { color: string; bg: string; bar: string }> = {
  Decoration: { color: "text-amber-400", bg: "bg-amber-400/10", bar: "bg-gradient-to-r from-amber-500 to-amber-400" },
  Pooja: { color: "text-orange-400", bg: "bg-orange-400/10", bar: "bg-gradient-to-r from-orange-500 to-orange-400" },
  "Prasad / Food": { color: "text-rose-400", bg: "bg-rose-400/10", bar: "bg-gradient-to-r from-rose-500 to-rose-400" },
  "Sound System": { color: "text-cyan-400", bg: "bg-cyan-400/10", bar: "bg-gradient-to-r from-cyan-500 to-cyan-400" },
  Electricity: { color: "text-yellow-400", bg: "bg-yellow-400/10", bar: "bg-gradient-to-r from-yellow-500 to-yellow-400" },
  "Pandal / Setup": { color: "text-indigo-400", bg: "bg-indigo-400/10", bar: "bg-gradient-to-r from-indigo-500 to-indigo-400" },
  Transportation: { color: "text-teal-400", bg: "bg-teal-400/10", bar: "bg-gradient-to-r from-teal-500 to-teal-400" },
  Printing: { color: "text-pink-400", bg: "bg-pink-400/10", bar: "bg-gradient-to-r from-pink-500 to-pink-400" },
  Cleaning: { color: "text-emerald-400", bg: "bg-emerald-400/10", bar: "bg-gradient-to-r from-emerald-500 to-emerald-400" },
  Other: { color: "text-zinc-400", bg: "bg-zinc-400/10", bar: "bg-gradient-to-r from-zinc-500 to-zinc-400" },
};

function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num || 0);
}

function formatDateReadable(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function authHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem("admin_auth");
    if (!stored) return { "Content-Type": "application/json" };
    const token = JSON.parse(stored)?.token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return { "Content-Type": "application/json" };
  }
}

// ── Form Modal ───────────────────────────────────────────────────────────────

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  festivalId: number;
  festivalName: string;
  expense?: ExpenseItem | null;
}

function ExpenseFormModal({
  isOpen,
  onClose,
  onSaved,
  festivalId,
  festivalName,
  expense,
}: ExpenseFormModalProps) {
  const [expenseName, setExpenseName] = useState("");
  const [category, setCategory] = useState<string>("Decoration");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (expense) {
      setExpenseName(expense.expenseName || "");
      setCategory(expense.category || "Decoration");
      setAmount(String(expense.amount || ""));
      setPaymentMethod(expense.paymentMethod || "cash");
      setExpenseDate(
        expense.expenseDate || new Date().toISOString().split("T")[0]
      );
    } else {
      setExpenseName("");
      setCategory("Decoration");
      setAmount("");
      setPaymentMethod("cash");
      setExpenseDate(new Date().toISOString().split("T")[0]);
    }
    setErrors({});
  }, [expense, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!expenseName.trim()) {
      errs.expenseName = "Expense name is required";
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = "Please enter a valid amount greater than 0";
    }
    if (!expenseDate) {
      errs.expenseDate = "Date is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        expenseName: expenseName.trim(),
        category,
        amount: parseFloat(amount).toFixed(2),
        paymentMethod,
        expenseDate,
      };

      const endpoint = expense
        ? `${getApiUrl()}/api/admin/festival-expenses/${expense.id}`
        : `${getApiUrl()}/api/admin/festivals/${festivalId}/expenses`;

      const res = await fetch(endpoint, {
        method: expense ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save expense");
      }

      toast.success(
        expense ? "Expense updated successfully!" : "Expense added successfully!"
      );
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-lg rounded-2xl bg-[#121210] border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent glow line */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300" />

          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                  {festivalName}
                </p>
              </div>
              <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                {expense ? (
                  <>
                    <Edit3 className="w-5 h-5 text-amber-300" /> Edit Expense
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-amber-300" /> Add New Expense
                  </>
                )}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {expense
                  ? "Update the details for this expense record."
                  : "Record where festival funds were allocated."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Expense Name */}
            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5">
                Expense Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={expenseName}
                onChange={(e) => {
                  setExpenseName(e.target.value);
                  if (errors.expenseName) setErrors((prev) => ({ ...prev, expenseName: "" }));
                }}
                placeholder="e.g. Ganpati Mandap Flowers, Sound System"
                className={cn(
                  "w-full px-4 py-2.5 text-sm rounded-xl border border-white/10 bg-white/[0.05] text-white placeholder:text-white/30 outline-none transition-all focus:border-amber-400/60 focus:ring-4 focus:ring-amber-400/10",
                  errors.expenseName && "border-rose-500/80 focus:border-rose-500"
                )}
              />
              {errors.expenseName && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.expenseName}
                </p>
              )}
            </div>

            {/* Category & Payment Method Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">
                  Category <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-white/10 bg-[#1e1e1a] text-white outline-none transition-all focus:border-amber-400/60 focus:ring-4 focus:ring-amber-400/10 cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#181816] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">
                  Payment Method <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-white/10 bg-[#1e1e1a] text-white outline-none transition-all focus:border-amber-400/60 focus:ring-4 focus:ring-amber-400/10 cursor-pointer"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.key} value={m.key} className="bg-[#181816] text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Amount & Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">
                  Amount (₹) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-amber-300 font-bold text-sm pointer-events-none">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                    }}
                    placeholder="0.00"
                    className={cn(
                      "w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-white/10 bg-white/[0.05] text-white placeholder:text-white/30 outline-none transition-all focus:border-amber-400/60 focus:ring-4 focus:ring-amber-400/10",
                      errors.amount && "border-rose-500/80 focus:border-rose-500"
                    )}
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.amount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5">
                  Expense Date <span className="text-amber-400">*</span>
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => {
                    setExpenseDate(e.target.value);
                    if (errors.expenseDate) setErrors((prev) => ({ ...prev, expenseDate: "" }));
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-sm rounded-xl border border-white/10 bg-white/[0.05] text-white outline-none transition-all focus:border-amber-400/60 focus:ring-4 focus:ring-amber-400/10",
                    errors.expenseDate && "border-rose-500/80 focus:border-rose-500"
                  )}
                />
                {errors.expenseDate && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.expenseDate}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] text-sm font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#E5C158] text-black text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : expense ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Save Changes
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Add Expense
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

interface DeleteExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  expense: ExpenseItem | null;
  isDeleting: boolean;
}

function DeleteExpenseModal({
  isOpen,
  onClose,
  onConfirm,
  expense,
  isDeleting,
}: DeleteExpenseModalProps) {
  if (!isOpen || !expense) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-2xl bg-[#121210] border border-red-500/30 shadow-[0_20px_60px_rgba(239,68,68,0.2)] overflow-hidden p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-rose-400" />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">Delete Expense?</h3>
          <p className="text-sm text-zinc-400 mb-2">
            Are you sure you want to delete this expense record?
          </p>

          <div className="p-3 my-4 rounded-xl bg-white/[0.04] border border-white/10 text-left space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-white/60">Expense:</span>
              <span className="font-semibold text-white">{expense.expenseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Category:</span>
              <span className="font-semibold text-amber-300">{expense.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Amount:</span>
              <span className="font-bold text-white">{formatCurrency(expense.amount)}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 mb-6">
            This action cannot be undone and will immediately update festival totals.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" /> Delete Expense
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function FestivalExpenses() {
  const { festivalId: rawId, id: fallbackId } = useParams<{
    festivalId?: string;
    id?: string;
  }>();
  const festivalId = Number(rawId || fallbackId);

  const [festival, setFestival] = useState<FestivalInfo | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    totalDonations: 0,
    remainingMoney: 0,
    expenseCount: 0,
    cash: 0,
    upi: 0,
    cheque: 0,
    bankTransfer: 0,
    other: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch Data ───────────────────────────────────────────────────────────────

  const loadExpenses = useCallback(async () => {
    if (!festivalId) return;
    setIsLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (categoryFilter) query.set("category", categoryFilter);
    if (paymentFilter) query.set("paymentMethod", paymentFilter);
    if (dateFrom) query.set("dateFrom", dateFrom);
    if (dateTo) query.set("dateTo", dateTo);

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/festivals/${festivalId}/expenses?${query.toString()}`,
        { headers: authHeaders() }
      );

      if (!res.ok) {
        throw new Error("Failed to load expenses");
      }

      const data = await res.json();
      setExpenses(data.expenses || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  }, [festivalId, search, categoryFilter, paymentFilter, dateFrom, dateTo]);

  const loadFestival = useCallback(async () => {
    if (!festivalId) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setFestival(data);
      }
    } catch {
      // Non-fatal
    }
  }, [festivalId]);

  useEffect(() => {
    loadFestival();
  }, [loadFestival]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // ── Delete Handler ───────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/festival-expenses/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to delete expense");
      }

      toast.success("Expense deleted successfully");
      setDeleteTarget(null);
      loadExpenses();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete expense");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Excel Export ─────────────────────────────────────────────────────────────

  const handleExportExcel = () => {
    if (!festival) return;

    const festivalTitle = `${festival.name} ${festival.year}`;

    // Summary Sheet
    const summarySheetData = [
      { Metric: "Festival", Value: festivalTitle },
      { Metric: "Total Donations Collected", Value: summary.totalDonations || 0 },
      { Metric: "Total Expenses Recorded", Value: summary.totalExpenses || 0 },
      { Metric: "Remaining Balance", Value: summary.remainingMoney || 0 },
      { Metric: "Total Expense Count", Value: summary.expenseCount || 0 },
      { Metric: "Cash Expenses", Value: summary.cash || 0 },
      { Metric: "UPI Expenses", Value: summary.upi || 0 },
      { Metric: "Cheque Expenses", Value: summary.cheque || 0 },
      { Metric: "Bank Transfer Expenses", Value: summary.bankTransfer || 0 },
      { Metric: "Other Expenses", Value: summary.other || 0 },
    ];

    // Expenses Sheet
    const expensesSheetData = expenses.map((item) => ({
      Date: formatDateReadable(item.expenseDate),
      "Expense Name": item.expenseName,
      Category: item.category,
      "Amount (INR)": parseFloat(item.amount) || 0,
      "Payment Method":
        PAYMENT_METHODS.find((m) => m.key === item.paymentMethod)?.label ||
        item.paymentMethod,
      "Added By": item.createdByAdminName,
      "Created At": item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "—",
    }));

    const workbook = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
    const wsExpenses = XLSX.utils.json_to_sheet(expensesSheetData);

    // Auto width
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 25 }];
    wsExpenses["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, wsSummary, "Expense Summary");
    XLSX.utils.book_append_sheet(workbook, wsExpenses, "Expenses");

    const safeFilename = `${festival.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${festival.year}_Expenses.xlsx`;
    XLSX.writeFile(workbook, safeFilename);
    toast.success(`Exported ${safeFilename}`);
  };

  // ── Computed Analytics ───────────────────────────────────────────────────────

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const cat of CATEGORIES) {
      map.set(cat, { total: 0, count: 0 });
    }

    expenses.forEach((item) => {
      const amt = parseFloat(item.amount) || 0;
      const current = map.get(item.category) || { total: 0, count: 0 };
      map.set(item.category, {
        total: current.total + amt,
        count: current.count + 1,
      });
    });

    const list = Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        percent: summary.totalExpenses > 0 ? (data.total / summary.totalExpenses) * 100 : 0,
      }))
      .filter((item) => item.total > 0 || item.count > 0)
      .sort((a, b) => b.total - a.total);

    return list;
  }, [expenses, summary.totalExpenses]);

  const paymentBreakdown = useMemo(() => {
    const list = PAYMENT_METHODS.map((method) => {
      let amount = 0;
      if (method.key === "cash") amount = summary.cash || 0;
      else if (method.key === "upi") amount = summary.upi || 0;
      else if (method.key === "cheque") amount = summary.cheque || 0;
      else if (method.key === "bank_transfer") amount = summary.bankTransfer || 0;
      else if (method.key === "other") amount = summary.other || 0;

      const percent = summary.totalExpenses > 0 ? (amount / summary.totalExpenses) * 100 : 0;
      return {
        ...method,
        amount,
        percent,
      };
    }).sort((a, b) => b.amount - a.amount);

    return list;
  }, [summary]);

  const budgetProgress = useMemo(() => {
    const collected = summary.totalDonations || 0;
    const spent = summary.totalExpenses || 0;
    const percent = collected > 0 ? Math.min(100, Math.round((spent / collected) * 100)) : spent > 0 ? 100 : 0;
    const isOver = spent > collected && collected > 0;
    const overAmount = spent - collected;

    return {
      collected,
      spent,
      percent,
      isOver,
      overAmount,
    };
  }, [summary]);

  const hasActiveFilters = Boolean(
    search.trim() || categoryFilter || paymentFilter || dateFrom || dateTo
  );

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setPaymentFilter("");
    setDateFrom("");
    setDateTo("");
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#080808] text-white pb-24">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[550px] h-[550px] rounded-full bg-amber-500/[0.05] blur-[130px]" />
        <div className="absolute top-[35%] -left-40 w-[450px] h-[450px] rounded-full bg-orange-500/[0.035] blur-[120px]" />
        <div className="absolute bottom-0 right-[20%] w-[500px] h-[500px] rounded-full bg-amber-400/[0.03] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,170,70,0.06),transparent_35%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {/* ── Top Navigation / Header ────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-start sm:items-center gap-3.5">
            <Link
              href={`/admin/festivals/${festivalId}`}
              className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 backdrop-blur-xl transition-all hover:border-amber-300/30 hover:bg-amber-300/[0.08] hover:text-amber-200 shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
              title="Back to Festival Details"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-amber-300/10 border border-amber-300/20 text-amber-300">
                  <Sparkles className="w-3 h-3" /> Financial Management
                </span>
                {festival?.status && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/[0.05] border border-white/10 text-white/60">
                    <Clock className="w-3 h-3 text-amber-400" /> {festival.status}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white flex items-center gap-2">
                {festival ? `${festival.name} ${festival.year}` : "Festival"}
                <span className="text-white/40 font-sans font-normal text-lg sm:text-xl">
                  — Expense Tracker
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-white/50 mt-0.5">
                Track, analyze, and manage every mandal expense for this festival.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 self-end md:self-center w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              disabled={expenses.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-amber-300/30 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => {
                setEditingExpense(null);
                setIsFormOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#E5C158] text-black text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* ── Financial Overview Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total Donations */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl shadow-[0_12px_35px_rgba(0,0,0,0.3)] transition-all hover:border-emerald-400/30 hover:bg-white/[0.05]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-white/60">Total Donations</p>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                  {formatCurrency(summary.totalDonations)}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Total funds collected from donations</span>
            </div>
          </div>

          {/* Card 2: Total Expenses */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl shadow-[0_12px_35px_rgba(0,0,0,0.3)] transition-all hover:border-rose-400/30 hover:bg-white/[0.05]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/60 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-white/60">Total Expenses</p>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                  {formatCurrency(summary.totalExpenses)}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-400/10 border border-rose-400/20 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.15)]">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-rose-400/90 font-medium">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{summary.expenseCount || 0} recorded expense transactions</span>
            </div>
          </div>

          {/* Card 3: Remaining Balance */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl shadow-[0_12px_35px_rgba(0,0,0,0.3)] transition-all hover:border-amber-300/40 hover:bg-white/[0.05]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-white/60">Available Balance</p>
                <h3
                  className={cn(
                    "text-2xl sm:text-3xl font-bold tracking-tight mt-1",
                    summary.remainingMoney < 0 ? "text-rose-400" : "text-amber-300"
                  )}
                >
                  {formatCurrency(summary.remainingMoney)}
                </h3>
              </div>
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg",
                  summary.remainingMoney < 0
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10"
                    : "bg-amber-300/10 border-amber-300/20 text-amber-300 shadow-amber-300/15"
                )}
              >
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/60 font-medium">
              {summary.remainingMoney < 0 ? (
                <span className="text-rose-400 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Expenses exceed collections
                </span>
              ) : (
                <span className="text-amber-300/90 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Net balance available
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Expense Count */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl shadow-[0_12px_35px_rgba(0,0,0,0.3)] transition-all hover:border-purple-400/30 hover:bg-white/[0.05]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-white/60">Total Expenses</p>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                  {summary.expenseCount || 0}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.15)]">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
              <span>Managed by Mandal Admins</span>
            </div>
          </div>
        </div>

        {/* ── Budget Utilization Progress ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl shadow-[0_12px_35px_rgba(0,0,0,0.3)] mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-300/10 border border-amber-300/20 flex items-center justify-center text-amber-300">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Festival Budget Utilization</h3>
                <p className="text-xs text-white/50">
                  {formatCurrency(budgetProgress.spent)} spent of {formatCurrency(budgetProgress.collected)} collected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full border",
                  budgetProgress.isOver
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : budgetProgress.percent > 85
                    ? "bg-amber-400/10 text-amber-300 border-amber-400/30"
                    : "bg-emerald-400/10 text-emerald-400 border-emerald-400/30"
                )}
              >
                {budgetProgress.isOver
                  ? `Over Budget by ${formatCurrency(budgetProgress.overAmount)}`
                  : `${budgetProgress.percent}% Used`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden p-0.5 border border-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                budgetProgress.isOver
                  ? "bg-gradient-to-r from-amber-500 via-rose-500 to-rose-400"
                  : budgetProgress.percent > 80
                  ? "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300"
                  : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300"
              )}
              style={{ width: `${Math.min(100, budgetProgress.percent)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/[0.06] text-xs text-white/60">
            <div>
              <span className="text-[10px] uppercase text-white/40 block">Collected</span>
              <span className="font-semibold text-white">{formatCurrency(budgetProgress.collected)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-white/40 block">Spent</span>
              <span className="font-semibold text-white">{formatCurrency(budgetProgress.spent)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-white/40 block">Remaining</span>
              <span className={cn("font-semibold", summary.remainingMoney < 0 ? "text-rose-400" : "text-amber-300")}>
                {formatCurrency(summary.remainingMoney)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-white/40 block">Percent Used</span>
              <span className="font-semibold text-white">{budgetProgress.percent}%</span>
            </div>
          </div>
        </div>

        {/* ── Spending Analytics Grid (Payment Methods & Categories) ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Payment Methods Breakdown */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl shadow-[0_12px_35px_rgba(0,0,0,0.3)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-300/10 border border-amber-300/20 flex items-center justify-center text-amber-300">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Payment Method Distribution</h3>
                    <p className="text-xs text-white/50">Spending broken down by payment mode</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {formatCurrency(summary.totalExpenses)}
                </span>
              </div>

              <div className="space-y-3.5">
                {paymentBreakdown.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border", m.bg, m.border, m.color)}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium text-white/90">{m.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{formatCurrency(m.amount)}</span>
                          <span className="text-[10px] font-mono text-white/40 w-9 text-right">
                            {m.percent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", m.bg.replace('/10', '/70'))}
                          style={{ width: `${m.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/50">
              <span>Active Payment Channels</span>
              <span className="font-semibold text-white">5 Supported</span>
            </div>
          </div>

          {/* Categories Breakdown */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl shadow-[0_12px_35px_rgba(0,0,0,0.3)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-300/10 border border-amber-300/20 flex items-center justify-center text-amber-300">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Expense Category Breakdown</h3>
                    <p className="text-xs text-white/50">Top spending areas for this festival</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {categoryBreakdown.length} Active
                </span>
              </div>

              {categoryBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  No category expenses recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.slice(0, 5).map((cat) => {
                    const styling = CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.Other;
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", styling.color.replace('text-', 'bg-'))} />
                            <span className="font-medium text-white/90">{cat.name}</span>
                            <span className="text-[10px] text-white/40">({cat.count})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{formatCurrency(cat.total)}</span>
                            <span className="text-[10px] font-mono text-white/40 w-9 text-right">
                              {cat.percent.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", styling.bar)}
                            style={{ width: `${cat.percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/50">
              <span>Sorted by Highest Allocation</span>
              <span className="font-semibold text-white">{categoryBreakdown.length} Categories</span>
            </div>
          </div>
        </div>

        {/* ── Expense Management Toolbar & List Section ──────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-2xl shadow-[0_15px_50px_rgba(0,0,0,0.4)] overflow-hidden">
          {/* Section Header */}
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-amber-500/[0.04] via-transparent to-transparent">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-300" /> Recent Expenses
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                All individual expenses recorded under {festival ? festival.name : "this festival"}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingExpense(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-300 text-black text-xs font-bold hover:bg-amber-200 transition-all self-start sm:self-auto shadow-md shadow-amber-300/10"
            >
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </button>
          </div>

          {/* Filters Toolbar */}
          <div className="p-4 border-b border-white/10 bg-white/[0.015]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expense name..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-white/10 bg-white/[0.04] text-white placeholder:text-white/30 outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 transition-all"
                />
              </div>

              {/* Category Filter */}
              <div className="lg:col-span-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/10 bg-[#191917] text-white outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 transition-all cursor-pointer"
                >
                  <option value="" className="bg-[#191917]">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#191917]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="lg:col-span-3">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/10 bg-[#191917] text-white outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 transition-all cursor-pointer"
                >
                  <option value="" className="bg-[#191917]">All Payment Methods</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.key} value={m.key} className="bg-[#191917]">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filters */}
              <div className="lg:col-span-2 flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  title="From Date"
                  className="w-1/2 px-2 py-2 text-xs rounded-xl border border-white/10 bg-white/[0.04] text-white outline-none focus:border-amber-400/50"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  title="To Date"
                  className="w-1/2 px-2 py-2 text-xs rounded-xl border border-white/10 bg-white/[0.04] text-white outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-white/[0.06]">
                <span className="text-white/50 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-300" /> Active filters applied
                </span>
                <button
                  onClick={resetFilters}
                  className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* ── Table & Cards View ────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-amber-300 animate-spin mb-3" />
              <p className="text-sm font-semibold text-white/80">Loading expenses...</p>
              <p className="text-xs text-white/40 mt-0.5">Fetching latest financial records</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-rose-400">{error}</p>
              <button
                onClick={loadExpenses}
                className="mt-4 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white"
              >
                Retry
              </button>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-300/10 border border-amber-300/20 flex items-center justify-center text-amber-300 mx-auto mb-4">
                <Receipt className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No expenses recorded yet</h3>
              <p className="text-xs text-white/50 max-w-sm mx-auto mb-6">
                Start tracking your festival spending by recording your first expense.
              </p>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#E5C158] text-black text-xs font-bold shadow-lg shadow-[#D4AF37]/20 hover:brightness-110"
              >
                <Plus className="w-4 h-4" /> Add First Expense
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-4">Expense Name</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Payment Method</th>
                      <th className="py-3.5 px-4">Added By</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {expenses.map((item) => {
                      const methodConfig =
                        PAYMENT_METHODS.find((m) => m.key === item.paymentMethod) ||
                        PAYMENT_METHODS[4];
                      const MethodIcon = methodConfig.icon;
                      const catConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-white/[0.035] transition-colors group"
                        >
                          <td className="py-4 px-5 text-white/70 whitespace-nowrap font-mono">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 text-white/40" />
                              {formatDateReadable(item.expenseDate)}
                            </div>
                          </td>

                          <td className="py-4 px-4 font-semibold text-white">
                            <div className="max-w-[220px] truncate">{item.expenseName}</div>
                          </td>

                          <td className="py-4 px-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                                catConfig.bg,
                                catConfig.color,
                                "border-white/10"
                              )}
                            >
                              {item.category}
                            </span>
                          </td>

                          <td className="py-4 px-4 font-bold text-sm text-white whitespace-nowrap">
                            <span className="text-amber-300 font-mono">
                              {formatCurrency(item.amount)}
                            </span>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                                methodConfig.bg,
                                methodConfig.color,
                                methodConfig.border
                              )}
                            >
                              <MethodIcon className="w-3 h-3" />
                              {methodConfig.label}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-white/60 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300 text-[10px]">
                                <User className="w-3 h-3" />
                              </div>
                              <span className="truncate max-w-[140px]">
                                {item.createdByAdminName}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingExpense(item);
                                  setIsFormOpen(true);
                                }}
                                className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/60 hover:text-amber-300 hover:border-amber-300/30 hover:bg-amber-300/10 transition-all"
                                title="Edit Expense"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/60 hover:text-rose-400 hover:border-rose-400/30 hover:bg-rose-500/10 transition-all"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden p-4 space-y-3">
                {expenses.map((item) => {
                  const methodConfig =
                    PAYMENT_METHODS.find((m) => m.key === item.paymentMethod) ||
                    PAYMENT_METHODS[4];
                  const MethodIcon = methodConfig.icon;
                  const catConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-sm">{item.expenseName}</h4>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                              catConfig.bg,
                              catConfig.color,
                              "border-white/10"
                            )}
                          >
                            {item.category}
                          </span>
                        </div>
                        <span className="text-base font-bold text-amber-300 font-mono">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-white/[0.06]">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                            methodConfig.bg,
                            methodConfig.color,
                            methodConfig.border
                          )}
                        >
                          <MethodIcon className="w-3 h-3" />
                          {methodConfig.label}
                        </span>

                        <span className="text-white/50 text-[11px] font-mono">
                          {formatDateReadable(item.expenseDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs text-white/50">
                        <span className="truncate">Added by {item.createdByAdminName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setEditingExpense(item);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-white/70 hover:text-amber-300 hover:border-amber-300/30"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-white/70 hover:text-rose-400 hover:border-rose-400/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Section Footer */}
          {!isLoading && !error && expenses.length > 0 && (
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-white/50">
              <span>Showing {expenses.length} expenses</span>
              <span>Sorted by newest date</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingExpense(null);
        }}
        onSaved={loadExpenses}
        festivalId={festivalId}
        festivalName={festival ? `${festival.name} ${festival.year}` : "Festival"}
        expense={editingExpense}
      />

      <DeleteExpenseModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        expense={deleteTarget}
        isDeleting={isDeleting}
      />
    </div>
  );
}

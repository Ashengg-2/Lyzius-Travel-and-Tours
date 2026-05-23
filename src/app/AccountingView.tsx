import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Calculator,
  FileDown,
  Landmark,
  Plus,
  TrendingDown,
  TrendingUp,
  X,
  UserRound,
} from "lucide-react";
import { formatMoneyPhp, parseMoneyPhp } from "../lib/itineraryMoney";
import type {
  AccountingLine,
  AccountingSnapshot,
} from "./accountingTypes";
import {
  ACCOUNTING_STORAGE_KEY,
  blankAccountingLine,
  blankAccountingSnapshot,
  loadAccountingSnapshot,
} from "./accountingStorage";
import { AccountingPdfExportSurface } from "./accountingPdfExportPages";

const inp =
  "w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-colors";

const ta = `${inp} resize-none`;

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function LedgerSection({
  title,
  subtitle,
  icon,
  tint,
  rows,
  onRowsChange,
  counterpartyPlaceholder,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tint: "rose" | "emerald";
  rows: AccountingLine[];
  onRowsChange: (next: AccountingLine[]) => void;
  counterpartyPlaceholder: string;
}) {
  const add = () =>
    onRowsChange([...rows, blankAccountingLine()]);

  const remove = (id: string) =>
    onRowsChange(rows.filter((r) => r.id !== id));

  const update = (
    id: string,
    field: keyof AccountingLine,
    val: string,
  ) =>
    onRowsChange(
      rows.map((r) =>
        r.id === id ? { ...r, [field]: val } : r,
      ),
    );

  const borderTint =
    tint === "rose"
      ? "border-rose-200/80 bg-rose-50/30"
      : "border-emerald-200/80 bg-emerald-50/30";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${borderTint}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            tint === "rose"
              ? "bg-rose-100 text-rose-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No lines yet — add one to track amounts.
          </p>
        ) : null}

        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-border/80 bg-card/80"
          >
            <Field
              label="Description"
              className="flex-1 min-w-[140px]"
            >
              <input
                className={inp}
                value={row.description}
                placeholder="Hotel settlement, airfare, commission…"
                onChange={(e) =>
                  update(row.id, "description", e.target.value)
                }
              />
            </Field>
            <Field label="Vendor / Party" className="flex-1 min-w-[120px]">
              <input
                className={inp}
                value={row.counterparty}
                placeholder={counterpartyPlaceholder}
                onChange={(e) =>
                  update(row.id, "counterparty", e.target.value)
                }
              />
            </Field>
            <Field label="Amount (PHP)" className="w-32 shrink-0">
              <input
                className={`${inp} font-mono text-sm`}
                value={row.amount}
                placeholder="0.00"
                onChange={(e) =>
                  update(row.id, "amount", e.target.value)
                }
              />
            </Field>
            <button
              type="button"
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors shrink-0 mb-px"
              aria-label="Remove line"
              onClick={() => remove(row.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 text-xs text-accent hover:opacity-85 font-semibold flex items-center gap-1 transition-opacity"
      >
        <Plus size={12} /> Add line
      </button>
    </div>
  );
}

export default function AccountingView() {
  const [data, setData] = useState<AccountingSnapshot>(() =>
    loadAccountingSnapshot(),
  );
  const [pdfExporting, setPdfExporting] = useState(false);

  /** Debounced persist */

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          ACCOUNTING_STORAGE_KEY,
          JSON.stringify(data),
        );
      } catch {
        //
      }
    }, 420);
    return () => window.clearTimeout(t);
  }, [data]);

  const hydrate = useCallback(() => {
    setData(loadAccountingSnapshot());
  }, []);

  const exportPdf = useCallback(async () => {
    setPdfExporting(true);
    try {
      const { exportAccountingPdfToFile } = await import(
        "./exportAccountingPdf"
      );
      const slug = (
        data.clientName.trim().replace(/\s+/g, " ") || "accounting-sheet"
      );
      await exportAccountingPdfToFile(slug);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not build accounting PDF.";
      window.alert(msg);
    } finally {
      setPdfExporting(false);
    }
  }, [data.clientName]);

  const setClient = (
    field: keyof Pick<
      AccountingSnapshot,
      | "clientName"
      | "clientCompany"
      | "clientEmail"
      | "clientPhone"
      | "clientNotes"
    >,
    value: string,
  ) =>
    setData((d) => ({ ...d, [field]: value }));

  const totals = useMemo(() => {
    let pay = 0;
    let rec = 0;
    for (const row of data.payables) {
      pay += Math.abs(parseMoneyPhp(row.amount));
    }
    for (const row of data.receivables) {
      rec += Math.abs(parseMoneyPhp(row.amount));
    }
    const net = rec - pay;
    return {
      payableSum: pay,
      receivableSum: rec,
      net,
    };
  }, [data.payables, data.receivables]);

  const clearSheet = () => {
    if (
      !window.confirm(
        "Reset accounting sheet to empty? This clears client fields and every line.",
      )
    )
      return;
    setData(blankAccountingSnapshot());
  };

  return (
    <>
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <main className="max-w-5xl mx-auto px-6 py-8 pb-20">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Landmark
                size={22}
                className="text-accent shrink-0"
              />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Accounting
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">
              Client record for reference, amounts you owe{" "}
              <span className="text-foreground/80">payables</span>, and cash
              you expect{" "}
              <span className="text-foreground/80">
                receivables
              </span>
              . Net income updates as you edit lines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={pdfExporting}
            onClick={() => void exportPdf()}
            className="flex items-center gap-1.5 bg-accent text-accent-foreground px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:pointer-events-none"
          >
            <FileDown size={13} />
            {pdfExporting ? "Building PDF…" : "Export PDF"}
          </button>
          <button
            type="button"
            onClick={() => hydrate()}
            className="text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Reload from disk
          </button>
          </div>
        </div>

        {/* Client details */}
        <section className="rounded-2xl border border-border bg-card shadow-sm mb-8 p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserRound size={18} className="text-accent" />
            <h2 className="font-semibold text-foreground">
              Client details
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Client / account name">
              <input
                className={inp}
                placeholder="Jane Dela Cruz"
                value={data.clientName}
                onChange={(e) =>
                  setClient("clientName", e.target.value)
                }
              />
            </Field>
            <Field label="Company">
              <input
                className={inp}
                placeholder="Optional"
                value={data.clientCompany}
                onChange={(e) =>
                  setClient("clientCompany", e.target.value)
                }
              />
            </Field>
            <Field label="Email">
              <input
                className={inp}
                type="email"
                placeholder="client@example.com"
                value={data.clientEmail}
                onChange={(e) =>
                  setClient("clientEmail", e.target.value)
                }
              />
            </Field>
            <Field label="Phone">
              <input
                className={inp}
                placeholder="+63 …"
                value={data.clientPhone}
                onChange={(e) =>
                  setClient("clientPhone", e.target.value)
                }
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea
                className={`${ta} min-h-[80px]`}
                placeholder="Reference numbers, reminders, VAT notes…"
                value={data.clientNotes}
                onChange={(e) =>
                  setClient("clientNotes", e.target.value)
                }
              />
            </Field>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <LedgerSection
            title="Payables"
            subtitle="Money out — suppliers, ticketing, refunds you owe."
            icon={<TrendingDown size={16} />}
            tint="rose"
            rows={data.payables}
            onRowsChange={(payables) =>
              setData((d) => ({ ...d, payables }))
            }
            counterpartyPlaceholder="Airline · hotel chain"
          />

          <LedgerSection
            title="Receivables"
            subtitle="Money in — client payments pending or collected."
            icon={<TrendingUp size={16} />}
            tint="emerald"
            rows={data.receivables}
            onRowsChange={(receivables) =>
              setData((d) => ({ ...d, receivables }))
            }
            counterpartyPlaceholder="Client · booking ref"
          />
        </div>

        {/* Totals */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-muted/60 to-muted/25 p-6 shadow-inner">
          <div className="flex items-center gap-2 mb-5">
            <Calculator size={18} className="text-accent" />
            <h2 className="font-semibold text-foreground">
              Snapshot
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Total payables
              </div>
              <div className="text-lg font-mono font-semibold text-rose-700">
                PHP {formatMoneyPhp(totals.payableSum)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Total receivables
              </div>
              <div className="text-lg font-mono font-semibold text-emerald-700">
                PHP{" "}
                {formatMoneyPhp(totals.receivableSum)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-accent/10 p-4 sm:col-span-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Net income
              </div>
              <div
                className={`text-xl font-mono font-bold ${
                  totals.net >= 0
                    ? "text-emerald-700"
                    : "text-destructive"
                }`}
              >
                PHP {formatMoneyPhp(totals.net)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Receivables − Payables (unsigned line inputs)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={clearSheet}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-4 hover:underline"
          >
            Reset entire accounting sheet…
          </button>
        </section>
      </main>
    </div>
    <AccountingPdfExportSurface snapshot={data} />
    </>
  );
}

import type {
  AccountingLine,
  AccountingSnapshot,
} from "./accountingTypes";

export const ACCOUNTING_STORAGE_KEY = "lyzius.accounting.v1";

export function blankAccountingLine(): AccountingLine {
  return {
    id: `acct_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    description: "",
    counterparty: "",
    amount: "",
  };
}

export function blankAccountingSnapshot(): AccountingSnapshot {
  return {
    clientName: "",
    clientCompany: "",
    clientEmail: "",
    clientPhone: "",
    clientNotes: "",
    payables: [],
    receivables: [],
  };
}

function coerceLine(raw: unknown): AccountingLine {
  const o =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const id =
    typeof o.id === "string" ? o.id : blankAccountingLine().id;
  return {
    id,
    description:
      typeof o.description === "string" ? o.description : "",
    counterparty:
      typeof o.counterparty === "string"
        ? o.counterparty
        : typeof o.vendor === "string"
          ? o.vendor
          : "",
    amount: typeof o.amount === "string" ? o.amount : "",
  };
}

/** Merge unknown JSON into a safe snapshot (for migrations / corrupted rows). */

export function normalizeAccountingSnapshot(raw: unknown): AccountingSnapshot {
  const base = blankAccountingSnapshot();
  const p =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const payRaw = Array.isArray(p.payables)
    ? p.payables.map(coerceLine)
    : [];

  const recRaw = Array.isArray(p.receivables)
    ? p.receivables.map(coerceLine)
    : [];

  return {
    clientName:
      typeof p.clientName === "string" ? p.clientName : base.clientName,
    clientCompany:
      typeof p.clientCompany === "string"
        ? p.clientCompany
        : base.clientCompany,
    clientEmail:
      typeof p.clientEmail === "string"
        ? p.clientEmail
        : base.clientEmail,
    clientPhone:
      typeof p.clientPhone === "string"
        ? p.clientPhone
        : base.clientPhone,
    clientNotes:
      typeof p.clientNotes === "string"
        ? p.clientNotes
        : base.clientNotes,
    payables: payRaw.length ? payRaw : base.payables,
    receivables: recRaw.length ? recRaw : base.receivables,
  };
}

export function loadAccountingSnapshot(): AccountingSnapshot {
  try {
    const raw = localStorage.getItem(ACCOUNTING_STORAGE_KEY);
    if (!raw) return blankAccountingSnapshot();
    const parsed = JSON.parse(raw) as unknown;
    return normalizeAccountingSnapshot(parsed);
  } catch {
    return blankAccountingSnapshot();
  }
}

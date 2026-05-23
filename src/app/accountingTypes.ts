/** Single payable or receivable line for the accounting ledger */

export interface AccountingLine {
  id: string;
  description: string;
  /** Vendor (payable) or payer / invoice ref (receivable) */
  counterparty: string;
  amount: string;
}

export interface AccountingSnapshot {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  clientNotes: string;
  payables: AccountingLine[];
  receivables: AccountingLine[];
}

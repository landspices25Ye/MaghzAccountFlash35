export interface Account {
  id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  parentId?: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  nature: 'debit' | 'credit';
  isGroup: boolean;
  balance: number;
  isActive: boolean;
  children?: Account[];
}

export interface Transaction {
  id: string;
  companyId: string;
  date: string;
  reference?: string;
  description?: string;
  totalAmount: number;
  status: 'draft' | 'posted' | 'cancelled';
  entries: JournalEntry[];
  createdAt?: string;
}

export interface JournalEntry {
  id: string;
  transactionId: string;
  accountId: string;
  account?: Account;
  debit: number;
  credit: number;
  memo?: string;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface FinancialReport {
  type: 'balance_sheet' | 'profit_loss' | 'cash_flow';
  asOfDate: string;
  lines: FinancialReportLine[];
}

export interface FinancialReportLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  isGroup: boolean;
  level: number;
}

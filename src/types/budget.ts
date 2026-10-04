export type TransactionType = 'recette' | 'depense';
export type TransactionStatus = 'prevu' | 'engage' | 'realise';

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber?: string;
  initialBalance: number;
  currentStatementBalance?: number; // Solde saisi du dernier relevé bancaire réel
  lastStatementDate?: string;
  color?: string;
}

export interface Category {
  id: string;
  code?: string; // N° de compte (ex: 707, 607, 74, 64...)
  name: string;
  type: TransactionType;
  notes?: string; // Commentaire / précisions (max 100 caractères)
  color?: string;
  isCustom?: boolean;
}

export interface BudgetItem {
  id: string;
  fiscalYearId: string;
  categoryId: string;
  plannedAmount: number;
  notes?: string;
}

export interface Transaction {
  id: string;
  fiscalYearId: string;
  date: string; // YYYY-MM-DD
  label: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  reconciled: boolean; // Pointé / Rapproché
  reconciledDate?: string;
  invoiceRef?: string;
  notes?: string;
}

export interface BankTransfer {
  id: string;
  fiscalYearId: string;
  date: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  label: string;
  notes?: string;
}

export interface FiscalYear {
  id: string;
  label: string; // ex: "Saison 2025-2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean;
  treasurerNotes?: string;
  // Scénarios de simulation
  scenarios?: {
    optimistic: { revenuePercent: number; expensePercent: number; notes?: string };
    neutral: { revenuePercent: number; expensePercent: number; notes?: string };
    pessimistic: { revenuePercent: number; expensePercent: number; notes?: string };
  };
}

export interface LockInfo {
  isLocked: boolean;
  lockedBy?: string;
  machineName?: string;
  lockedAt?: string;
}

export interface AppSettings {
  clubName: string;
  seasonType: 'sportive' | 'calendar'; // sportive = Sept-Août, calendar = Janv-Déc
  alertThresholdExpensePct: number; // ex: 100%
  alertLowCashThreshold: number; // ex: 2500€
}

export interface AppData {
  version: string;
  lastUpdated: string;
  lockInfo: LockInfo;
  settings: AppSettings;
  fiscalYears: FiscalYear[];
  bankAccounts: BankAccount[];
  categories: Category[];
  budgetItems: BudgetItem[];
  transactions: Transaction[];
  transfers: BankTransfer[];
}

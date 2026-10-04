import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, TabKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardTab } from './components/tabs/DashboardTab';
import { TransactionsTab } from './components/tabs/TransactionsTab';
import { MonthlyTab } from './components/tabs/MonthlyTab';
import { BankAccountsTab } from './components/tabs/BankAccountsTab';
import { GeneralAssemblyTab } from './components/tabs/GeneralAssemblyTab';
import { IncomeStatementTab } from './components/tabs/IncomeStatementTab';
import { ForecastTab } from './components/tabs/ForecastTab';
import { NewFiscalYearModal } from './components/modals/NewFiscalYearModal';
import { BankStatementImportModal } from './components/modals/BankStatementImportModal';
import { EditGlobalBudgetModal } from './components/modals/EditGlobalBudgetModal';
import { StorageService, StorageStatus } from './services/storage';
import { ExportService } from './services/exportService';
import { AppData, FiscalYear, Transaction, BankAccount, BudgetItem, BankTransfer } from './types/budget';
import { INITIAL_APP_DATA } from './data/defaultData';

export const App: React.FC = () => {
  const [data, setData] = useState<AppData>(INITIAL_APP_DATA);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [currentYearId, setCurrentYearId] = useState<string>('fy-2026-2027');
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    isElectron: false,
    isLockedByOther: false,
    readOnlyMode: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isNewYearModalOpen, setIsNewYearModalOpen] = useState(false);
  const [isBankStatementModalOpen, setIsBankStatementModalOpen] = useState(false);
  const [isEditGlobalBudgetModalOpen, setIsEditGlobalBudgetModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const { data: loadedData, status } = await StorageService.loadInitialData();
        setData(loadedData);
        setStorageStatus(status);
        const currentFy = loadedData.fiscalYears.find((y) => y.isCurrent) || loadedData.fiscalYears[0];
        if (currentFy) {
          setCurrentYearId(currentFy.id);
        }
      } catch (err) {
        console.error('Erreur chargement données:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Current active fiscal year object
  const currentFiscalYear =
    data.fiscalYears.find((y) => y.id === currentYearId) ||
    data.fiscalYears[0] ||
    INITIAL_APP_DATA.fiscalYears[0];

  // Calcul du solde disponible global pour le Header
  const totalCashAvailable = data.bankAccounts.reduce((acc, b) => {
    const accTx = data.transactions.filter(
      (t) => t.accountId === b.id && t.fiscalYearId === currentYearId && t.status === 'realise'
    );
    const rec = accTx.filter((t) => t.type === 'recette').reduce((s, t) => s + t.amount, 0);
    const dep = accTx.filter((t) => t.type === 'depense').reduce((s, t) => s + t.amount, 0);
    const trIn = data.transfers
      .filter((tr) => tr.toAccountId === b.id && tr.fiscalYearId === currentYearId)
      .reduce((s, tr) => s + tr.amount, 0);
    const trOut = data.transfers
      .filter((tr) => tr.fromAccountId === b.id && tr.fiscalYearId === currentYearId)
      .reduce((s, tr) => s + tr.amount, 0);

    return acc + b.initialBalance + rec - dep + trIn - trOut;
  }, 0);

  // Sauvegarder les données
  const handleSaveData = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await StorageService.saveData(data);
      if (res.success) {
        setSaveSuccess(true);
        setStorageStatus((prev) => ({ ...prev, lastSavedAt: res.timestamp }));
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        alert('Erreur lors de la sauvegarde : ' + (res.error || 'Erreur inconnue'));
      }
    } catch (e) {
      alert('Erreur : ' + e);
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  // Export PDF
  const handleExportPdf = () => {
    ExportService.exportToPdf(data, currentFiscalYear);
  };

  // Export Excel
  const handleExportExcel = () => {
    ExportService.exportToExcel(data, currentFiscalYear);
  };

  // Export JSON (Backup direct)
  const handleExportJson = () => {
    StorageService.exportToJsonFile(data);
  };

  // Import JSON
  const handleImportJson = async (file: File) => {
    try {
      const imported = await StorageService.importFromJsonFile(file);
      setData(imported);
      await StorageService.saveData(imported);
      alert('Base de données restaurée avec succès !');
    } catch (err: any) {
      alert('Erreur lors de l’importation : ' + err.message);
    }
  };

  // Open Data Folder in Windows Explorer
  const handleOpenDataFolder = async () => {
    await StorageService.openDataFolder();
  };

  // Force unlock if Drive file was left locked
  const handleForceUnlock = async () => {
    if (window.confirm('Voulez-vous forcer le déverrouillage de la base de données sur Google Drive / PC ?')) {
      const success = await StorageService.forceUnlock();
      if (success) {
        setStorageStatus((prev) => ({ ...prev, isLockedByOther: false, readOnlyMode: false }));
        alert('Verrou levé avec succès ! Mode écriture réactivé.');
      }
    }
  };

  // Transactions update handler with auto-save
  const handleUpdateTransactions = (transactions: Transaction[]) => {
    const updatedData = { ...data, transactions };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Bank accounts update handler
  const handleUpdateBankAccounts = (bankAccounts: BankAccount[]) => {
    const updatedData = { ...data, bankAccounts };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Transfers update handler
  const handleUpdateTransfers = (transfers: BankTransfer[]) => {
    const updatedData = { ...data, transfers };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Budget items update handler
  const handleUpdateBudgetItems = (budgetItems: BudgetItem[]) => {
    const updatedData = { ...data, budgetItems };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Import transactions from bank statement with optional account balance update
  const handleImportTransactionsFromStatement = (
    newTransactions: Transaction[],
    updatedAccount?: { accountId: string; newStatementBalance: number; statementDate: string }
  ) => {
    let updatedAccounts = data.bankAccounts;
    if (updatedAccount) {
      updatedAccounts = data.bankAccounts.map((acc) => {
        if (acc.id === updatedAccount.accountId) {
          return {
            ...acc,
            currentStatementBalance: updatedAccount.newStatementBalance,
            lastStatementDate: updatedAccount.statementDate,
          };
        }
        return acc;
      });
    }

    const updatedData: AppData = {
      ...data,
      bankAccounts: updatedAccounts,
      transactions: [...data.transactions, ...newTransactions],
    };

    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Save full global budget
  const handleSaveGlobalBudget = (newBudgetItems: BudgetItem[]) => {
    handleUpdateBudgetItems(newBudgetItems);
    setIsEditGlobalBudgetModalOpen(false);
  };

  // Scenarios update handler
  const handleUpdateScenarios = (scenarios: any) => {
    const updatedYears = data.fiscalYears.map((fy) =>
      fy.id === currentYearId ? { ...fy, scenarios } : fy
    );
    const updatedData = { ...data, fiscalYears: updatedYears };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Treasurer notes update handler
  const handleUpdateFiscalYearNotes = (notes: string) => {
    const updatedYears = data.fiscalYears.map((fy) =>
      fy.id === currentYearId ? { ...fy, treasurerNotes: notes } : fy
    );
    const updatedData = { ...data, fiscalYears: updatedYears };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // New Fiscal Year handler
  const handleCreateNewFiscalYear = (newYear: FiscalYear, copyFromId?: string) => {
    let newBudgetItems = [...data.budgetItems];

    if (copyFromId) {
      const toCopy = data.budgetItems.filter((b) => b.fiscalYearId === copyFromId);
      const cloned = toCopy.map((b) => ({
        ...b,
        id: `b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fiscalYearId: newYear.id,
      }));
      newBudgetItems = [...newBudgetItems, ...cloned];
    }

    const updatedData: AppData = {
      ...data,
      fiscalYears: [newYear, ...data.fiscalYears],
      budgetItems: newBudgetItems,
    };

    setData(updatedData);
    setCurrentYearId(newYear.id);
    StorageService.saveData(updatedData);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0d0e12] flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-[#C8102E] border-t-transparent animate-spin mx-auto" />
          <h2 className="text-lg font-bold">Chargement de Bouchemaine Basket Budget...</h2>
          <p className="text-xs text-slate-400">Initialisation de la base locale autonome</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0e1015] text-slate-100 font-sans relative">
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        storageStatus={storageStatus}
        onOpenDataFolder={handleOpenDataFolder}
        onForceUnlock={handleForceUnlock}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Area */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden min-w-0">
        {/* Header Bar */}
        <Header
          fiscalYears={data.fiscalYears}
          currentFiscalYear={currentFiscalYear}
          onSelectFiscalYear={(id) => setCurrentYearId(id)}
          onAddNewFiscalYear={() => setIsNewYearModalOpen(true)}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          onSaveData={handleSaveData}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          totalCashAvailable={totalCashAvailable}
          lastSavedAt={storageStatus.lastSavedAt}
          isSaving={isSaving}
          saveSuccess={saveSuccess}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Dynamic Central Area */}
        <main className="flex-1 overflow-hidden bg-[#0d0f14]">
          {activeTab === 'dashboard' && (
            <DashboardTab
              data={data}
              currentYear={currentFiscalYear}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsTab
              data={data}
              currentYear={currentFiscalYear}
              onUpdateTransactions={handleUpdateTransactions}
              onSaveData={handleSaveData}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyTab data={data} currentYear={currentFiscalYear} />
          )}

          {activeTab === 'accounts' && (
            <BankAccountsTab
              data={data}
              currentYear={currentFiscalYear}
              onUpdateBankAccounts={handleUpdateBankAccounts}
              onUpdateTransfers={handleUpdateTransfers}
              onUpdateTransactions={handleUpdateTransactions}
              onOpenBankStatementModal={() => setIsBankStatementModalOpen(true)}
            />
          )}

          {activeTab === 'general_assembly' && (
            <GeneralAssemblyTab
              data={data}
              currentYear={currentFiscalYear}
              onUpdateFiscalYearNotes={handleUpdateFiscalYearNotes}
              onExportPdf={handleExportPdf}
            />
          )}

          {activeTab === 'income_statement' && (
            <IncomeStatementTab
              data={data}
              currentYear={currentFiscalYear}
              onUpdateBudgetItems={handleUpdateBudgetItems}
              onOpenEditGlobalBudgetModal={() => setIsEditGlobalBudgetModalOpen(true)}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastTab
              data={data}
              currentYear={currentFiscalYear}
              onUpdateBudgetItems={handleUpdateBudgetItems}
              onUpdateScenarios={handleUpdateScenarios}
              onOpenEditGlobalBudgetModal={() => setIsEditGlobalBudgetModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Modal Nouvel Exercice */}
      <NewFiscalYearModal
        isOpen={isNewYearModalOpen}
        onClose={() => setIsNewYearModalOpen(false)}
        existingYears={data.fiscalYears}
        onCreate={handleCreateNewFiscalYear}
      />

      {/* Modal Import Relevé Bancaire (.xlsx / .xls / .csv) */}
      <BankStatementImportModal
        isOpen={isBankStatementModalOpen}
        onClose={() => setIsBankStatementModalOpen(false)}
        data={data}
        onImportTransactions={handleImportTransactionsFromStatement}
      />

      {/* Modal Modification du Budget Global Prévisionnel */}
      <EditGlobalBudgetModal
        isOpen={isEditGlobalBudgetModalOpen}
        onClose={() => setIsEditGlobalBudgetModalOpen(false)}
        data={data}
        currentYear={currentFiscalYear}
        onSaveBudgetItems={handleSaveGlobalBudget}
      />
    </div>
  );
};

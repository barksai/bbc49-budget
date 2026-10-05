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
import { auditService } from './services/auditService';
import { AppData, FiscalYear, Transaction, BankAccount, BudgetItem, BankTransfer } from './types/budget';
import { INITIAL_APP_DATA } from './data/defaultData';
import { LoginPage } from './components/auth/LoginPage';
import { AdminUsersTab } from './components/tabs/AdminUsersTab';
import { authService } from './services/auth';
import { User } from './types/auth';

export const App: React.FC = () => {
  const [data, setData] = useState<AppData>(INITIAL_APP_DATA);
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isAuthChecking, setIsAuthChecking] = useState(true);
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

  // Check auth session
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const user = await authService.verifySession();
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.warn('Session verification failed:', err);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  const isReadOnly = currentUser?.role === 'viewer' || storageStatus.readOnlyMode;

  useEffect(() => {
    if (activeTab === 'admin_users' && currentUser?.role !== 'admin') {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser]);

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
    if (currentUser?.role === 'viewer') {
      alert('Action restreinte : votre compte est en mode Lecture Seule.');
      return;
    }
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
  }, [data, currentUser]);

  // Export PDF
  const handleExportPdf = () => {
    ExportService.exportToPdf(data, currentFiscalYear);
    auditService.log('Export PDF (Rapport d’AG & Bilan)', 'export', currentFiscalYear.label);
  };

  // Export Excel
  const handleExportExcel = () => {
    ExportService.exportToExcel(data, currentFiscalYear);
    auditService.log('Export Excel (Classeur complet)', 'export', currentFiscalYear.label);
  };

  // Export JSON (Backup direct)
  const handleExportJson = () => {
    StorageService.exportToJsonFile(data);
    auditService.log('Export JSON (Sauvegarde intégrale)', 'export');
  };

  // Import JSON
  const handleImportJson = async (file: File) => {
    if (currentUser?.role === 'viewer') {
      alert('Action restreinte : votre compte est en mode Lecture Seule.');
      return;
    }
    try {
      const imported = await StorageService.importFromJsonFile(file);
      setData(imported);
      await StorageService.saveData(imported);
      auditService.log('Restauration JSON de la base de données', 'sauvegarde');
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
    if (currentUser?.role === 'viewer') return;
    const updatedData = { ...data, transactions };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Bank accounts update handler
  const handleUpdateBankAccounts = (bankAccounts: BankAccount[]) => {
    if (currentUser?.role === 'viewer') return;
    const updatedData = { ...data, bankAccounts };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Transfers update handler
  const handleUpdateTransfers = (transfers: BankTransfer[]) => {
    if (currentUser?.role === 'viewer') return;
    const updatedData = { ...data, transfers };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Budget items update handler
  const handleUpdateBudgetItems = (budgetItems: BudgetItem[]) => {
    if (currentUser?.role === 'viewer') return;
    const updatedData = { ...data, budgetItems };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Import transactions from bank statement with optional account balance update
  const handleImportTransactionsFromStatement = (
    newTransactions: Transaction[],
    updatedAccount?: { accountId: string; newStatementBalance: number; statementDate: string }
  ) => {
    if (currentUser?.role === 'viewer') return;
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
    if (currentUser?.role === 'viewer') return;
    handleUpdateBudgetItems(newBudgetItems);
    setIsEditGlobalBudgetModalOpen(false);
  };

  // Scenarios update handler
  const handleUpdateScenarios = (scenarios: any) => {
    if (currentUser?.role === 'viewer') return;
    const updatedYears = data.fiscalYears.map((fy) =>
      fy.id === currentYearId ? { ...fy, scenarios } : fy
    );
    const updatedData = { ...data, fiscalYears: updatedYears };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // Treasurer notes update handler
  const handleUpdateFiscalYearNotes = (notes: string) => {
    if (currentUser?.role === 'viewer') return;
    const updatedYears = data.fiscalYears.map((fy) =>
      fy.id === currentYearId ? { ...fy, treasurerNotes: notes } : fy
    );
    const updatedData = { ...data, fiscalYears: updatedYears };
    setData(updatedData);
    StorageService.saveData(updatedData);
  };

  // New Fiscal Year handler
  const handleCreateNewFiscalYear = (newYear: FiscalYear, copyFromId?: string) => {
    if (currentUser?.role === 'viewer') return;
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

  if (isAuthChecking || isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0d0e12] flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-[#C8102E] border-t-transparent animate-spin mx-auto" />
          <h2 className="text-lg font-bold">Chargement de Bouchemaine Basket Budget...</h2>
          <p className="text-xs text-slate-400">Initialisation de la session sécurisée</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
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
        storageStatus={{
          ...storageStatus,
          readOnlyMode: isReadOnly,
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
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
          isReadOnly={isReadOnly}
        />

        {/* Dynamic Central Area */}
        <main className="flex-1 overflow-hidden bg-[#0d0f14] flex flex-col">
          {currentUser.role === 'viewer' && (
            <div className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">
                  Mode Consultation
                </span>
                <span>Votre compte a les droits « Lecture seule ». L'enregistrement et les modifications sont désactivés.</span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
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
                isReadOnly={isReadOnly}
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
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'general_assembly' && (
              <GeneralAssemblyTab
                data={data}
                currentYear={currentFiscalYear}
                onUpdateFiscalYearNotes={handleUpdateFiscalYearNotes}
                onExportPdf={handleExportPdf}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'income_statement' && (
              <IncomeStatementTab
                data={data}
                currentYear={currentFiscalYear}
                onUpdateBudgetItems={handleUpdateBudgetItems}
                onOpenEditGlobalBudgetModal={() => setIsEditGlobalBudgetModalOpen(true)}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'forecast' && (
              <ForecastTab
                data={data}
                currentYear={currentFiscalYear}
                onUpdateBudgetItems={handleUpdateBudgetItems}
                onUpdateScenarios={handleUpdateScenarios}
                onOpenEditGlobalBudgetModal={() => setIsEditGlobalBudgetModalOpen(true)}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'admin_users' && currentUser.role === 'admin' && (
              <AdminUsersTab currentUser={currentUser} />
            )}
          </div>
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

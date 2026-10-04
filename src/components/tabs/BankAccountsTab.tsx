import React, { useState } from 'react';
import {
  Landmark,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Wallet,
  Clock,
  ArrowDown,
  ArrowUp,
  X,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { AppData, BankAccount, BankTransfer, FiscalYear, Transaction } from '../../types/budget';

interface BankAccountsTabProps {
  data: AppData;
  currentYear: FiscalYear;
  onUpdateBankAccounts: (accounts: BankAccount[]) => void;
  onUpdateTransfers: (transfers: BankTransfer[]) => void;
  onUpdateTransactions: (transactions: Transaction[]) => void;
  onOpenBankStatementModal: () => void;
}

export const BankAccountsTab: React.FC<BankAccountsTabProps> = ({
  data,
  currentYear,
  onUpdateBankAccounts,
  onUpdateTransfers,
  onUpdateTransactions,
  onOpenBankStatementModal,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(data.bankAccounts[0]?.id || '');
  
  // Transfer modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState<{
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    label: string;
    notes: string;
  }>({
    fromAccountId: data.bankAccounts[0]?.id || '',
    toAccountId: data.bankAccounts[1]?.id || '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    label: 'Virement interne',
    notes: '',
  });

  // Manage accounts modal
  const [isManageAccountsModalOpen, setIsManageAccountsModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<Partial<BankAccount>>({
    name: '',
    bankName: '',
    accountNumber: '',
    initialBalance: 0,
    color: '#C8102E',
  });

  const currentYearTx = data.transactions.filter((t) => t.fiscalYearId === currentYear.id);

  // Calculs détaillés par compte
  const accountsCalculation = data.bankAccounts.map((acc) => {
    const accTx = currentYearTx.filter((t) => t.accountId === acc.id);
    const realRecettes = accTx.filter((t) => t.type === 'recette' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    const realDepenses = accTx.filter((t) => t.type === 'depense' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);

    const transfersIn = data.transfers
      .filter((tr) => tr.toAccountId === acc.id && tr.fiscalYearId === currentYear.id)
      .reduce((s, tr) => s + tr.amount, 0);
    const transfersOut = data.transfers
      .filter((tr) => tr.fromAccountId === acc.id && tr.fiscalYearId === currentYear.id)
      .reduce((s, tr) => s + tr.amount, 0);

    const calculatedBalance = acc.initialBalance + realRecettes - realDepenses + transfersIn - transfersOut;
    const statementBalance = acc.currentStatementBalance ?? calculatedBalance;
    const ecart = calculatedBalance - statementBalance;

    // Écritures non pointées pour ce compte
    const unpointedTx = accTx.filter((t) => !t.reconciled && t.status === 'realise');
    const unpointedRec = unpointedTx.filter((t) => t.type === 'recette').reduce((s, t) => s + t.amount, 0);
    const unpointedDep = unpointedTx.filter((t) => t.type === 'depense').reduce((s, t) => s + t.amount, 0);

    return {
      ...acc,
      realRecettes,
      realDepenses,
      transfersIn,
      transfersOut,
      calculatedBalance,
      statementBalance,
      ecart,
      unpointedTx,
      unpointedImpact: unpointedRec - unpointedDep,
    };
  });

  const activeAccount = accountsCalculation.find((a) => a.id === selectedAccountId) || accountsCalculation[0];

  // Update Initial Balance (valeur de départ du compte bancaire)
  const handleUpdateInitialBalance = (accId: string, newInitial: number) => {
    const updated = data.bankAccounts.map((a) =>
      a.id === accId ? { ...a, initialBalance: newInitial } : a
    );
    onUpdateBankAccounts(updated);
  };

  // Update Statement Balance in inline input
  const handleUpdateStatementBalance = (accId: string, newBalance: number) => {
    const updated = data.bankAccounts.map((a) =>
      a.id === accId ? { ...a, currentStatementBalance: newBalance, lastStatementDate: new Date().toISOString().slice(0, 10) } : a
    );
    onUpdateBankAccounts(updated);
  };

  // Toggle Reconciled for a transaction
  const handleToggleReconcile = (txId: string) => {
    const updated = data.transactions.map((t) => {
      if (t.id === txId) {
        const next = !t.reconciled;
        return {
          ...t,
          reconciled: next,
          reconciledDate: next ? new Date().toISOString().slice(0, 10) : undefined,
        };
      }
      return t;
    });
    onUpdateTransactions(updated);
  };

  // Point all pending for this account
  const handlePointAllPending = () => {
    if (!activeAccount) return;
    const today = new Date().toISOString().slice(0, 10);
    const updated = data.transactions.map((t) => {
      if (t.accountId === activeAccount.id && !t.reconciled && t.status === 'realise') {
        return { ...t, reconciled: true, reconciledDate: today };
      }
      return t;
    });
    onUpdateTransactions(updated);
  };

  // Submit Internal Transfer
  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      alert('Veuillez sélectionner deux comptes distincts pour le transfert.');
      return;
    }
    if (transferForm.amount <= 0) {
      alert('Le montant du transfert doit être supérieur à zéro.');
      return;
    }

    const newTransfer: BankTransfer = {
      id: `tr-${Date.now()}`,
      fiscalYearId: currentYear.id,
      date: transferForm.date,
      fromAccountId: transferForm.fromAccountId,
      toAccountId: transferForm.toAccountId,
      amount: Number(transferForm.amount),
      label: transferForm.label,
      notes: transferForm.notes,
    };

    onUpdateTransfers([newTransfer, ...data.transfers]);
    setIsTransferModalOpen(false);
  };

  // Delete Transfer
  const handleDeleteTransfer = (trId: string) => {
    if (window.confirm('Supprimer ce virement interne ?')) {
      onUpdateTransfers(data.transfers.filter((tr) => tr.id !== trId));
    }
  };

  // Open transfer modal with safety
  const handleOpenTransferModal = () => {
    if (data.bankAccounts.length < 2) {
      alert('Vous devez avoir au moins 2 comptes bancaires ou caisses pour effectuer un virement interne.');
      return;
    }
    setIsTransferModalOpen(true);
  };

  // Create new Account
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name || !accountForm.bankName) {
      alert('Nom du compte et établissement bancaire requis.');
      return;
    }

    const newAcc: BankAccount = {
      id: `acc-${Date.now()}`,
      name: accountForm.name.trim(),
      bankName: accountForm.bankName.trim(),
      accountNumber: accountForm.accountNumber?.trim() || '',
      initialBalance: Number(accountForm.initialBalance) || 0,
      currentStatementBalance: Number(accountForm.initialBalance) || 0,
      color: accountForm.color || '#C8102E',
    };

    onUpdateBankAccounts([...data.bankAccounts, newAcc]);
    setSelectedAccountId(newAcc.id);
    setAccountForm({
      name: '',
      bankName: '',
      accountNumber: '',
      initialBalance: 0,
      color: '#C8102E',
    });
  };

  // Delete Account
  const handleDeleteAccount = (accId: string) => {
    if (data.bankAccounts.length <= 1) {
      alert("Impossible de supprimer ce compte : l'association doit avoir au moins un compte bancaire actif.");
      return;
    }

    const accToDelete = data.bankAccounts.find((a) => a.id === accId);
    if (!accToDelete) return;

    const fallbackAccount = data.bankAccounts.find((a) => a.id !== accId);
    if (!fallbackAccount) return;

    const txCount = data.transactions.filter((t) => t.accountId === accId).length;
    const trCount = data.transfers.filter(
      (tr) => tr.fromAccountId === accId || tr.toAccountId === accId
    ).length;

    let confirmMsg = `Êtes-vous sûr de vouloir supprimer le compte "${accToDelete.name}" (${accToDelete.bankName}) ?`;
    if (txCount > 0) {
      confirmMsg += `\n\nCe compte est associé à ${txCount} opération(s). En confirmant, ces opérations seront réassignées sur le compte "${fallbackAccount.name}".`;
    }
    if (trCount > 0) {
      confirmMsg += `\n${trCount} virement(s) interne(s) lié(s) à ce compte seront supprimés.`;
    }

    if (!window.confirm(confirmMsg)) return;

    // Reassign transactions
    if (txCount > 0) {
      const updatedTx = data.transactions.map((t) =>
        t.accountId === accId ? { ...t, accountId: fallbackAccount.id } : t
      );
      onUpdateTransactions(updatedTx);
    }

    // Clean transfers
    if (trCount > 0) {
      const updatedTransfers = data.transfers.filter(
        (tr) => tr.fromAccountId !== accId && tr.toAccountId !== accId
      );
      onUpdateTransfers(updatedTransfers);
    }

    // Remove account
    const updatedAccounts = data.bankAccounts.filter((a) => a.id !== accId);
    onUpdateBankAccounts(updatedAccounts);

    if (selectedAccountId === accId) {
      setSelectedAccountId(fallbackAccount.id);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#181a22] to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            État des Comptes & Rapprochement Bancaire
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi des liquidités, gestion des virements internes et contrôle des écarts de trésorerie
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenBankStatementModal}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
            title="Importer un relevé bancaire Excel (Crédit Agricole...) et catégoriser les opérations sur le compte de résultat"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importer Relevé (.xlsx)</span>
          </button>
          <button
            onClick={handleOpenTransferModal}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            <span>Virement</span>
          </button>
          <button
            onClick={() => setIsManageAccountsModalOpen(true)}
            className="px-3 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-all active:scale-95"
            title="Gérer les comptes : ajouter ou supprimer des comptes bancaires et caisses"
          >
            <Landmark className="w-4 h-4" />
            <span>Gestion Comptes</span>
          </button>
        </div>
      </div>

      {/* CARDS RÉCAPITULATIF DES COMPTES BANCAIRES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accountsCalculation.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-900 border-[#C8102E] shadow-lg shadow-red-950/20 ring-1 ring-[#C8102E]'
                  : 'bg-[#171922] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400 truncate">
                  {acc.bankName}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: acc.color || '#C8102E' }}
                  />
                  {data.bankAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAccount(acc.id);
                      }}
                      className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                      title={`Supprimer le compte "${acc.name}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-extrabold text-sm text-white mt-1 truncate">
                {acc.name}
              </h3>

              <div className="mt-3">
                <div className="text-xl font-black text-white">
                  {acc.calculatedBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
                  <span>Solde de départ :</span>
                  <span className="font-semibold text-amber-300 font-mono">
                    {acc.initialBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex justify-between items-center">
                  <span>Relevé réel :</span>
                  <span className="font-semibold text-slate-300 font-mono">
                    {acc.statementBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>

              {/* Statut Écart */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Écart :</span>
                {Math.abs(acc.ecart) < 0.01 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Conforme (0 €)
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {acc.ecart > 0 ? '+' : ''}{acc.ecart.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODULE DE RAPPROCHEMENT DU COMPTE SÉLECTIONNÉ */}
      {activeAccount && (
        <div className="bg-[#171922] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#C8102E]" />
                <h3 className="text-base font-extrabold text-white">
                  Rapprochement Bancaire : {activeAccount.name}
                </h3>
                {data.bankAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(activeAccount.id)}
                    className="text-slate-500 hover:text-red-400 hover:bg-red-950/40 p-1 rounded-lg transition-colors"
                    title={`Supprimer le compte "${activeAccount.name}"`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeAccount.bankName} • N° {activeAccount.accountNumber || 'Non renseigné'}
              </p>
            </div>

            {/* Saisie directe : Valeur de départ (solde initial) + Solde relevé réel */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Valeur de départ */}
              <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  Solde de départ (€) :
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={activeAccount.initialBalance}
                  onChange={(e) => handleUpdateInitialBalance(activeAccount.id, parseFloat(e.target.value) || 0)}
                  className="w-28 sm:w-32 px-2.5 py-1 bg-slate-800 border border-amber-600/60 rounded-lg text-sm font-bold text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  title="Modifier la valeur de départ (solde initial) de ce compte"
                />
              </div>

              {/* Solde Relevé Bancaire Réel */}
              <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300 font-medium">
                  Relevé réel (€) :
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={activeAccount.statementBalance}
                  onChange={(e) => handleUpdateStatementBalance(activeAccount.id, parseFloat(e.target.value) || 0)}
                  className="w-28 sm:w-32 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm font-bold text-white font-mono focus:outline-none focus:border-[#C8102E]"
                  title="Solde constaté sur le dernier relevé bancaire"
                />
              </div>
            </div>
          </div>

          {/* Synthèse Rapprochement */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Solde Comptable Calculé</span>
              <div className="text-2xl font-black text-white mt-1">
                {activeAccount.calculatedBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Solde initial ({activeAccount.initialBalance.toLocaleString('fr-FR')} €) + Recettes ({activeAccount.realRecettes.toLocaleString('fr-FR')} €) − Dépenses ({activeAccount.realDepenses.toLocaleString('fr-FR')} €) ± Virements
              </p>
            </div>

            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Solde Relevé Bancaire</span>
              <div className="text-2xl font-black text-white mt-1">
                {activeAccount.statementBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Dernière vérification : {activeAccount.lastStatementDate || 'Aujourd’hui'}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${
              Math.abs(activeAccount.ecart) < 0.01
                ? 'bg-emerald-950/20 border-emerald-800/40'
                : 'bg-amber-950/20 border-amber-800/40'
            }`}>
              <span className="text-xs text-slate-400 font-semibold uppercase">Différence de Rapprochement</span>
              <div className={`text-2xl font-black mt-1 ${
                Math.abs(activeAccount.ecart) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {activeAccount.ecart > 0 ? '+' : ''}
                {activeAccount.ecart.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                {Math.abs(activeAccount.ecart) < 0.01
                  ? 'Comptabilité et banque parfaitement équilibrées.'
                  : `${activeAccount.unpointedTx.length} écriture(s) non pointée(s) en circulation.`}
              </p>
            </div>
          </div>

          {/* Écritures en attente de pointage pour ce compte */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Écritures Non Pointées sur ce compte ({activeAccount.unpointedTx.length})
              </h4>
              {activeAccount.unpointedTx.length > 0 && (
                <button
                  onClick={handlePointAllPending}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 rounded-lg border border-slate-700 transition-colors"
                >
                  Tout marquer comme pointé
                </button>
              )}
            </div>

            {activeAccount.unpointedTx.length === 0 ? (
              <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Toutes les écritures de ce compte sont rapprochées avec le relevé de banque.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[520px]">
                  <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Pointer</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Libellé</th>
                      <th className="py-2.5 px-3">Pôle</th>
                      <th className="py-2.5 px-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeAccount.unpointedTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleToggleReconcile(tx.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white transition-colors"
                            title="Pointer cette écriture"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-mono">{tx.date}</td>
                        <td className="py-2 px-3 font-semibold text-white">{tx.label}</td>
                        <td className="py-2 px-3 text-slate-400">
                          {data.categories.find((c) => c.id === tx.categoryId)?.name || tx.categoryId}
                        </td>
                        <td className={`py-2 px-3 text-right font-black ${
                          tx.type === 'recette' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {tx.type === 'recette' ? '+' : '-'}{tx.amount.toLocaleString('fr-FR')} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORIQUE DES VIREMENTS INTERNES */}
      <div className="bg-[#171922] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            Historique des Transferts Inter-Comptes
          </h3>
          <span className="text-xs text-slate-400">{data.transfers.length} virement(s)</span>
        </div>

        {data.transfers.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3">Aucun virement interne enregistré.</p>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[550px]">
              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Compte Source</th>
                  <th className="py-2.5 px-3">Compte Destinataire</th>
                  <th className="py-2.5 px-3">Libellé</th>
                  <th className="py-2.5 px-3 text-right">Montant</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.transfers.map((tr) => {
                  const from = data.bankAccounts.find((a) => a.id === tr.fromAccountId);
                  const to = data.bankAccounts.find((a) => a.id === tr.toAccountId);
                  return (
                    <tr key={tr.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-300 font-mono">{tr.date}</td>
                      <td className="py-2 px-3 text-red-400 font-semibold">{from?.name || tr.fromAccountId}</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">{to?.name || tr.toAccountId}</td>
                      <td className="py-2 px-3 text-white">{tr.label}</td>
                      <td className="py-2 px-3 text-right font-black text-white">
                        {tr.amount.toLocaleString('fr-FR')} €
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteTransfer(tr.id)}
                          className="p-1 hover:bg-red-950 text-red-400 rounded"
                          title="Supprimer ce virement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL VIREMENT INTERNE */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                Nouveau Virement Interne
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Compte Émetteur (Débit) *
                </label>
                <select
                  value={transferForm.fromAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  {data.bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Compte Bénéficiaire (Crédit) *
                </label>
                <select
                  value={transferForm.toAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  {data.bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Montant (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={transferForm.amount || ''}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferForm.date}
                    onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motif / Libellé
                </label>
                <input
                  type="text"
                  required
                  value={transferForm.label}
                  onChange={(e) => setTransferForm({ ...transferForm, label: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md"
                >
                  Valider le transfert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTION DES COMPTES (AJOUT & SUPPRESSION) */}
      {isManageAccountsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-red-950/70 border border-red-700/60 flex items-center justify-center text-red-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Gestion des Comptes Bancaires & Caisses
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ajoutez un nouveau compte ou supprimez un compte existant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageAccountsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Liste des comptes existants */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                  <span>Comptes Actuels ({data.bankAccounts.length})</span>
                  {data.bankAccounts.length <= 1 && (
                    <span className="text-[11px] text-amber-400 font-normal">
                      (Au moins un compte requis pour l'association)
                    </span>
                  )}
                </h4>
                <div className="space-y-2.5">
                  {data.bankAccounts.map((acc) => {
                    const txCount = data.transactions.filter(
                      (t) => t.accountId === acc.id && t.fiscalYearId === currentYear.id
                    ).length;
                    const canDelete = data.bankAccounts.length > 1;

                    return (
                      <div
                        key={acc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: acc.color || '#C8102E' }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">
                              {acc.name}
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {acc.bankName} {acc.accountNumber ? `• N° ${acc.accountNumber}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
                            <span className="text-[11px] font-semibold text-amber-300">
                              Solde départ :
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={acc.initialBalance}
                              onChange={(e) => handleUpdateInitialBalance(acc.id, parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-bold text-amber-300 text-right focus:outline-none focus:border-amber-400"
                              title="Modifier la valeur de départ de ce compte"
                            />
                            <span className="text-xs text-slate-400">€</span>
                          </div>

                          <div className="text-right hidden sm:block">
                            <div className="text-[11px] text-slate-400">
                              {txCount} op.
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!canDelete}
                            onClick={() => handleDeleteAccount(acc.id)}
                            className={`p-2 rounded-lg border transition-all ${
                              canDelete
                                ? 'bg-red-950/30 border-red-800/60 text-red-400 hover:bg-red-900/50 hover:text-red-300 hover:border-red-700 cursor-pointer'
                                : 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                            title={
                              canDelete
                                ? `Supprimer le compte "${acc.name}"`
                                : "Impossible de supprimer le dernier compte"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formulaire d'ajout d'un nouveau compte */}
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#C8102E]" />
                  <span>Ajouter un Nouveau Compte ou Caisse</span>
                </h4>

                <form onSubmit={handleCreateAccount} className="space-y-3 bg-[#13151b] p-4 rounded-xl border border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nom du compte *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Livret Club, Caisse Tournoi..."
                        value={accountForm.name || ''}
                        onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Établissement bancaire *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Crédit Agricole, Caisse Physique..."
                        value={accountForm.bankName || ''}
                        onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Numéro de compte (optionnel)
                      </label>
                      <input
                        type="text"
                        placeholder="ex: 22685898000"
                        value={accountForm.accountNumber || ''}
                        onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Solde initial (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={accountForm.initialBalance || ''}
                        onChange={(e) => setAccountForm({ ...accountForm, initialBalance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Couleur d'identification
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accountForm.color || '#C8102E'}
                          onChange={(e) => setAccountForm({ ...accountForm, color: e.target.value })}
                          className="w-10 h-8 bg-transparent rounded cursor-pointer border border-slate-700"
                        />
                        <span className="text-xs font-mono text-slate-400">{accountForm.color || '#C8102E'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg shadow-md shadow-red-950/40 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter ce Compte</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageAccountsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

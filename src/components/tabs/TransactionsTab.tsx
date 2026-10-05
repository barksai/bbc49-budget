import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Copy,
  Upload,
  Download,
  CheckCircle2,
  Clock,
  Check,
  AlertCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppData, FiscalYear, Transaction, TransactionStatus, TransactionType } from '../../types/budget';
import { auditService } from '../../services/auditService';

interface TransactionsTabProps {
  data: AppData;
  currentYear: FiscalYear;
  onUpdateTransactions: (transactions: Transaction[]) => void;
  onSaveData: () => void;
  isReadOnly?: boolean;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  data,
  currentYear,
  onUpdateTransactions,
  onSaveData,
  isReadOnly = false,
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterReconciled, setFilterReconciled] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().slice(0, 10),
    label: '',
    accountId: data.bankAccounts[0]?.id || '',
    categoryId: data.categories[0]?.id || '',
    type: 'depense',
    status: 'realise',
    amount: 0,
    reconciled: false,
    invoiceRef: '',
    notes: '',
  });

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedRows, setImportedRows] = useState<Partial<Transaction>[]>([]);

  // Filtered transactions for the current fiscal year
  const filteredTransactions = useMemo(() => {
    return data.transactions
      .filter((t) => t.fiscalYearId === currentYear.id)
      .filter((t) => {
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchLabel = t.label.toLowerCase().includes(s);
          const matchRef = t.invoiceRef?.toLowerCase().includes(s);
          const matchNotes = t.notes?.toLowerCase().includes(s);
          if (!matchLabel && !matchRef && !matchNotes) return false;
        }
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false;
        if (filterAccount !== 'all' && t.accountId !== filterAccount) return false;
        if (filterStatus !== 'all' && t.status !== filterStatus) return false;
        if (filterReconciled === 'yes' && !t.reconciled) return false;
        if (filterReconciled === 'no' && t.reconciled) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    data.transactions,
    currentYear.id,
    searchTerm,
    filterType,
    filterCategory,
    filterAccount,
    filterStatus,
    filterReconciled,
  ]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingTransaction(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      label: '',
      accountId: data.bankAccounts[0]?.id || '',
      categoryId: data.categories.find(c => c.type === 'depense')?.id || data.categories[0]?.id || '',
      type: 'depense',
      status: 'realise',
      amount: 0,
      reconciled: false,
      invoiceRef: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setFormData({ ...t });
    setIsModalOpen(true);
  };

  // Duplicate Transaction
  const handleDuplicate = (t: Transaction) => {
    if (isReadOnly) return;
    const newTx: Transaction = {
      ...t,
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: `${t.label} (Copie)`,
      date: new Date().toISOString().slice(0, 10),
      reconciled: false,
      reconciledDate: undefined,
    };
    onUpdateTransactions([newTx, ...data.transactions]);
    auditService.log(`Duplication écriture: ${t.label}`, 'ecriture', `${t.amount} €`);
  };

  // Delete Transaction
  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    const txToDelete = data.transactions.find((t) => t.id === id);
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette écriture ?')) {
      const updated = data.transactions.filter((t) => t.id !== id);
      onUpdateTransactions(updated);
      auditService.log(`Suppression écriture: ${txToDelete?.label || id}`, 'ecriture');
    }
  };

  // Save Modal Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!formData.label || !formData.amount || formData.amount <= 0) {
      alert('Veuillez renseigner un libellé valide et un montant positif.');
      return;
    }

    if (editingTransaction) {
      // Update
      const updated = data.transactions.map((t) =>
        t.id === editingTransaction.id
          ? ({
              ...t,
              ...formData,
              amount: Number(formData.amount),
              fiscalYearId: currentYear.id,
            } as Transaction)
          : t
      );
      onUpdateTransactions(updated);
      auditService.log(`Modification écriture: ${formData.label}`, 'ecriture', `${formData.amount} €`);
    } else {
      // Create
      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fiscalYearId: currentYear.id,
        date: formData.date || new Date().toISOString().slice(0, 10),
        label: formData.label || '',
        accountId: formData.accountId || data.bankAccounts[0]?.id,
        categoryId: formData.categoryId || data.categories[0]?.id,
        type: formData.type || 'depense',
        status: formData.status || 'realise',
        amount: Number(formData.amount),
        reconciled: !!formData.reconciled,
        reconciledDate: formData.reconciled ? (formData.reconciledDate || formData.date) : undefined,
        invoiceRef: formData.invoiceRef || '',
        notes: formData.notes || '',
      };
      onUpdateTransactions([newTx, ...data.transactions]);
      auditService.log(`Nouvelle écriture: ${newTx.label}`, 'ecriture', `${newTx.amount} € (${newTx.type})`);
    }

    setIsModalOpen(false);
  };

  // Toggle Reconciled in Table directly
  const handleToggleReconcile = (t: Transaction) => {
    if (isReadOnly) return;
    const updated = data.transactions.map((item) => {
      if (item.id === t.id) {
        const nextState = !item.reconciled;
        return {
          ...item,
          reconciled: nextState,
          reconciledDate: nextState ? new Date().toISOString().slice(0, 10) : undefined,
        };
      }
      return item;
    });
    onUpdateTransactions(updated);
    auditService.log(`${t.reconciled ? 'Dépointage' : 'Pointage'} écriture: ${t.label}`, 'ecriture');
  };

  // Handle CSV/Excel Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        const parsed: Partial<Transaction>[] = rawJson.map((row, idx) => {
          const date = row['Date'] || row['date'] || new Date().toISOString().slice(0, 10);
          const label = row['Libellé'] || row['Libelle'] || row['label'] || `Écriture importée ${idx + 1}`;
          const amountRaw = row['Montant'] || row['Montant (€)'] || row['amount'] || 0;
          const amount = Math.abs(parseFloat(String(amountRaw).replace(',', '.')) || 0);
          const typeStr = String(row['Type'] || row['type'] || '').toLowerCase();
          const type: TransactionType = typeStr.includes('rec') ? 'recette' : 'depense';

          return {
            date,
            label,
            amount,
            type,
            status: 'realise',
            accountId: data.bankAccounts[0]?.id,
            categoryId: data.categories.find(c => c.type === type)?.id || data.categories[0]?.id,
            reconciled: false,
            invoiceRef: row['Réf. Pièce'] || row['Ref'] || '',
            notes: row['Commentaires'] || '',
          };
        });

        setImportedRows(parsed.filter(r => (r.amount || 0) > 0));
        setIsImportModalOpen(true);
      } catch (err) {
        alert('Erreur lors de la lecture du fichier : ' + err);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const newItems: Transaction[] = importedRows.map((r, idx) => ({
      id: `tx-imp-${Date.now()}-${idx}`,
      fiscalYearId: currentYear.id,
      date: r.date || new Date().toISOString().slice(0, 10),
      label: r.label || 'Sans libellé',
      accountId: r.accountId || data.bankAccounts[0]?.id,
      categoryId: r.categoryId || data.categories[0]?.id,
      type: r.type || 'depense',
      status: r.status || 'realise',
      amount: r.amount || 0,
      reconciled: !!r.reconciled,
      invoiceRef: r.invoiceRef || '',
      notes: r.notes || '',
    }));

    onUpdateTransactions([...newItems, ...data.transactions]);
    auditService.log(`Import de ${newItems.length} écritures (CSV/Excel)`, 'import', currentYear.label);
    setIsImportModalOpen(false);
    setImportedRows([]);
  };

  // Export filtered transactions to CSV
  const handleExportFilteredCsv = () => {
    auditService.log(`Export CSV Écritures filtrées (${filteredTransactions.length} lignes)`, 'export', currentYear.label);
    const ws = XLSX.utils.json_to_sheet(
      filteredTransactions.map(t => {
        const acc = data.bankAccounts.find(a => a.id === t.accountId);
        const cat = data.categories.find(c => c.id === t.categoryId);
        return {
          'Date': t.date,
          'Libellé': t.label,
          'Compte': acc?.name || t.accountId,
          'Pôle': cat?.name || t.categoryId,
          'Type': t.type,
          'Statut': t.status,
          'Montant (€)': t.amount,
          'Pointé': t.reconciled ? 'Oui' : 'Non',
          'Réf': t.invoiceRef || '',
        };
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Écritures_Filtrees');
    XLSX.writeFile(wb, `Ecritures_BBC_${currentYear.label}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#181a22] to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Saisie et Gestion des Écritures
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enregistrement des recettes et dépenses, ventilation par pôle, pointage et rapprochement
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Import Button */}
            <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Importer CSV/Excel</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {/* Export Filtered CSV */}
            <button
              onClick={handleExportFilteredCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Exporter la liste actuellement filtrée"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Exporter Sélection</span>
            </button>

            {/* Create Button */}
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Écriture</span>
            </button>
          </div>
        )}
      </div>

      {/* FILTRES & BARRE DE RECHERCHE */}
      <div className="bg-[#171922] p-4 rounded-xl border border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Recherche */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par libellé, réf..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#C8102E]"
            >
              <option value="all">Tous les types</option>
              <option value="depense">Dépenses uniquement</option>
              <option value="recette">Recettes uniquement</option>
            </select>
          </div>

          {/* Pôle / Catégorie */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#C8102E]"
            >
              <option value="all">Tous les Pôles</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === 'recette' ? '[Rec] ' : '[Dép] '} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Compte */}
          <div>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#C8102E]"
            >
              <option value="all">Tous les Comptes</option>
              {data.bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Statut & Pointage */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-[#C8102E]"
            >
              <option value="all">Tous statuts</option>
              <option value="realise">Réalisé</option>
              <option value="engage">Engagé</option>
              <option value="prevu">Prévu</option>
            </select>
          </div>
        </div>

        {/* Info compteur */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
          <span>{filteredTransactions.length} écriture(s) trouvée(s)</span>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <span className="text-emerald-400 font-bold">
              Total Recettes :{' '}
              {filteredTransactions
                .filter((t) => t.type === 'recette')
                .reduce((s, t) => s + t.amount, 0)
                .toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
              €
            </span>
            <span className="text-red-400 font-bold">
              Total Dépenses :{' '}
              {filteredTransactions
                .filter((t) => t.type === 'depense')
                .reduce((s, t) => s + t.amount, 0)
                .toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
              €
            </span>
          </div>
        </div>
      </div>

      {/* TABLEAU DES ÉCRITURES */}
      <div className="bg-[#171922] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#0f1116] border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-3.5">Pointé</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Libellé</th>
                <th className="py-3 px-3.5">Pôle / Catégorie</th>
                <th className="py-3 px-3.5">Compte</th>
                <th className="py-3 px-3.5">Statut</th>
                <th className="py-3 px-3.5 text-right">Montant</th>
                {!isReadOnly && <th className="py-3 px-3.5 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 7 : 8} className="py-12 text-center text-slate-500">
                    Aucune écriture ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const cat = data.categories.find((c) => c.id === tx.categoryId);
                  const acc = data.bankAccounts.find((a) => a.id === tx.accountId);
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Pointage case à cocher */}
                      <td className="py-3 px-3.5">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => !isReadOnly && handleToggleReconcile(tx)}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                            tx.reconciled
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900'
                              : 'border border-slate-600 text-transparent'
                          } ${isReadOnly ? 'cursor-default opacity-60' : 'hover:border-slate-400 cursor-pointer'}`}
                          title={tx.reconciled ? `Pointé le ${tx.reconciledDate || ''}` : isReadOnly ? 'Non pointé' : 'Cliquer pour pointer'}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-300 font-mono">
                        {tx.date}
                      </td>

                      {/* Libellé & Réf */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-white max-w-xs truncate" title={tx.label}>
                          {tx.label}
                        </div>
                        {tx.invoiceRef && (
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 mt-0.5 inline-block">
                            Réf: {tx.invoiceRef}
                          </span>
                        )}
                        {tx.notes && (
                          <p className="text-[10px] text-slate-500 italic truncate max-w-xs">{tx.notes}</p>
                        )}
                      </td>

                      {/* Catégorie */}
                      <td className="py-3 px-3.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${cat?.color || '#C8102E'}15`,
                            borderColor: `${cat?.color || '#C8102E'}40`,
                            color: cat?.color || '#fff',
                          }}
                        >
                          {cat?.name || tx.categoryId}
                        </span>
                      </td>

                      {/* Compte */}
                      <td className="py-3 px-3.5 text-slate-300">
                        {acc?.name || tx.accountId}
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.status === 'realise'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : tx.status === 'engage'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                              : 'bg-purple-950 text-purple-400 border border-purple-800/50'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      {/* Montant */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <span
                          className={`font-black text-sm ${
                            tx.type === 'recette' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {tx.type === 'recette' ? '+' : '-'}
                          {tx.amount.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          €
                        </span>
                      </td>

                      {/* Actions */}
                      {!isReadOnly && (
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEditModal(tx)}
                              title="Modifier"
                              className="p-1 hover:bg-slate-700 text-slate-300 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(tx)}
                              title="Dupliquer"
                              className="p-1 hover:bg-slate-700 text-slate-300 rounded"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              title="Supprimer"
                              className="p-1 hover:bg-red-950 text-red-400 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION / ÉDITION D'ÉCRITURE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {editingTransaction ? <Edit2 className="w-4 h-4 text-[#C8102E]" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                {editingTransaction ? 'Modifier l’Écriture' : 'Nouvelle Écriture Budgétaire'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              {/* Type Switcher (Recette vs Dépense) */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'depense' })}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    formData.type === 'depense'
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dépense (Sortie)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'recette' })}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    formData.type === 'recette'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Recette (Entrée)
                </button>
              </div>

              {/* Libellé */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Libellé de l'opération *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Facture licences FFBB, Vente buvette..."
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              {/* Montant & Date */}
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
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono font-bold focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
              </div>

              {/* Pôle / Catégorie & Compte Bancaire */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pôle / Catégorie
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  >
                    {data.categories
                      .filter((c) => c.type === formData.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Compte Bancaire impacté
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  >
                    {data.bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Statut & Pièce Réf */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Statut de l'écriture
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TransactionStatus })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  >
                    <option value="realise">Réalisé (Décaissé / Encaissé)</option>
                    <option value="engage">Engagé (Devis / Bon commande)</option>
                    <option value="prevu">Prévu (Estimation)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Réf. Pièce (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="FAC-2025-01, CHQ 123..."
                    value={formData.invoiceRef || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceRef: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
              </div>

              {/* Rapprochement Bancaire */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="modalReconciled"
                  checked={!!formData.reconciled}
                  onChange={(e) => setFormData({ ...formData, reconciled: e.target.checked })}
                  className="rounded border-slate-700 text-[#C8102E] focus:ring-[#C8102E]"
                />
                <label htmlFor="modalReconciled" className="text-xs text-slate-300 font-medium">
                  Écriture pointée / Rapprochée sur le relevé bancaire
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Commentaires / Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="Détails complémentaires..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg shadow-md"
                >
                  {editingTransaction ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRÉVISUALISATION IMPORT CSV/EXCEL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Prévisualisation de l'Importation ({importedRows.length} écritures)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-bold">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Libellé</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {importedRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="p-2 text-slate-300 font-mono">{r.date}</td>
                      <td className="p-2 text-white font-medium">{r.label}</td>
                      <td className="p-2 text-slate-300 capitalize">{r.type}</td>
                      <td className={`p-2 text-right font-bold ${r.type === 'recette' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.amount?.toLocaleString('fr-FR')} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end space-x-2 bg-slate-900/50">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Confirmer l'import ({importedRows.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

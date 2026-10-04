import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowDown,
  ArrowUp,
  Tag,
  Check,
  Building,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppData, BankAccount, Category, Transaction } from '../../types/budget';

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onImportTransactions: (
    newTransactions: Transaction[],
    updatedAccount?: { accountId: string; newStatementBalance: number; statementDate: string }
  ) => void;
}

interface ParsedStatementOp {
  id: string;
  date: string;
  label: string;
  rawDebit: number;
  rawCredit: number;
  type: 'recette' | 'depense';
  amount: number;
  suggestedCategoryId: string;
  selectedCategoryId: string;
  selected: boolean;
  notes?: string;
}

export const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  isOpen,
  onClose,
  data,
  onImportTransactions,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedOps, setParsedOps] = useState<ParsedStatementOp[]>([]);
  const [detectedAccountNum, setDetectedAccountNum] = useState<string>('');
  const [detectedBalance, setDetectedBalance] = useState<number | null>(null);
  const [detectedBalanceDate, setDetectedBalanceDate] = useState<string>('');
  const [targetAccountId, setTargetAccountId] = useState<string>(data.bankAccounts[0]?.id || '');
  const [autoReconcile, setAutoReconcile] = useState<boolean>(true);
  const [updateStatementBalance, setUpdateStatementBalance] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'all' | 'recette' | 'depense'>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset current loaded file to pick another one
  const handleResetFile = () => {
    setFile(null);
    setParsedOps([]);
    setDetectedAccountNum('');
    setDetectedBalance(null);
    setDetectedBalanceDate('');
    setUpdateStatementBalance(true);
    setFilterType('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  // Categories lists
  const categoriesRec = data.categories.filter((c) => c.type === 'recette');
  const categoriesDep = data.categories.filter((c) => c.type === 'depense');

  // Smart Category Matcher based on keywords
  const suggestCategory = (label: string, type: 'recette' | 'depense'): string => {
    const l = label.toLowerCase();

    if (type === 'recette') {
      // Licences / Cotisations
      if (l.includes('helloasso') || l.includes('cotisation') || l.includes('licence') || l.includes('basket fit') || l.includes('adhesion')) {
        const catLic = data.categories.find(c => c.name.toLowerCase().includes('gestion courante') || c.name.toLowerCase().includes('licence'));
        if (catLic) return catLic.id;
      }
      // Vente bar / Cartes
      if (l.includes('remise carte') || l.includes('carte') || l.includes('bar') || l.includes('buvette')) {
        const catVente = data.categories.find(c => c.name.toLowerCase().includes('marchandise') || c.name.toLowerCase().includes('bar'));
        if (catVente) return catVente.id;
      }
      // Mairie / Subvention
      if (l.includes('mairie') || l.includes('subvention') || l.includes('sgc')) {
        const catSub = data.categories.find(c => c.name.toLowerCase().includes('subvention') || c.name.toLowerCase().includes('prestation'));
        if (catSub) return catSub.id;
      }
      // Sponsoring / Partenariats / Mécénat
      if (l.includes('sponsor') || l.includes('mecenat') || l.includes('auto ecole') || l.includes('plombier') || l.includes('toubin')) {
        const catSpon = data.categories.find(c => c.name.toLowerCase().includes('produits') || c.name.toLowerCase().includes('sponsor'));
        if (catSpon) return catSpon.id;
      }
      // Activités / Tournoi / Confluente
      if (l.includes('tournoi') || l.includes('confluence') || l.includes('stage')) {
        const catAct = data.categories.find(c => c.name.toLowerCase().includes('annexe') || c.name.toLowerCase().includes('prestation'));
        if (catAct) return catAct.id;
      }
      return categoriesRec[0]?.id || '';
    } else {
      // Dépense
      // Frais bancaires
      if (l.includes('credit agricole') || l.includes('bancaire') || l.includes('cotisation carte') || l.includes('frais')) {
        const catBanque = data.categories.find(c => c.name.toLowerCase().includes('gestion courante') || c.name.toLowerCase().includes('bancaire'));
        if (catBanque) return catBanque.id;
      }
      // Achats bar / supermarché
      if (l.includes('intermarche') || l.includes('super u') || l.includes('metro') || l.includes('cavavin') || l.includes('minute blonde') || l.includes('bar')) {
        const catBar = data.categories.find(c => c.name.toLowerCase().includes('marchandise'));
        if (catBar) return catBar.id;
      }
      // Salaires et charges
      if (l.includes('salaire') || l.includes('urssaf') || l.includes('malakoff') || l.includes('dgfip') || l.includes('profession sport') || l.includes('humanis') || l.includes('pam') || l.includes('buffet') || l.includes('benmansour')) {
        const catPersonnel = data.categories.find(c => c.name.toLowerCase().includes('personnel') || c.name.toLowerCase().includes('service'));
        if (catPersonnel) return catPersonnel.id;
      }
      // Remboursement licences
      if (l.includes('remboursement licence') || l.includes('remboursement erreur')) {
        const catRemb = data.categories.find(c => c.name.toLowerCase().includes('services exterieurs') || c.name.toLowerCase().includes('gestion courante'));
        if (catRemb) return catRemb.id;
      }
      // Matériel sportif
      if (l.includes('equip sport') || l.includes('intersport') || l.includes('decathlon') || l.includes('ballon') || l.includes('maillot')) {
        const catMat = data.categories.find(c => c.name.toLowerCase().includes('approvisionnement') || c.name.toLowerCase().includes('materiel'));
        if (catMat) return catMat.id;
      }
      // FFBB / Comité
      if (l.includes('ffbb') || l.includes('comite') || l.includes('ligue')) {
        const catFFBB = data.categories.find(c => c.name.toLowerCase().includes('gestion courante') || c.name.toLowerCase().includes('engagement'));
        if (catFFBB) return catFFBB.id;
      }
      return categoriesDep[0]?.id || '';
    }
  };

  // Parse Bank Statement File (XLSX / XLS / CSV)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', raw: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawSheetData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        let accountNumFound = '';
        let balanceFound: number | null = null;
        let balanceDateFound = '';
        let headerRowIdx = -1;

        // Clean string helper
        const cleanHeader = (s: any) =>
          String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .trim();

        // Scan top rows for metadata (Crédit Agricole / Banque headers)
        for (let r = 0; r < Math.min(rawSheetData.length, 25); r++) {
          const row = rawSheetData[r];
          const fullRowText = row.join(' ');

          // Check account number (ex: Compte courant n° 22685898000)
          const accMatch = fullRowText.match(/(?:compte|n°|no)\s*[:]?\s*([0-9A-Z\s]{6,25})/i);
          if (accMatch && !accountNumFound) {
            accountNumFound = accMatch[1].trim();
          }

          // Check statement balance (ex: Solde au 04/10/2026 : 23 925,33 €)
          if (fullRowText.toLowerCase().includes('solde au')) {
            const dateMatch = fullRowText.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
            if (dateMatch) {
              const dParts = dateMatch[1].split(/[\/\-\.]/);
              balanceDateFound = `${dParts[2]}-${dParts[1]}-${dParts[0]}`;
            }

            // Extract amount
            const balStr = row.find((c: any) => String(c).includes('€') || String(c).match(/\d+[\s,.]\d+/));
            if (balStr) {
              const cleanBal = String(balStr)
                .replace(/[^0-9,-]/g, '')
                .replace(',', '.');
              const parsedBal = parseFloat(cleanBal);
              if (!isNaN(parsedBal)) {
                balanceFound = parsedBal;
              }
            }
          }

          // Check table header row
          const normRow = row.map(cleanHeader);
          const hasDate = normRow.some(c => c.includes('date'));
          const hasDebit = normRow.some(c => c.includes('deb') || c.includes('dab'));
          const hasCredit = normRow.some(c => c.includes('cred') || c.includes('crad'));

          if (hasDate && (hasDebit || hasCredit)) {
            headerRowIdx = r;
            break;
          }
        }

        if (headerRowIdx === -1) {
          alert("Impossible de localiser les colonnes Date, Débit et Crédit dans ce fichier. Vérifiez le format du relevé bancaire.");
          return;
        }

        setDetectedAccountNum(accountNumFound);
        setDetectedBalance(balanceFound);
        setDetectedBalanceDate(balanceDateFound || new Date().toISOString().slice(0, 10));

        const headerRow = rawSheetData[headerRowIdx].map(cleanHeader);
        const dateCol = headerRow.findIndex(h => h.includes('date'));
        const libCol = headerRow.findIndex(h => h.includes('libell') || h.includes('detail') || h.includes('operation'));
        const debitCol = headerRow.findIndex(h => h.includes('deb') || h.includes('dab'));
        const creditCol = headerRow.findIndex(h => h.includes('cred') || h.includes('crad'));

        const parsedOperations: ParsedStatementOp[] = [];

        for (let r = headerRowIdx + 1; r < rawSheetData.length; r++) {
          const row = rawSheetData[r];
          const dateRaw = row[dateCol];
          const libRaw = row[libCol !== -1 ? libCol : 1];
          const debitRaw = debitCol !== -1 ? row[debitCol] : '';
          const creditRaw = creditCol !== -1 ? row[creditCol] : '';

          if (!dateRaw && !libRaw) continue;

          // Format Date (DD/MM/YYYY or YYYY-MM-DD or Excel serial)
          let opDate = new Date().toISOString().slice(0, 10);
          if (typeof dateRaw === 'number') {
            const d = new Date((dateRaw - 25569) * 86400 * 1000);
            opDate = d.toISOString().slice(0, 10);
          } else if (typeof dateRaw === 'string') {
            const s = dateRaw.trim();
            const parts = s.split(/[\/\-\.]/);
            if (parts.length === 3) {
              if (parts[0].length === 2 && parts[2].length === 4) {
                // DD/MM/YYYY
                opDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
              } else if (parts[0].length === 4) {
                opDate = s.slice(0, 10);
              }
            }
          }

          const parseAmount = (val: any) => {
            if (typeof val === 'number') return Math.abs(val);
            const str = String(val || '')
              .replace(/\s+/g, '')
              .replace(',', '.');
            return Math.abs(parseFloat(str)) || 0;
          };

          const debit = parseAmount(debitRaw);
          const credit = parseAmount(creditRaw);

          if (debit === 0 && credit === 0) continue;

          const type: 'recette' | 'depense' = debit > 0 ? 'depense' : 'recette';
          const amount = debit > 0 ? debit : credit;
          const cleanLib = String(libRaw || '').replace(/\r?\n|\r/g, ' - ').trim();

          const suggestedCat = suggestCategory(cleanLib, type);

          parsedOperations.push({
            id: `op-stmt-${Date.now()}-${r}`,
            date: opDate,
            label: cleanLib || (type === 'recette' ? 'Virement reçu' : 'Paiement'),
            rawDebit: debit,
            rawCredit: credit,
            type: type,
            amount: amount,
            suggestedCategoryId: suggestedCat,
            selectedCategoryId: suggestedCat,
            selected: true,
          });
        }

        if (parsedOperations.length === 0) {
          alert("Aucune opération bancaire détectée dans ce fichier. Vérifiez que le document contient bien les colonnes Date, Libellé, Débit et Crédit.");
          handleResetFile();
          return;
        }

        setParsedOps(parsedOperations);
      } catch (err: any) {
        alert("Erreur lors de la lecture du fichier : " + err.message);
        handleResetFile();
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  // Select / Deselect all
  const handleToggleSelectAll = (val: boolean) => {
    setParsedOps(prev => prev.map(o => ({ ...o, selected: val })));
  };

  // Change category of a line
  const handleCategoryChange = (opId: string, catId: string) => {
    setParsedOps(prev =>
      prev.map(o => (o.id === opId ? { ...o, selectedCategoryId: catId } : o))
    );
  };

  // Toggle selection of a single line
  const handleToggleOp = (opId: string) => {
    setParsedOps(prev =>
      prev.map(o => (o.id === opId ? { ...o, selected: !o.selected } : o))
    );
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const selectedOps = parsedOps.filter(o => o.selected);
    if (selectedOps.length === 0) {
      alert("Veuillez sélectionner au moins une opération à intégrer.");
      return;
    }

    const currentFy = data.fiscalYears.find(y => y.isCurrent) || data.fiscalYears[0];

    const newTransactions: Transaction[] = selectedOps.map((op, idx) => ({
      id: `tx-releve-${Date.now()}-${idx}`,
      fiscalYearId: currentFy.id,
      date: op.date,
      label: op.label,
      accountId: targetAccountId,
      categoryId: op.selectedCategoryId,
      type: op.type,
      status: 'realise',
      amount: op.amount,
      reconciled: autoReconcile,
      reconciledDate: autoReconcile ? op.date : undefined,
      invoiceRef: 'Relevé bancaire ' + op.date,
      notes: `Import automatique relevé (${op.type === 'recette' ? 'Crédit' : 'Débit'} de ${op.amount} €)`,
    }));

    const updateAccountInfo =
      updateStatementBalance && detectedBalance !== null
        ? {
            accountId: targetAccountId,
            newStatementBalance: detectedBalance,
            statementDate: detectedBalanceDate || new Date().toISOString().slice(0, 10),
          }
        : undefined;

    onImportTransactions(newTransactions, updateAccountInfo);
    onClose();
  };

  const selectedCount = parsedOps.filter(o => o.selected).length;
  const totalDebitSelected = parsedOps
    .filter(o => o.selected && o.type === 'depense')
    .reduce((s, o) => s + o.amount, 0);
  const totalCreditSelected = parsedOps
    .filter(o => o.selected && o.type === 'recette')
    .reduce((s, o) => s + o.amount, 0);

  const displayedOps = parsedOps.filter(o => {
    if (filterType === 'all') return true;
    return o.type === filterType;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-700 flex items-center justify-center text-red-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Importation & Catégorisation de Relevé Bancaire
              </h3>
              <p className="text-xs text-slate-400">
                Format Crédit Agricole / Banque (Date, Libellé, Débit, Crédit) avec ventilation sur le Compte de Résultat
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Step 1: Upload File */}
          {parsedOps.length === 0 ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-[#C8102E] rounded-2xl p-10 text-center transition-colors bg-slate-900/40">
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-white mb-1">
                Sélectionnez ou glissez votre fichier de relevé bancaire (.xlsx, .xls ou .csv)
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Compatible avec les exports du Crédit Agricole contenant les colonnes : <em>Date, Libellé, Débit euros, Crédit euros</em>.
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-red-950/40 transition-all">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Parcourir les fichiers</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <>
              {/* File Info & Reset Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-white text-[11px] font-semibold truncate max-w-[260px]">
                      {file?.name || 'Relevé bancaire'}
                    </span>
                    <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded font-mono font-medium">
                      {parsedOps.length} opérations chargées
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="px-3.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 border border-amber-800/60 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    title="Effacer ce relevé et en charger un autre si ce fichier n'est pas le bon"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Réinitialiser / Changer de fichier</span>
                  </button>
                </div>
              </div>
              {/* Metadata Detected Alert */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Building className="w-4 h-4 text-red-500" />
                    <span>Compte cible :</span>
                    <select
                      value={targetAccountId}
                      onChange={(e) => setTargetAccountId(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1 font-semibold"
                    >
                      {data.bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.bankName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {detectedAccountNum && (
                    <span className="text-slate-400">
                      Réf détectée : <span className="font-mono text-white">{detectedAccountNum}</span>
                    </span>
                  )}
                </div>

                {detectedBalance !== null && (
                  <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg text-emerald-300">
                    <input
                      type="checkbox"
                      id="chkUpdateBal"
                      checked={updateStatementBalance}
                      onChange={(e) => setUpdateStatementBalance(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500"
                    />
                    <label htmlFor="chkUpdateBal" className="cursor-pointer font-medium">
                      Mettre à jour le solde relevé avec <strong>{detectedBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong> ({detectedBalanceDate})
                    </label>
                  </div>
                )}
              </div>

              {/* Controls & Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#13151b] p-3 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Filtrer :</span>
                  <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        filterType === 'all' ? 'bg-[#C8102E] text-white' : 'text-slate-400'
                      }`}
                    >
                      Tous ({parsedOps.length})
                    </button>
                    <button
                      onClick={() => setFilterType('depense')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        filterType === 'depense' ? 'bg-red-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Débits / Dépenses
                    </button>
                    <button
                      onClick={() => setFilterType('recette')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        filterType === 'recette' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Crédits / Recettes
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 ml-3">
                    <button
                      onClick={() => handleToggleSelectAll(true)}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      Tout cocher
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      onClick={() => handleToggleSelectAll(false)}
                      className="text-[11px] text-slate-400 hover:underline"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="chkAutoRec"
                      checked={autoReconcile}
                      onChange={(e) => setAutoReconcile(e.target.checked)}
                      className="rounded border-slate-700 text-[#C8102E]"
                    />
                    <label htmlFor="chkAutoRec" className="text-slate-300 font-semibold cursor-pointer">
                      Pointer d'office (Rapprochées)
                    </label>
                  </div>

                  <div className="flex items-center gap-3 font-bold">
                    <span className="text-red-400">
                      Débits : -{totalDebitSelected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="text-emerald-400">
                      Crédits : +{totalCreditSelected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Table of operations with Category Selector */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Imp.</th>
                      <th className="py-2.5 px-3 w-24">Date</th>
                      <th className="py-2.5 px-3">Libellé Relevé Bancaire</th>
                      <th className="py-2.5 px-3 w-28 text-right">Montant</th>
                      <th className="py-2.5 px-3 w-72">Poste / Catégorie du Compte de Résultat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {displayedOps.map((op) => {
                      const categoriesList = op.type === 'recette' ? categoriesRec : categoriesDep;
                      return (
                        <tr
                          key={op.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            !op.selected ? 'opacity-40 bg-slate-950/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={op.selected}
                              onChange={() => handleToggleOp(op.id)}
                              className="rounded border-slate-700 text-[#C8102E] cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                            {op.date}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white truncate max-w-md" title={op.label}>
                              {op.label}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black font-mono whitespace-nowrap">
                            <span className={op.type === 'recette' ? 'text-emerald-400' : 'text-red-400'}>
                              {op.type === 'recette' ? '+' : '-'}
                              {op.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <select
                                value={op.selectedCategoryId}
                                onChange={(e) => handleCategoryChange(op.id, e.target.value)}
                                className={`w-full py-1 px-2 rounded border text-xs focus:outline-none ${
                                  op.type === 'recette'
                                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                                    : 'bg-red-950/40 border-red-800 text-red-200'
                                }`}
                              >
                                {categoriesList.map((cat) => (
                                  <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/70 flex items-center justify-between shrink-0">
          <div>
            {parsedOps.length > 0 && (
              <span className="text-xs text-slate-400">
                <strong>{selectedCount}</strong> opération(s) sur {parsedOps.length} prêtes à être intégrées.
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {parsedOps.length > 0 && (
              <button
                type="button"
                onClick={handleResetFile}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-700/50 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Effacer ce relevé et en charger un autre"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Changer de fichier</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
            >
              Annuler
            </button>
            {parsedOps.length > 0 && (
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-xl shadow-lg shadow-red-950/50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmer l'import ({selectedCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  X,
  TrendingUp,
  TrendingDown,
  Scale,
  Save,
  Search
} from 'lucide-react';
import { AppData, BudgetItem, FiscalYear } from '../../types/budget';
import { getCategoryCode } from '../../utils/categoryCodes';

interface EditGlobalBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  currentYear: FiscalYear;
  onSaveBudgetItems: (items: BudgetItem[]) => void;
}

export const EditGlobalBudgetModal: React.FC<EditGlobalBudgetModalProps> = ({
  isOpen,
  onClose,
  data,
  currentYear,
  onSaveBudgetItems,
}) => {
  if (!isOpen) return null;

  // Local copy of budget items (sum of sub-items for each category)
  const [itemsMap, setItemsMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    data.categories.forEach((cat) => {
      const existingItems = data.budgetItems.filter(
        (b) => b.fiscalYearId === currentYear.id && b.categoryId === cat.id
      );
      map[cat.id] = existingItems.reduce((sum, b) => sum + (b.plannedAmount || 0), 0);
    });
    return map;
  });

  // Local copy of comments (max 100 characters per category)
  const [notesMap, setNotesMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    data.categories.forEach((cat) => {
      const existingItems = data.budgetItems.filter(
        (b) => b.fiscalYearId === currentYear.id && b.categoryId === cat.id
      );
      const foundNote = existingItems.find(
        (b) => b.notes && !b.notes.startsWith('Budget annuel')
      )?.notes || existingItems[0]?.notes || cat.notes || '';
      map[cat.id] = foundNote.slice(0, 100);
    });
    return map;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recette' | 'depense'>('all');

  const categoriesRec = data.categories.filter((c) => c.type === 'recette');
  const categoriesDep = data.categories.filter((c) => c.type === 'depense');

  // Live Totals
  const totalRec = categoriesRec.reduce((s, c) => s + (itemsMap[c.id] || 0), 0);
  const totalDep = categoriesDep.reduce((s, c) => s + (itemsMap[c.id] || 0), 0);
  const soldeNet = totalRec - totalDep;

  const handleAmountChange = (catId: string, val: number) => {
    setItemsMap((prev) => ({ ...prev, [catId]: Math.max(0, val) }));
  };

  const handleNoteChange = (catId: string, val: string) => {
    setNotesMap((prev) => ({ ...prev, [catId]: val.slice(0, 100) }));
  };

  const handleSave = () => {
    const updatedBudgetItems: BudgetItem[] = [...data.budgetItems];

    data.categories.forEach((cat) => {
      const newAmount = itemsMap[cat.id] ?? 0;
      const newNote = (notesMap[cat.id] ?? '').trim().slice(0, 100);

      const existingForCat = updatedBudgetItems.filter(
        (b) => b.fiscalYearId === currentYear.id && b.categoryId === cat.id
      );

      if (existingForCat.length === 0) {
        updatedBudgetItems.push({
          id: `b-${Date.now()}-${cat.id}`,
          fiscalYearId: currentYear.id,
          categoryId: cat.id,
          plannedAmount: newAmount,
          notes: newNote,
        });
      } else if (existingForCat.length === 1) {
        const idx = updatedBudgetItems.findIndex((b) => b.id === existingForCat[0].id);
        if (idx !== -1) {
          updatedBudgetItems[idx] = {
            ...updatedBudgetItems[idx],
            plannedAmount: newAmount,
            notes: newNote,
          };
        }
      } else {
        // Multiple sub-items: distribute proportionally and attach comment
        const currentSum = existingForCat.reduce((s, b) => s + b.plannedAmount, 0);
        const ratio = currentSum > 0 ? newAmount / currentSum : 1 / existingForCat.length;

        existingForCat.forEach((b, i) => {
          const idx = updatedBudgetItems.findIndex((item) => item.id === b.id);
          if (idx !== -1) {
            const adj = i === existingForCat.length - 1
              ? newAmount - existingForCat.slice(0, -1).reduce((s, prev) => s + Math.round(prev.plannedAmount * ratio), 0)
              : Math.round(b.plannedAmount * ratio);

            updatedBudgetItems[idx] = {
              ...updatedBudgetItems[idx],
              plannedAmount: adj,
              notes: newNote,
            };
          }
        });
      }
    });

    onSaveBudgetItems(updatedBudgetItems);
    onClose();
  };

  const filteredCategories = data.categories.filter((c) => {
    if (activeTab !== 'all' && c.type !== activeTab) return false;
    const catCode = getCategoryCode(c);
    const search = searchTerm.trim().toLowerCase();
    if (search && !c.name.toLowerCase().includes(search) && !catCode.includes(search)) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181a22] border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-[#181a22] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-700 flex items-center justify-center text-purple-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Édition du Budget Prévisionnel Global — {currentYear.label}
              </h3>
              <p className="text-xs text-slate-400">
                Ajustez les montants votés par poste. Le budget global et les indicateurs sont recalculés en direct.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Summary Cards */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase">
              <span>Budget Recettes Global</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-white mt-1">
              {totalRec.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Somme des recettes prévues</p>
          </div>

          <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl">
            <div className="flex items-center justify-between text-xs text-red-400 font-bold uppercase">
              <span>Budget Dépenses Global</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-white mt-1">
              {totalDep.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Somme des charges prévues</p>
          </div>

          <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold uppercase">
              <span>Solde Net Budgété</span>
              <Scale className="w-4 h-4 text-purple-400" />
            </div>
            <div className={`text-xl font-black mt-1 ${soldeNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {soldeNet >= 0 ? '+' : ''}{soldeNet.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {soldeNet === 0 ? 'Budget parfaitement équilibré' : soldeNet > 0 ? 'Excédent prévu' : 'Déficit prévu'}
            </p>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="p-3 bg-[#13151b] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                activeTab === 'all' ? 'bg-[#C8102E] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous les postes ({data.categories.length})
            </button>
            <button
              onClick={() => setActiveTab('recette')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                activeTab === 'recette' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Recettes ({categoriesRec.length})
            </button>
            <button
              onClick={() => setActiveTab('depense')}
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                activeTab === 'depense' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dépenses ({categoriesDep.length})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher un poste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Categories Table */}
        <div className="p-4 overflow-y-auto flex-1">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-900 text-slate-400 font-bold sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 w-20">Type</th>
                <th className="py-2.5 px-3 w-20 text-center">N°</th>
                <th className="py-2.5 px-3 min-w-[200px]">Poste / Catégorie du Compte de Résultat</th>
                <th className="py-2.5 px-3 min-w-[240px]">Commentaire (max 100 car.)</th>
                <th className="py-2.5 px-3 text-right w-44">Budget Annuel Voté (€)</th>
                <th className="py-2.5 px-3 text-right w-32 text-slate-500">Moyenne Mensuelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredCategories.map((cat) => {
                const currentVal = itemsMap[cat.id] || 0;
                const currentNote = notesMap[cat.id] || '';
                return (
                  <tr key={cat.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          cat.type === 'recette'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : 'bg-red-950 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {cat.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {getCategoryCode(cat)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-white">
                      {cat.name}
                    </td>
                    <td className="py-2 px-3">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          maxLength={100}
                          value={currentNote}
                          onChange={(e) => handleNoteChange(cat.id, e.target.value)}
                          placeholder="Notes, détails (max 100 car.)..."
                          className="w-full pl-2.5 pr-12 py-1 bg-slate-900 border border-slate-700 focus:border-[#C8102E] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        {currentNote.length > 0 && (
                          <span className="text-[10px] text-slate-500 absolute right-2 font-mono pointer-events-none">
                            {currentNote.length}/100
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={currentVal || ''}
                        onChange={(e) => handleAmountChange(cat.id, parseFloat(e.target.value) || 0)}
                        className="w-32 px-2.5 py-1 bg-slate-900 border border-slate-700 focus:border-[#C8102E] rounded-lg text-xs text-right font-mono font-bold text-white focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      {(currentVal / 12).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/m
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            Total Recettes : <strong className="text-emerald-400">{totalRec.toLocaleString('fr-FR')} €</strong> | Total Dépenses : <strong className="text-red-400">{totalDep.toLocaleString('fr-FR')} €</strong>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-xl shadow-lg shadow-red-950/50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer le Budget Global</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

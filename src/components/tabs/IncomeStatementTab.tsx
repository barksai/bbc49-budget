import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppData, FiscalYear, BudgetItem } from '../../types/budget';
import { getCategoryCode } from '../../utils/categoryCodes';

interface IncomeStatementTabProps {
  data: AppData;
  currentYear: FiscalYear;
  onUpdateBudgetItems: (items: BudgetItem[]) => void;
  onOpenEditGlobalBudgetModal: () => void;
  isReadOnly?: boolean;
}

export const IncomeStatementTab: React.FC<IncomeStatementTabProps> = ({
  data,
  currentYear,
  onUpdateBudgetItems,
  onOpenEditGlobalBudgetModal,
  isReadOnly = false,
}) => {
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // Recherche de l'année précédente (N-1)
  const prevYear = data.fiscalYears.find((fy) => fy.id !== currentYear.id);
  const prevYearTx = prevYear
    ? data.transactions.filter((t) => t.fiscalYearId === prevYear.id && t.status === 'realise')
    : [];

  const currentYearTx = data.transactions.filter(
    (t) => t.fiscalYearId === currentYear.id && t.status === 'realise'
  );

  const categoriesRec = data.categories.filter((c) => c.type === 'recette');
  const categoriesDep = data.categories.filter((c) => c.type === 'depense');

  // Sauvegarde rapide d'une modification du budget prévisionnel voté
  const handleSaveBudgetItem = (catId: string) => {
    const existingItems = data.budgetItems.filter(
      (b) => b.fiscalYearId === currentYear.id && b.categoryId === catId
    );
    let updated: BudgetItem[];
    if (existingItems.length <= 1) {
      if (existingItems.length === 1) {
        updated = data.budgetItems.map((b) =>
          b.id === existingItems[0].id ? { ...b, plannedAmount: editValue } : b
        );
      } else {
        updated = [
          ...data.budgetItems,
          {
            id: `b-${Date.now()}`,
            fiscalYearId: currentYear.id,
            categoryId: catId,
            plannedAmount: editValue,
          },
        ];
      }
    } else {
      const currentSum = existingItems.reduce((s, b) => s + b.plannedAmount, 0);
      const ratio = currentSum > 0 ? editValue / currentSum : 1 / existingItems.length;
      updated = data.budgetItems.map((b) => {
        if (b.fiscalYearId === currentYear.id && b.categoryId === catId) {
          return { ...b, plannedAmount: Math.round(b.plannedAmount * ratio) };
        }
        return b;
      });
    }
    onUpdateBudgetItems(updated);
    setEditingBudgetId(null);
  };

  // Calculs Produits
  let totalPrevRec = 0;
  let totalPlannedRec = 0;
  let totalRealRec = 0;

  const produitsRows = categoriesRec.map((cat) => {
    const prevAmount = prevYearTx
      .filter((t) => t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0);

    const bItems = data.budgetItems.filter(
      (b) => b.fiscalYearId === currentYear.id && b.categoryId === cat.id
    );
    const planned = bItems.reduce((s, b) => s + (b.plannedAmount || 0), 0);
    const comment = bItems.find((b) => b.notes && !b.notes.startsWith('Budget annuel'))?.notes || bItems[0]?.notes || cat.notes || '';

    const real = currentYearTx
      .filter((t) => t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0);

    totalPrevRec += prevAmount;
    totalPlannedRec += planned;
    totalRealRec += real;

    const ecartEur = real - planned;
    const ecartPct = planned > 0 ? ((real - planned) / planned) * 100 : 0;
    const executionRate = planned > 0 ? (real / planned) * 100 : 0;

    return {
      cat,
      comment,
      prevAmount,
      planned,
      real,
      ecartEur,
      ecartPct,
      executionRate,
    };
  });

  // Calculs Charges
  let totalPrevDep = 0;
  let totalPlannedDep = 0;
  let totalRealDep = 0;

  const chargesRows = categoriesDep.map((cat) => {
    const prevAmount = prevYearTx
      .filter((t) => t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0);

    const bItems = data.budgetItems.filter(
      (b) => b.fiscalYearId === currentYear.id && b.categoryId === cat.id
    );
    const planned = bItems.reduce((s, b) => s + (b.plannedAmount || 0), 0);
    const comment = bItems.find((b) => b.notes && !b.notes.startsWith('Budget annuel'))?.notes || bItems[0]?.notes || cat.notes || '';

    const real = currentYearTx
      .filter((t) => t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0);

    totalPrevDep += prevAmount;
    totalPlannedDep += planned;
    totalRealDep += real;

    const ecartEur = planned - real; // pour les dépenses, positif = économie
    const ecartPct = planned > 0 ? ((planned - real) / planned) * 100 : 0;
    const executionRate = planned > 0 ? (real / planned) * 100 : 0;

    return {
      cat,
      comment,
      prevAmount,
      planned,
      real,
      ecartEur,
      ecartPct,
      executionRate,
    };
  });

  // Résultat Net
  const resultPrev = totalPrevRec - totalPrevDep;
  const resultPlanned = totalPlannedRec - totalPlannedDep;
  const resultReal = totalRealRec - totalRealDep;
  const resultDiff = resultReal - resultPlanned;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#181a22] to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Compte de Résultat Associatif
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Présentation normalisée conforme au Plan Comptable Associatif (N-1, Budget Validé, Réalisé N, Écarts en € et %)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700">
            {currentYear.label}
          </span>
          {!isReadOnly && (
            <button
              onClick={onOpenEditGlobalBudgetModal}
              className="px-3.5 py-1.5 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
              title="Modifier les montants prévus du budget global"
            >
              <Scale className="w-4 h-4" />
              <span>Modifier le Budget Global</span>
            </button>
          )}
        </div>
      </div>

      {/* SYNTHÈSE RÉSULTAT NET */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-[#171922] border border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase">Résultat Validé (Budget)</span>
          <div className="text-2xl font-black text-white mt-1">
            {resultPlanned >= 0 ? '+' : ''}{resultPlanned.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Produits ({totalPlannedRec.toLocaleString('fr-FR')} €) − Charges ({totalPlannedDep.toLocaleString('fr-FR')} €)
          </p>
        </div>

        <div className="p-4 bg-[#171922] border border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase">Résultat Réalisé N (Actuel)</span>
          <div className={`text-2xl font-black mt-1 ${resultReal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {resultReal >= 0 ? '+' : ''}{resultReal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {resultReal >= 0 ? 'Excédent d’exploitation actuel' : 'Déficit d’exploitation actuel'}
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${resultDiff >= 0 ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-red-950/20 border-red-800/50'}`}>
          <span className="text-xs text-slate-400 font-bold uppercase">Écart sur Résultat</span>
          <div className={`text-2xl font-black mt-1 ${resultDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {resultDiff >= 0 ? '+' : ''}{resultDiff.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </div>
          <p className="text-[11px] text-slate-300 mt-1">
            {resultDiff >= 0 ? 'Amélioration par rapport au budget' : 'Dégradation par rapport au budget'}
          </p>
        </div>
      </div>

      {/* TABLEAU NORMALISÉ COMPTE DE RÉSULTAT */}
      <div className="bg-[#171922] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-[#0f1116] border-b border-slate-800 text-slate-300">
              <tr>
                <th className="py-3 px-3 text-center font-bold w-16">N°</th>
                <th className="py-3 px-4 text-left font-bold min-w-[200px]">Poste Comptable</th>
                <th className="py-3 px-4 text-left font-semibold text-slate-400 min-w-[220px]">Commentaire</th>
                <th className="py-3 px-3 font-semibold text-slate-400 min-w-[100px]">Réalisé N-1</th>
                <th className="py-3 px-3 font-bold text-white min-w-[120px]">Budget Validé N</th>
                <th className="py-3 px-3 font-bold text-emerald-400 min-w-[120px]">Réalisé N</th>
                <th className="py-3 px-3 font-semibold min-w-[100px]">Écart (€)</th>
                <th className="py-3 px-3 font-semibold min-w-[80px]">Écart (%)</th>
                <th className="py-3 px-3 font-bold min-w-[90px] text-center">Taux Exécution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* === SECTION PRODUITS D'EXPLOITATION === */}
              <tr className="bg-emerald-950/30 text-emerald-300 font-bold">
                <td colSpan={9} className="py-2.5 px-4 text-left uppercase tracking-wider text-xs bg-[#11241c]">
                  I. PRODUITS D'EXPLOITATION (RECETTES)
                </td>
              </tr>
              {produitsRows.map(({ cat, comment, prevAmount, planned, real, ecartEur, ecartPct, executionRate }) => {
                const isEditing = editingBudgetId === cat.id;
                return (
                  <tr key={cat.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {getCategoryCode(cat)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-left font-medium text-slate-200">
                      {cat.name}
                    </td>
                    <td className="py-2.5 px-4 text-left text-slate-300">
                      {comment ? (
                        <span className="text-xs text-slate-300 italic" title={comment}>
                          {comment}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {prevAmount > 0 ? `${prevAmount.toLocaleString('fr-FR')} €` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {isReadOnly ? (
                        <span className="text-slate-300">
                          {planned.toLocaleString('fr-FR')} €
                        </span>
                      ) : isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                            className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-600 rounded text-right font-mono text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveBudgetItem(cat.id)}
                            className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px]"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingBudgetId(cat.id);
                            setEditValue(planned);
                          }}
                          className="cursor-pointer hover:underline text-slate-300"
                          title="Cliquer pour ajuster le budget validé"
                        >
                          {planned.toLocaleString('fr-FR')} €
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-black text-emerald-400 font-mono">
                      {real.toLocaleString('fr-FR')} €
                    </td>
                    <td className={`py-2.5 px-3 font-bold font-mono ${ecartEur >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {ecartEur >= 0 ? '+' : ''}{ecartEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className={`py-2.5 px-3 font-mono ${ecartEur >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {planned > 0 ? `${ecartPct >= 0 ? '+' : ''}${ecartPct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                        {executionRate.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL PRODUITS */}
              <tr className="bg-emerald-950/40 text-emerald-300 font-black border-t-2 border-emerald-800">
                <td colSpan={3} className="py-3 px-4 text-left uppercase">TOTAL PRODUITS (I)</td>
                <td className="py-3 px-3 font-mono">{totalPrevRec.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono">{totalPlannedRec.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono text-emerald-300">{totalRealRec.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono">
                  {totalRealRec - totalPlannedRec >= 0 ? '+' : ''}{(totalRealRec - totalPlannedRec).toLocaleString('fr-FR')} €
                </td>
                <td className="py-3 px-3 font-mono">
                  {totalPlannedRec > 0 ? `${(((totalRealRec - totalPlannedRec) / totalPlannedRec) * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 text-emerald-200">
                    {totalPlannedRec > 0 ? ((totalRealRec / totalPlannedRec) * 100).toFixed(1) : 0}%
                  </span>
                </td>
              </tr>

              {/* === SECTION CHARGES D'EXPLOITATION === */}
              <tr className="bg-red-950/30 text-red-300 font-bold">
                <td colSpan={9} className="py-2.5 px-4 text-left uppercase tracking-wider text-xs bg-[#241216]">
                  II. CHARGES D'EXPLOITATION (DÉPENSES)
                </td>
              </tr>
              {chargesRows.map(({ cat, comment, prevAmount, planned, real, ecartEur, ecartPct, executionRate }) => {
                const isEditing = editingBudgetId === cat.id;
                return (
                  <tr key={cat.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {getCategoryCode(cat)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-left font-medium text-slate-200">
                      {cat.name}
                    </td>
                    <td className="py-2.5 px-4 text-left text-slate-300">
                      {comment ? (
                        <span className="text-xs text-slate-300 italic" title={comment}>
                          {comment}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {prevAmount > 0 ? `${prevAmount.toLocaleString('fr-FR')} €` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {isReadOnly ? (
                        <span className="text-slate-300">
                          {planned.toLocaleString('fr-FR')} €
                        </span>
                      ) : isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                            className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-600 rounded text-right font-mono text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveBudgetItem(cat.id)}
                            className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px]"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingBudgetId(cat.id);
                            setEditValue(planned);
                          }}
                          className="cursor-pointer hover:underline text-slate-300"
                          title="Cliquer pour ajuster le budget validé"
                        >
                          {planned.toLocaleString('fr-FR')} €
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-black text-red-400 font-mono">
                      {real.toLocaleString('fr-FR')} €
                    </td>
                    <td className={`py-2.5 px-3 font-bold font-mono ${ecartEur >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ecartEur >= 0 ? '+' : ''}{ecartEur.toLocaleString('fr-FR')} €
                    </td>
                    <td className={`py-2.5 px-3 font-mono ${ecartEur >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {planned > 0 ? `${ecartPct >= 0 ? '+' : ''}${ecartPct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${executionRate > 100 ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-slate-800 text-slate-300'}`}>
                        {executionRate.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL CHARGES */}
              <tr className="bg-red-950/40 text-red-300 font-black border-t-2 border-red-800">
                <td colSpan={3} className="py-3 px-4 text-left uppercase">TOTAL CHARGES (II)</td>
                <td className="py-3 px-3 font-mono">{totalPrevDep.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono">{totalPlannedDep.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono text-red-300">{totalRealDep.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono">
                  {totalPlannedDep - totalRealDep >= 0 ? '+' : ''}{(totalPlannedDep - totalRealDep).toLocaleString('fr-FR')} €
                </td>
                <td className="py-3 px-3 font-mono">
                  {totalPlannedDep > 0 ? `${(((totalPlannedDep - totalRealDep) / totalPlannedDep) * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${totalRealDep > totalPlannedDep ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-slate-300'}`}>
                    {totalPlannedDep > 0 ? ((totalRealDep / totalPlannedDep) * 100).toFixed(1) : 0}%
                  </span>
                </td>
              </tr>

              {/* === RÉSULTAT NET DE L'EXERCICE === */}
              <tr className="bg-slate-900 font-black text-white border-t-4 border-slate-700 text-sm">
                <td colSpan={3} className="py-4 px-4 text-left uppercase">
                  RÉSULTAT NET COMPTABLE (PRODUITS − CHARGES)
                </td>
                <td className="py-4 px-3 font-mono text-slate-400">
                  {resultPrev >= 0 ? '+' : ''}{resultPrev.toLocaleString('fr-FR')} €
                </td>
                <td className="py-4 px-3 font-mono text-white">
                  {resultPlanned >= 0 ? '+' : ''}{resultPlanned.toLocaleString('fr-FR')} €
                </td>
                <td className={`py-4 px-3 font-mono ${resultReal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {resultReal >= 0 ? '+' : ''}{resultReal.toLocaleString('fr-FR')} €
                </td>
                <td className={`py-4 px-3 font-mono ${resultDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {resultDiff >= 0 ? '+' : ''}{resultDiff.toLocaleString('fr-FR')} €
                </td>
                <td className="py-4 px-3 text-center text-xs text-slate-400">-</td>
                <td className="py-4 px-3 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${resultReal >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'}`}>
                    {resultReal >= 0 ? 'EXCÉDENT' : 'DÉFICIT'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

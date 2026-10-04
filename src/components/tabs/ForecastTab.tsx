import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  HelpCircle,
  Scale
} from 'lucide-react';
import { AppData, FiscalYear, BudgetItem } from '../../types/budget';
import { getCategoryCode } from '../../utils/categoryCodes';

interface ForecastTabProps {
  data: AppData;
  currentYear: FiscalYear;
  onUpdateBudgetItems: (items: BudgetItem[]) => void;
  onUpdateScenarios: (scenarios: any) => void;
  onOpenEditGlobalBudgetModal: () => void;
}

export const ForecastTab: React.FC<ForecastTabProps> = ({
  data,
  currentYear,
  onUpdateBudgetItems,
  onUpdateScenarios,
  onOpenEditGlobalBudgetModal,
}) => {
  // Scenarios state
  const defaultScenarios = currentYear.scenarios || {
    optimistic: { revenuePercent: 8, expensePercent: -3, notes: 'Forte hausse sponsoring & buvette' },
    neutral: { revenuePercent: 0, expensePercent: 0, notes: 'Reconduction prévisionnelle classique' },
    pessimistic: { revenuePercent: -8, expensePercent: 6, notes: 'Baisse des subventions & inflation charges' },
  };

  const [activeScenario, setActiveScenario] = useState<'neutral' | 'optimistic' | 'pessimistic'>('neutral');
  const [optRev, setOptRev] = useState(defaultScenarios.optimistic?.revenuePercent ?? 8);
  const [optDep, setOptDep] = useState(defaultScenarios.optimistic?.expensePercent ?? -3);
  const [pessRev, setPessRev] = useState(defaultScenarios.pessimistic?.revenuePercent ?? -8);
  const [pessDep, setPessDep] = useState(defaultScenarios.pessimistic?.expensePercent ?? 6);

  // Édition des montants de base
  const [editingPosteId, setEditingPosteId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [showConfigSliders, setShowConfigSliders] = useState(false);

  const currentYearTx = data.transactions.filter(
    (t) => t.fiscalYearId === currentYear.id && t.status === 'realise'
  );

  const categoriesRec = data.categories.filter((c) => c.type === 'recette');
  const categoriesDep = data.categories.filter((c) => c.type === 'depense');

  // Handle edit item
  const handleSaveItem = (catId: string) => {
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
    setEditingPosteId(null);
  };

  // Save scenarios parameters
  const handleSaveScenarioParameters = () => {
    const newScenarios = {
      optimistic: { revenuePercent: optRev, expensePercent: optDep },
      neutral: { revenuePercent: 0, expensePercent: 0 },
      pessimistic: { revenuePercent: pessRev, expensePercent: pessDep },
    };
    onUpdateScenarios(newScenarios);
    setShowConfigSliders(false);
  };

  // Calculs par poste avec multiplicateurs
  const getMultiplier = (type: 'recette' | 'depense', scenario: 'neutral' | 'optimistic' | 'pessimistic') => {
    if (scenario === 'neutral') return 1;
    if (scenario === 'optimistic') {
      return type === 'recette' ? 1 + optRev / 100 : 1 + optDep / 100;
    }
    // pessimistic
    return type === 'recette' ? 1 + pessRev / 100 : 1 + pessDep / 100;
  };

  const getPosteValues = (cat: any) => {
    const bItems = data.budgetItems.filter(
      (b) => b.fiscalYearId === currentYear.id && b.categoryId === cat.id
    );
    const basePlanned = bItems.reduce((s, b) => s + (b.plannedAmount || 0), 0);
    const comment = bItems.find((b) => b.notes && !b.notes.startsWith('Budget annuel'))?.notes || bItems[0]?.notes || cat.notes || '';
    const realN = currentYearTx
      .filter((t) => t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0);

    const optVal = Math.round(basePlanned * getMultiplier(cat.type, 'optimistic'));
    const neutVal = basePlanned;
    const pessVal = Math.round(basePlanned * getMultiplier(cat.type, 'pessimistic'));

    return { basePlanned, realN, optVal, neutVal, pessVal, notes: comment };
  };

  // Totaux
  let totalRecReal = 0, totalRecNeut = 0, totalRecOpt = 0, totalRecPess = 0;
  categoriesRec.forEach((cat) => {
    const vals = getPosteValues(cat);
    totalRecReal += vals.realN;
    totalRecNeut += vals.neutVal;
    totalRecOpt += vals.optVal;
    totalRecPess += vals.pessVal;
  });

  let totalDepReal = 0, totalDepNeut = 0, totalDepOpt = 0, totalDepPess = 0;
  categoriesDep.forEach((cat) => {
    const vals = getPosteValues(cat);
    totalDepReal += vals.realN;
    totalDepNeut += vals.neutVal;
    totalDepOpt += vals.optVal;
    totalDepPess += vals.pessVal;
  });

  const netReal = totalRecReal - totalDepReal;
  const netNeut = totalRecNeut - totalDepNeut;
  const netOpt = totalRecOpt - totalDepOpt;
  const netPess = totalRecPess - totalDepPess;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title & Scenarios Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#181a22] to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Budget Prévisionnel & Simulateur de Scénarios
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Matrice d'élaboration budgétaire et tests de résilience (Neutre, Optimiste, Pessimiste)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenEditGlobalBudgetModal}
            className="px-3.5 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-all active:scale-95"
            title="Modifier les montants prévus du budget global"
          >
            <Scale className="w-4 h-4" />
            <span>Modifier le Budget Global</span>
          </button>
          <button
            onClick={() => setShowConfigSliders(!showConfigSliders)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Paramétrer Scénarios</span>
          </button>
        </div>
      </div>

      {/* PANNEAU DE CONFIGURATION DES SCÉNARIOS (Accordeon) */}
      {showConfigSliders && (
        <div className="p-5 bg-slate-900 border border-purple-900/60 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Hypothèses et Multiplicateurs de Simulation
            </h3>
            <span className="text-xs text-slate-400">Ajustement en %</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scénario Optimiste */}
            <div className="p-4 bg-slate-950/70 border border-emerald-900/40 rounded-xl space-y-3">
              <span className="text-xs font-bold text-emerald-400 uppercase">
                Scénario Optimiste
              </span>
              <div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Variation Recettes :</span>
                  <span className="font-bold text-emerald-400">+{optRev}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={optRev}
                  onChange={(e) => setOptRev(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Variation Dépenses :</span>
                  <span className="font-bold text-emerald-400">{optDep}%</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="10"
                  value={optDep}
                  onChange={(e) => setOptDep(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            {/* Scénario Pessimiste */}
            <div className="p-4 bg-slate-950/70 border border-red-900/40 rounded-xl space-y-3">
              <span className="text-xs font-bold text-red-400 uppercase">
                Scénario Pessimiste
              </span>
              <div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Variation Recettes :</span>
                  <span className="font-bold text-red-400">{pessRev}%</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="0"
                  value={pessRev}
                  onChange={(e) => setPessRev(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Variation Dépenses :</span>
                  <span className="font-bold text-red-400">+{pessDep}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={pessDep}
                  onChange={(e) => setPessDep(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setShowConfigSliders(false)}
              className="px-4 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
            >
              Fermer
            </button>
            <button
              onClick={handleSaveScenarioParameters}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-md"
            >
              Appliquer les hypothèses
            </button>
          </div>
        </div>
      )}

      {/* 3 CARDS DE RÉSULTATS COMPARATIFS DES SCÉNARIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Scénario 1 : Neutre (Reconduction) */}
        <div
          onClick={() => setActiveScenario('neutral')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeScenario === 'neutral'
              ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
              : 'bg-[#171922] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-blue-400">1. Scénario Neutre</span>
            <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50">
              Validé
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${netNeut >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netNeut >= 0 ? '+' : ''}{netNeut.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Résultat net estimé (Équilibre)
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 flex justify-between">
            <span>Recettes: {totalRecNeut.toLocaleString('fr-FR')} €</span>
            <span>Dépenses: {totalDepNeut.toLocaleString('fr-FR')} €</span>
          </div>
        </div>

        {/* Scénario 2 : Optimiste */}
        <div
          onClick={() => setActiveScenario('optimistic')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeScenario === 'optimistic'
              ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
              : 'bg-[#171922] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-400">2. Scénario Optimiste</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/50">
              +{optRev}% Rec / {optDep}% Dép
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${netOpt >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netOpt >= 0 ? '+' : ''}{netOpt.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Résultat en cas de dynamique favorable
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 flex justify-between">
            <span>Recettes: {totalRecOpt.toLocaleString('fr-FR')} €</span>
            <span>Dépenses: {totalDepOpt.toLocaleString('fr-FR')} €</span>
          </div>
        </div>

        {/* Scénario 3 : Pessimiste */}
        <div
          onClick={() => setActiveScenario('pessimistic')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeScenario === 'pessimistic'
              ? 'bg-slate-900 border-red-500 ring-2 ring-red-500/30 shadow-lg'
              : 'bg-[#171922] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-red-400">3. Scénario Pessimiste</span>
            <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800/50">
              {pessRev}% Rec / +{pessDep}% Dép
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${netPess >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netPess >= 0 ? '+' : ''}{netPess.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Test de résistance en crise
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 flex justify-between">
            <span>Recettes: {totalRecPess.toLocaleString('fr-FR')} €</span>
            <span>Dépenses: {totalDepPess.toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      </div>

      {/* MATRICE DÉTAILLÉE DU BUDGET PRÉVISIONNEL */}
      <div className="bg-[#171922] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C8102E]" />
            Matrice Prévisionnelle par Pôle & Simulation Côte à Côte
          </h3>
          <span className="text-xs text-slate-400">
            Cliquez sur un montant pour l'ajuster manuellement
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-[#0f1116] border-b border-slate-800 text-slate-300">
              <tr>
                <th className="py-3 px-4 text-left font-bold min-w-[220px]">Poste / Pôle</th>
                <th className="py-3 px-3 font-semibold text-slate-400 min-w-[100px]">Réalisé N (Réf.)</th>
                <th className="py-3 px-3 font-bold text-white min-w-[110px] bg-slate-900">Prévisionnel Neutre</th>
                <th className="py-3 px-3 font-bold text-emerald-400 min-w-[110px]">Optimiste (+{optRev}%)</th>
                <th className="py-3 px-3 font-bold text-red-400 min-w-[110px]">Pessimiste ({pessRev}%)</th>
                <th className="py-3 px-4 text-left font-semibold text-slate-400 min-w-[180px]">Remarques</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* SECTION RECETTES */}
              <tr className="bg-emerald-950/20 text-emerald-300 font-bold">
                <td colSpan={6} className="py-2 px-4 text-left uppercase text-[11px] bg-[#12231c]">
                  ▼ PRODUITS PRÉVISIONNELS (RECETTES)
                </td>
              </tr>
              {categoriesRec.map((cat) => {
                const vals = getPosteValues(cat);
                const isEditing = editingPosteId === cat.id;
                return (
                  <tr key={cat.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-left font-medium text-slate-200">
                      <span className="font-mono text-[11px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 mr-2">
                        {getCategoryCode(cat)}
                      </span>
                      {cat.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{vals.realN.toLocaleString('fr-FR')} €</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white bg-slate-900/50">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                            className="w-20 px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-right font-mono text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveItem(cat.id)}
                            className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px]"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingPosteId(cat.id);
                            setEditValue(vals.basePlanned);
                          }}
                          className="cursor-pointer hover:underline"
                          title="Cliquer pour modifier"
                        >
                          {vals.neutVal.toLocaleString('fr-FR')} €
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">{vals.optVal.toLocaleString('fr-FR')} €</td>
                    <td className="py-2.5 px-3 font-mono text-red-400 font-semibold">{vals.pessVal.toLocaleString('fr-FR')} €</td>
                    <td className="py-2.5 px-4 text-left text-slate-400 italic truncate max-w-xs">{vals.notes || '-'}</td>
                  </tr>
                );
              })}

              {/* TOTAL RECETTES */}
              <tr className="bg-emerald-950/40 text-emerald-300 font-black border-t-2 border-emerald-800">
                <td className="py-3 px-4 text-left uppercase">TOTAL PRODUITS ESTIMÉS</td>
                <td className="py-3 px-3 font-mono">{totalRecReal.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono bg-slate-900">{totalRecNeut.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono">{totalRecOpt.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono">{totalRecPess.toLocaleString('fr-FR')} €</td>
                <td></td>
              </tr>

              {/* SECTION DEPENSES */}
              <tr className="bg-red-950/20 text-red-300 font-bold">
                <td colSpan={6} className="py-2 px-4 text-left uppercase text-[11px] bg-[#241217]">
                  ▼ CHARGES PRÉVISIONNELLES (DÉPENSES)
                </td>
              </tr>
              {categoriesDep.map((cat) => {
                const vals = getPosteValues(cat);
                const isEditing = editingPosteId === cat.id;
                return (
                  <tr key={cat.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-left font-medium text-slate-200">
                      <span className="font-mono text-[11px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 mr-2">
                        {getCategoryCode(cat)}
                      </span>
                      {cat.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{vals.realN.toLocaleString('fr-FR')} €</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white bg-slate-900/50">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                            className="w-20 px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-right font-mono text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveItem(cat.id)}
                            className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px]"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingPosteId(cat.id);
                            setEditValue(vals.basePlanned);
                          }}
                          className="cursor-pointer hover:underline"
                          title="Cliquer pour modifier"
                        >
                          {vals.neutVal.toLocaleString('fr-FR')} €
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">{vals.optVal.toLocaleString('fr-FR')} €</td>
                    <td className="py-2.5 px-3 font-mono text-red-400 font-semibold">{vals.pessVal.toLocaleString('fr-FR')} €</td>
                    <td className="py-2.5 px-4 text-left text-slate-400 italic truncate max-w-xs">{vals.notes || '-'}</td>
                  </tr>
                );
              })}

              {/* TOTAL CHARGES */}
              <tr className="bg-red-950/40 text-red-300 font-black border-t-2 border-red-800">
                <td className="py-3 px-4 text-left uppercase">TOTAL CHARGES ESTIMÉES</td>
                <td className="py-3 px-3 font-mono">{totalDepReal.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono bg-slate-900">{totalDepNeut.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono">{totalDepOpt.toLocaleString('fr-FR')} €</td>
                <td className="py-3 px-3 font-mono">{totalDepPess.toLocaleString('fr-FR')} €</td>
                <td></td>
              </tr>

              {/* RÉSULTAT PRÉVISIONNEL */}
              <tr className="bg-slate-900 font-black text-white border-t-4 border-slate-700 text-sm">
                <td className="py-4 px-4 text-left uppercase">
                  RÉSULTAT NET PRÉVISIONNEL (MARGE DE SÉCURITÉ)
                </td>
                <td className={`py-4 px-3 font-mono ${netReal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netReal >= 0 ? '+' : ''}{netReal.toLocaleString('fr-FR')} €
                </td>
                <td className={`py-4 px-3 font-mono bg-slate-950 ${netNeut >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netNeut >= 0 ? '+' : ''}{netNeut.toLocaleString('fr-FR')} €
                </td>
                <td className={`py-4 px-3 font-mono ${netOpt >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netOpt >= 0 ? '+' : ''}{netOpt.toLocaleString('fr-FR')} €
                </td>
                <td className={`py-4 px-3 font-mono ${netPess >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netPess >= 0 ? '+' : ''}{netPess.toLocaleString('fr-FR')} €
                </td>
                <td className="py-4 px-4 text-left text-xs font-semibold text-slate-300">
                  {netNeut >= 0 ? 'Budget à l\'équilibre' : 'Attention : Déficit prévu'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

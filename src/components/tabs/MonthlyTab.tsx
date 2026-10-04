import React, { useState } from 'react';
import {
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { AppData, FiscalYear } from '../../types/budget';

interface MonthlyTabProps {
  data: AppData;
  currentYear: FiscalYear;
}

export const MonthlyTab: React.FC<MonthlyTabProps> = ({ data, currentYear }) => {
  const [periodMode, setPeriodMode] = useState<'sportive' | 'calendar'>(
    data.settings.seasonType || 'sportive'
  );
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(3); // default Septembre (mois le plus récent)

  // Months definition (Exercice officiel Juin 2026 à Mai 2027)
  const monthsSportive = [
    { label: 'Juin', short: 'Juin', monthNum: 6 },
    { label: 'Juillet', short: 'Juil', monthNum: 7 },
    { label: 'Août', short: 'Août', monthNum: 8 },
    { label: 'Septembre', short: 'Sep', monthNum: 9 },
    { label: 'Octobre', short: 'Oct', monthNum: 10 },
    { label: 'Novembre', short: 'Nov', monthNum: 11 },
    { label: 'Décembre', short: 'Déc', monthNum: 12 },
    { label: 'Janvier', short: 'Jan', monthNum: 1 },
    { label: 'Février', short: 'Fév', monthNum: 2 },
    { label: 'Mars', short: 'Mar', monthNum: 3 },
    { label: 'Avril', short: 'Avr', monthNum: 4 },
    { label: 'Mai', short: 'Mai', monthNum: 5 },
  ];

  const monthsCalendar = [
    { label: 'Janvier', short: 'Jan', monthNum: 1 },
    { label: 'Février', short: 'Fév', monthNum: 2 },
    { label: 'Mars', short: 'Mar', monthNum: 3 },
    { label: 'Avril', short: 'Avr', monthNum: 4 },
    { label: 'Mai', short: 'Mai', monthNum: 5 },
    { label: 'Juin', short: 'Juin', monthNum: 6 },
    { label: 'Juillet', short: 'Juil', monthNum: 7 },
    { label: 'Août', short: 'Août', monthNum: 8 },
    { label: 'Septembre', short: 'Sep', monthNum: 9 },
    { label: 'Octobre', short: 'Oct', monthNum: 10 },
    { label: 'Novembre', short: 'Nov', monthNum: 11 },
    { label: 'Décembre', short: 'Déc', monthNum: 12 },
  ];

  const activeMonths = periodMode === 'sportive' ? monthsSportive : monthsCalendar;
  const currentYearTx = data.transactions.filter((t) => t.fiscalYearId === currentYear.id);

  // Totaux prévus
  const totalPlannedRec = data.budgetItems
    .filter((b) => b.fiscalYearId === currentYear.id && data.categories.find((c) => c.id === b.categoryId)?.type === 'recette')
    .reduce((s, b) => s + b.plannedAmount, 0);

  const totalPlannedDep = data.budgetItems
    .filter((b) => b.fiscalYearId === currentYear.id && data.categories.find((c) => c.id === b.categoryId)?.type === 'depense')
    .reduce((s, b) => s + b.plannedAmount, 0);

  const avgMonthlyPlannedDep = totalPlannedDep / 12;
  const avgMonthlyPlannedRec = totalPlannedRec / 12;

  // Calcul des données par mois pour le graphique & comparatif
  const monthlyData = activeMonths.map((m) => {
    const txThisMonth = currentYearTx.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === m.monthNum;
    });

    const realRec = txThisMonth.filter((t) => t.type === 'recette' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    const realDep = txThisMonth.filter((t) => t.type === 'depense' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);

    const engRec = txThisMonth.filter((t) => t.type === 'recette' && t.status !== 'realise').reduce((s, t) => s + t.amount, 0);
    const engDep = txThisMonth.filter((t) => t.type === 'depense' && t.status !== 'realise').reduce((s, t) => s + t.amount, 0);

    return {
      month: m.short,
      fullMonth: m.label,
      monthNum: m.monthNum,
      'Recettes Réalisées': Math.round(realRec),
      'Dépenses Réalisées': Math.round(realDep),
      'Recettes Engagées/Prévues': Math.round(engRec),
      'Dépenses Engagées/Prévues': Math.round(engDep),
      soldeNet: Math.round(realRec - realDep),
      totalRec: realRec + engRec,
      totalDep: realDep + engDep,
    };
  });

  // Mois N sélectionné pour l'analyse détaillée
  const selectedMonth = monthlyData[selectedMonthIndex] || monthlyData[0];
  const selectedRealDep = selectedMonth['Dépenses Réalisées'];
  const selectedRealRec = selectedMonth['Recettes Réalisées'];

  // Formule CDC : Rythme d'exécution mensuel = (Réalisé du mois / Moyenne mensuelle prévue) * 100
  const monthlyRhythmDep = avgMonthlyPlannedDep > 0 ? (selectedRealDep / avgMonthlyPlannedDep) * 100 : 0;
  const monthlyRhythmRec = avgMonthlyPlannedRec > 0 ? (selectedRealRec / avgMonthlyPlannedRec) * 100 : 0;

  // Tableau croisé dynamique par Pôle
  const categoriesRec = data.categories.filter((c) => c.type === 'recette');
  const categoriesDep = data.categories.filter((c) => c.type === 'depense');

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#181a22] to-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-2xl font-black text-white">
            Suivi et Réalisation Mensuelle
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ventilation périodique, comparatif Mois N vs prévisionnel, et rythme de consommation
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setPeriodMode('sportive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodMode === 'sportive'
                ? 'bg-[#C8102E] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Saison Sportive (Sep - Août)
          </button>
          <button
            onClick={() => setPeriodMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodMode === 'calendar'
                ? 'bg-[#C8102E] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Année Civile (Janv - Déc)
          </button>
        </div>
      </div>

      {/* COMPARATIF MENSUEL DÉTAILLÉ (MOIS N vs PRÉVISIONNEL) */}
      <div className="bg-[#171922] p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[#C8102E]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Comparatif Détaillé : Réalisé Mois N vs Prévisionnel
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Choisir le mois :</span>
            <select
              value={selectedMonthIndex}
              onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-xs font-bold text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#C8102E]"
            >
              {activeMonths.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Cards comparatives pour le mois N */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card Dépenses du mois */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">
              Dépenses : {selectedMonth.fullMonth}
            </div>
            <div className="text-xl font-black text-white mt-1">
              {selectedRealDep.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Moyenne prévue :</span>
              <span className="text-slate-300 font-medium">{Math.round(avgMonthlyPlannedDep).toLocaleString('fr-FR')} €</span>
            </div>
            <div className="mt-2 text-[11px] font-bold">
              Écart :{' '}
              <span className={selectedRealDep > avgMonthlyPlannedDep ? 'text-red-400' : 'text-emerald-400'}>
                {selectedRealDep > avgMonthlyPlannedDep ? '+' : ''}
                {(selectedRealDep - avgMonthlyPlannedDep).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </span>
            </div>
          </div>

          {/* Card Recettes du mois */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">
              Recettes : {selectedMonth.fullMonth}
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {selectedRealRec.toLocaleString('fr-FR')} €
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>Moyenne prévue :</span>
              <span className="text-slate-300 font-medium">{Math.round(avgMonthlyPlannedRec).toLocaleString('fr-FR')} €</span>
            </div>
            <div className="mt-2 text-[11px] font-bold">
              Écart :{' '}
              <span className={selectedRealRec >= avgMonthlyPlannedRec ? 'text-emerald-400' : 'text-amber-400'}>
                {selectedRealRec >= avgMonthlyPlannedRec ? '+' : ''}
                {(selectedRealRec - avgMonthlyPlannedRec).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </span>
            </div>
          </div>

          {/* Card Solde net du mois */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">
              Solde Net : {selectedMonth.fullMonth}
            </div>
            <div
              className={`text-xl font-black mt-1 ${
                selectedMonth.soldeNet >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {selectedMonth.soldeNet >= 0 ? '+' : ''}
              {selectedMonth.soldeNet.toLocaleString('fr-FR')} €
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Recettes − Dépenses sur le mois
            </p>
            <div className="mt-2 text-[10px] text-slate-500">
              {selectedMonth.soldeNet >= 0 ? 'Flux positif' : 'Flux négatif'}
            </div>
          </div>

          {/* Card Rythme de consommation (Formule CDC) */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">
                Rythme Consommation Dépenses
              </div>
              <div className="text-xl font-black text-white mt-1">
                {monthlyRhythmDep.toFixed(1)}%
              </div>
              <p className="text-[10px] text-slate-400">
                (Réalisé mois / Moyenne prévue) × 100
              </p>
            </div>
            {/* Jauge */}
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  monthlyRhythmDep > 120 ? 'bg-red-500' : monthlyRhythmDep > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(monthlyRhythmDep, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* GRAPHIQUE BARRES EMPILÉES DU RYTHME MENSUEL */}
      <div className="bg-[#171922] p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Graphique du Rythme de Consommation & Réalisation Mensuelle
            </h3>
            <p className="text-xs text-slate-400">
              Barres empilées Dépenses et Recettes (Réalisé vs Engagé/Prévu)
            </p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262b36" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111317', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} €`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <ReferenceLine y={Math.round(avgMonthlyPlannedDep)} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Moy. Dépenses', fill: '#ef4444', fontSize: 10 }} />
              <Bar dataKey="Dépenses Réalisées" stackId="dep" fill="#c8102e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Dépenses Engagées/Prévues" stackId="dep" fill="#7f1d1d" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Recettes Réalisées" stackId="rec" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Recettes Engagées/Prévues" stackId="rec" fill="#065f46" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLEAU CROISÉ DYNAMIQUE MENSUEL */}
      <div className="bg-[#171922] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Tableau Croisé Dynamique Mensuel Ventilée par Pôle (€)
          </h3>
          <span className="text-xs text-slate-400">Valeurs en Euros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#0f1116] border-b border-slate-800 text-slate-300">
                <th className="py-2.5 px-3 text-left font-bold sticky left-0 bg-[#0f1116] z-10 min-w-[200px]">
                  Pôles & Catégories
                </th>
                {activeMonths.map((m, idx) => (
                  <th key={idx} className="py-2.5 px-2 font-bold min-w-[65px]">
                    {m.short}
                  </th>
                ))}
                <th className="py-2.5 px-3 font-black text-white bg-slate-900 min-w-[90px]">
                  Total Annuel
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* SECTION RECETTES */}
              <tr className="bg-emerald-950/20 text-emerald-400 font-bold">
                <td colSpan={14} className="py-2 px-3 text-left sticky left-0 bg-[#121f1a]">
                  ▼ PRODUITS & RECETTES
                </td>
              </tr>
              {categoriesRec.map((cat) => {
                let catTotalYear = 0;
                return (
                  <tr key={cat.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-left text-slate-300 font-medium sticky left-0 bg-[#171922] z-10 border-r border-slate-800/40 truncate max-w-[220px]">
                      {cat.name}
                    </td>
                    {activeMonths.map((m, idx) => {
                      const amount = currentYearTx
                        .filter((t) => {
                          const d = new Date(t.date);
                          return (
                            t.categoryId === cat.id &&
                            t.status === 'realise' &&
                            d.getMonth() + 1 === m.monthNum
                          );
                        })
                        .reduce((s, t) => s + t.amount, 0);
                      catTotalYear += amount;
                      return (
                        <td key={idx} className={`py-2 px-2 text-slate-300 ${amount > 0 ? 'font-semibold text-emerald-300' : 'text-slate-600'}`}>
                          {amount > 0 ? amount.toLocaleString('fr-FR') : '-'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 font-bold text-emerald-400 bg-slate-900/60 border-l border-slate-800">
                      {catTotalYear.toLocaleString('fr-FR')} €
                    </td>
                  </tr>
                );
              })}

              {/* SOUS-TOTAL RECETTES */}
              <tr className="bg-emerald-950/40 font-bold text-emerald-300 border-t-2 border-emerald-800">
                <td className="py-2.5 px-3 text-left sticky left-0 bg-[#0d231b] z-10">
                  TOTAL RECETTES MENSUELLES
                </td>
                {activeMonths.map((m, idx) => {
                  const mData = monthlyData[idx];
                  return (
                    <td key={idx} className="py-2.5 px-2">
                      {mData['Recettes Réalisées'] > 0 ? mData['Recettes Réalisées'].toLocaleString('fr-FR') : '-'}
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 font-black text-emerald-300 bg-slate-900 border-l border-slate-800">
                  {monthlyData.reduce((s, m) => s + m['Recettes Réalisées'], 0).toLocaleString('fr-FR')} €
                </td>
              </tr>

              {/* SECTION DEPENSES */}
              <tr className="bg-red-950/20 text-red-400 font-bold">
                <td colSpan={14} className="py-2 px-3 text-left sticky left-0 bg-[#251317]">
                  ▼ CHARGES & DÉPENSES
                </td>
              </tr>
              {categoriesDep.map((cat) => {
                let catTotalYear = 0;
                return (
                  <tr key={cat.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-left text-slate-300 font-medium sticky left-0 bg-[#171922] z-10 border-r border-slate-800/40 truncate max-w-[220px]">
                      {cat.name}
                    </td>
                    {activeMonths.map((m, idx) => {
                      const amount = currentYearTx
                        .filter((t) => {
                          const d = new Date(t.date);
                          return (
                            t.categoryId === cat.id &&
                            t.status === 'realise' &&
                            d.getMonth() + 1 === m.monthNum
                          );
                        })
                        .reduce((s, t) => s + t.amount, 0);
                      catTotalYear += amount;
                      return (
                        <td key={idx} className={`py-2 px-2 text-slate-300 ${amount > 0 ? 'font-semibold text-red-300' : 'text-slate-600'}`}>
                          {amount > 0 ? amount.toLocaleString('fr-FR') : '-'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 font-bold text-red-400 bg-slate-900/60 border-l border-slate-800">
                      {catTotalYear.toLocaleString('fr-FR')} €
                    </td>
                  </tr>
                );
              })}

              {/* SOUS-TOTAL DEPENSES */}
              <tr className="bg-red-950/40 font-bold text-red-300 border-t-2 border-red-800">
                <td className="py-2.5 px-3 text-left sticky left-0 bg-[#240e13] z-10">
                  TOTAL DÉPENSES MENSUELLES
                </td>
                {activeMonths.map((m, idx) => {
                  const mData = monthlyData[idx];
                  return (
                    <td key={idx} className="py-2.5 px-2">
                      {mData['Dépenses Réalisées'] > 0 ? mData['Dépenses Réalisées'].toLocaleString('fr-FR') : '-'}
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 font-black text-red-300 bg-slate-900 border-l border-slate-800">
                  {monthlyData.reduce((s, m) => s + m['Dépenses Réalisées'], 0).toLocaleString('fr-FR')} €
                </td>
              </tr>

              {/* SOLDE NET MENSUEL */}
              <tr className="bg-slate-900 font-extrabold text-white border-t-2 border-slate-700">
                <td className="py-3 px-3 text-left sticky left-0 bg-slate-900 z-10 text-slate-200">
                  SOLDE NET DU MOIS (R − D)
                </td>
                {activeMonths.map((m, idx) => {
                  const net = monthlyData[idx].soldeNet;
                  return (
                    <td
                      key={idx}
                      className={`py-3 px-2 ${
                        net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {net !== 0 ? `${net > 0 ? '+' : ''}${net.toLocaleString('fr-FR')}` : '-'}
                    </td>
                  );
                })}
                <td className="py-3 px-3 font-black bg-slate-950 border-l border-slate-800 text-white">
                  {(
                    monthlyData.reduce((s, m) => s + m['Recettes Réalisées'], 0) -
                    monthlyData.reduce((s, m) => s + m['Dépenses Réalisées'], 0)
                  ).toLocaleString('fr-FR')}{' '}
                  €
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

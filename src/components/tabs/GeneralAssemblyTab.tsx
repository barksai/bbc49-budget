import React, { useState } from 'react';
import {
  Presentation,
  Maximize2,
  Minimize2,
  PieChart as PieIcon,
  Users,
  Award,
  FileDown,
  Save,
  CheckCircle,
  HelpCircle,
  Shield,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { AppData, FiscalYear } from '../../types/budget';

interface GeneralAssemblyTabProps {
  data: AppData;
  currentYear: FiscalYear;
  onUpdateFiscalYearNotes: (notes: string) => void;
  onExportPdf: () => void;
}

export const GeneralAssemblyTab: React.FC<GeneralAssemblyTabProps> = ({
  data,
  currentYear,
  onUpdateFiscalYearNotes,
  onExportPdf,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notes, setNotes] = useState(currentYear.treasurerNotes || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentYearTx = data.transactions.filter((t) => t.fiscalYearId === currentYear.id);

  // Totaux réalisés
  const totalRealRec = currentYearTx
    .filter((t) => t.type === 'recette' && t.status === 'realise')
    .reduce((s, t) => s + t.amount, 0);

  const totalRealDep = currentYearTx
    .filter((t) => t.type === 'depense' && t.status === 'realise')
    .reduce((s, t) => s + t.amount, 0);

  const netResult = totalRealRec - totalRealDep;

  // Totaux prévus
  const totalPlannedRec = data.budgetItems
    .filter((b) => b.fiscalYearId === currentYear.id && data.categories.find((c) => c.id === b.categoryId)?.type === 'recette')
    .reduce((s, b) => s + b.plannedAmount, 0);

  const totalPlannedDep = data.budgetItems
    .filter((b) => b.fiscalYearId === currentYear.id && data.categories.find((c) => c.id === b.categoryId)?.type === 'depense')
    .reduce((s, b) => s + b.plannedAmount, 0);

  // Indicateurs pédagogiques AG
  const subvAmount = currentYearTx
    .filter((t) => t.categoryId === 'cat-rec-subv' && t.status === 'realise')
    .reduce((s, t) => s + t.amount, 0);
  const cotisAmount = currentYearTx
    .filter((t) => t.categoryId === 'cat-rec-cotis' && t.status === 'realise')
    .reduce((s, t) => s + t.amount, 0);

  const subvDependencePct = totalRealRec > 0 ? (subvAmount / totalRealRec) * 100 : 0;
  const cotisCoveragePct = totalRealDep > 0 ? (cotisAmount / totalRealDep) * 100 : 0;

  // Trésorerie disponible et mois de fonctionnement
  const totalCash = data.bankAccounts.reduce((s, acc) => {
    const accTx = currentYearTx.filter((t) => t.accountId === acc.id);
    const rec = accTx.filter((t) => t.type === 'recette' && t.status === 'realise').reduce((a, b) => a + b.amount, 0);
    const dep = accTx.filter((t) => t.type === 'depense' && t.status === 'realise').reduce((a, b) => a + b.amount, 0);
    return s + acc.initialBalance + rec - dep;
  }, 0);

  const monthlyExpenseAverage = totalRealDep > 0 ? totalRealDep / 8 : (totalPlannedDep / 12) || 3000;
  const cashReserveMonths = monthlyExpenseAverage > 0 ? totalCash / monthlyExpenseAverage : 0;

  // Données Donut Recettes
  const recDonutData = data.categories
    .filter((c) => c.type === 'recette')
    .map((c) => {
      const val = currentYearTx
        .filter((t) => t.categoryId === c.id && t.status === 'realise')
        .reduce((s, t) => s + t.amount, 0);
      return {
        name: c.name,
        value: val,
        color: c.color || '#10B981',
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Données Donut Dépenses
  const depDonutData = data.categories
    .filter((c) => c.type === 'depense')
    .map((c) => {
      const val = currentYearTx
        .filter((t) => t.categoryId === c.id && t.status === 'realise')
        .reduce((s, t) => s + t.amount, 0);
      return {
        name: c.name,
        value: val,
        color: c.color || '#C8102E',
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Comparatif Bar Chart AG
  const comparisonData = [
    {
      label: 'Recettes',
      'Budget Validé': totalPlannedRec,
      'Réalisé Actuel': totalRealRec,
    },
    {
      label: 'Dépenses',
      'Budget Validé': totalPlannedDep,
      'Réalisé Actuel': totalRealDep,
    },
  ];

  const handleSaveNotes = () => {
    onUpdateFiscalYearNotes(notes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0d0e12] p-4 sm:p-8' : 'max-h-[calc(100vh-4rem)]'}`}>
      {/* Title & Projection controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 p-4 sm:p-5 rounded-2xl border border-red-900/40 shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-[#C8102E] shadow-md shadow-red-900/40 flex items-center justify-center bg-black shrink-0">
            <img src="./logo.jpg" alt="Logo BBC" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#C8102E] text-white">
                Assemblée Générale
              </span>
              <span className="text-xs text-slate-300 font-bold">{currentYear.label}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Synthèse Financière Présentée aux Adhérents
            </h2>
            <p className="text-xs text-slate-400">
              Visualisation grand format et indicateurs de santé financière pour vidéo-projection
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
            <span>{isFullscreen ? 'Quitter Plein Écran' : 'Mode Plein Écran Vidéo'}</span>
          </button>
          <button
            onClick={onExportPdf}
            className="px-4 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Télécharger Rapport PDF</span>
          </button>
        </div>
      </div>

      {/* 4 INDICATEURS PÉDAGOGIQUES NON-FINANCIERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Résultat Net de la Saison */}
        <div className="p-5 rounded-2xl bg-[#171922] border border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Résultat d'Étape
            </span>
            <div className={`text-3xl font-black mt-2 ${netResult >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netResult >= 0 ? '+' : ''}{netResult.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              {netResult >= 0 ? 'Excédent budgétaire' : 'Déficit budgétaire'}
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            {netResult >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
            <span>Recettes {totalRealRec.toLocaleString('fr-FR')} € vs Dépenses {totalRealDep.toLocaleString('fr-FR')} €</span>
          </div>
        </div>

        {/* Réserve & Sécurité */}
        <div className="p-5 rounded-2xl bg-[#171922] border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Réserve de Trésorerie
            </span>
            <div className="text-3xl font-black text-white mt-2">
              {cashReserveMonths.toFixed(1)} mois
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Autonomie sans nouvelle recette
            </p>
          </div>
          <div className="mt-3 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Trésorerie globale : {totalCash.toLocaleString('fr-FR')} €</span>
          </div>
        </div>

        {/* Autonomie : Couverture des charges par cotisations */}
        <div className="p-5 rounded-2xl bg-[#171922] border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Couverture par Licences
            </span>
            <div className="text-3xl font-black text-blue-400 mt-2">
              {cotisCoveragePct.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Charges couvertes par les adhérents
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Cotisations : {cotisAmount.toLocaleString('fr-FR')} €</span>
          </div>
        </div>

        {/* Dépendance aux subventions */}
        <div className="p-5 rounded-2xl bg-[#171922] border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Part des Subventions
            </span>
            <div className="text-3xl font-black text-amber-400 mt-2">
              {subvDependencePct.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Aides publiques dans le budget
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Mairie & Conseil Dépt : {subvAmount.toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      </div>

      {/* GRANDS GRAPHIQUES FORMAT AG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Grands Formats Recettes */}
        <div className="bg-[#171922] border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-emerald-400" />
                D'où viennent nos Recettes ?
              </h3>
              <p className="text-xs text-slate-400">Total réalisé : {totalRealRec.toLocaleString('fr-FR')} €</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={recDonutData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name.slice(0, 15)}... ${(percent * 100).toFixed(0)}%`}
                >
                  {recDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111317', borderColor: '#334155', borderRadius: '8px', fontSize: '13px' }}
                  formatter={(val: any) => [`${Number(val).toLocaleString('fr-FR')} €`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Grands Formats Dépenses */}
        <div className="bg-[#171922] border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-red-500" />
                Où vont nos Dépenses ?
              </h3>
              <p className="text-xs text-slate-400">Total réalisé : {totalRealDep.toLocaleString('fr-FR')} €</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={depDonutData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name.slice(0, 15)}... ${(percent * 100).toFixed(0)}%`}
                >
                  {depDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111317', borderColor: '#334155', borderRadius: '8px', fontSize: '13px' }}
                  formatter={(val: any) => [`${Number(val).toLocaleString('fr-FR')} €`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* COMPARATIF GLOBAL & DISCOURS TRÉSORIER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histogramme Validé vs Réalisé */}
        <div className="lg:col-span-1 bg-[#171922] border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
            Budget Voté vs Réalisé
          </h3>
          <p className="text-xs text-slate-400 mb-4">Comparaison globale des masses</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262b36" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k€`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111317', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: any) => [`${Number(v).toLocaleString('fr-FR')} €`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Budget Validé" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Réalisé Actuel" fill="#C8102E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone de Texte et Discours du Trésorier pour l'AG */}
        <div className="lg:col-span-2 bg-[#171922] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Rapport Moral & Explications du Trésorier pour l'AG
              </h3>
              {savedSuccess && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Enregistré !
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Ces notes sont directement sauvegardées avec l'exercice et apparaissent sur le rapport PDF imprimable.
            </p>
            <textarea
              rows={8}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rédigez ici vos commentaires officiels pour la présentation en Assemblée Générale..."
              className="w-full mt-3 p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:outline-none focus:border-[#C8102E]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveNotes}
              className="px-4 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer le discours d'AG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

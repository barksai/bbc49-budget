import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Landmark,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AppData, FiscalYear } from '../../types/budget';

interface DashboardTabProps {
  data: AppData;
  currentYear: FiscalYear;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  data,
  currentYear,
  onNavigateToTab,
}) => {
  const currentYearTx = data.transactions.filter(t => t.fiscalYearId === currentYear.id);

  // Totaux prévus
  const totalPlannedRec = data.budgetItems
    .filter(b => b.fiscalYearId === currentYear.id && data.categories.find(c => c.id === b.categoryId)?.type === 'recette')
    .reduce((s, b) => s + b.plannedAmount, 0);

  const totalPlannedDep = data.budgetItems
    .filter(b => b.fiscalYearId === currentYear.id && data.categories.find(c => c.id === b.categoryId)?.type === 'depense')
    .reduce((s, b) => s + b.plannedAmount, 0);

  // Totaux réalisés
  const totalRealRec = currentYearTx
    .filter(t => t.type === 'recette' && t.status === 'realise')
    .reduce((s, t) => s + t.amount, 0);

  const totalRealDep = currentYearTx
    .filter(t => t.type === 'depense' && t.status === 'realise')
    .reduce((s, t) => s + t.amount, 0);

  const netRealBalance = totalRealRec - totalRealDep;

  // Engagés & Prévus restants
  const committedRec = currentYearTx
    .filter(t => t.type === 'recette' && (t.status === 'engage' || t.status === 'prevu'))
    .reduce((s, t) => s + t.amount, 0);

  const committedDep = currentYearTx
    .filter(t => t.type === 'depense' && (t.status === 'engage' || t.status === 'prevu'))
    .reduce((s, t) => s + t.amount, 0);

  // Atterrissage (Forecast) = Réalisé + Engagé/Prévu reste à venir
  const forecastLandingRec = totalRealRec + committedRec;
  const forecastLandingDep = totalRealDep + committedDep;
  const forecastLandingNet = forecastLandingRec - forecastLandingDep;

  // Calcul des taux d'exécution
  const rateRec = totalPlannedRec > 0 ? (totalRealRec / totalPlannedRec) * 100 : 0;
  const rateDep = totalPlannedDep > 0 ? (totalRealDep / totalPlannedDep) * 100 : 0;

  // Solde bancaire global des comptes
  const bankAccountsSummary = data.bankAccounts.map(acc => {
    const accTx = currentYearTx.filter(t => t.accountId === acc.id);
    const rec = accTx.filter(t => t.type === 'recette' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    const dep = accTx.filter(t => t.type === 'depense' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    const trIn = data.transfers.filter(tr => tr.toAccountId === acc.id && tr.fiscalYearId === currentYear.id).reduce((s, tr) => s + tr.amount, 0);
    const trOut = data.transfers.filter(tr => tr.fromAccountId === acc.id && tr.fiscalYearId === currentYear.id).reduce((s, tr) => s + tr.amount, 0);
    const balance = acc.initialBalance + rec - dep + trIn - trOut;
    return { ...acc, currentBalance: balance };
  });

  const totalBankCash = bankAccountsSummary.reduce((s, a) => s + a.currentBalance, 0);

  // Seuils & Alertes
  const alerts: { type: 'danger' | 'warning' | 'info'; title: string; message: string }[] = [];

  // Alerte trésorerie
  if (totalBankCash < data.settings.alertLowCashThreshold) {
    alerts.push({
      type: 'danger',
      title: 'Trésorerie basse',
      message: `Le solde cumulé disponible (${totalBankCash.toLocaleString('fr-FR')} €) est inférieur au seuil de sécurité configuré (${data.settings.alertLowCashThreshold.toLocaleString('fr-FR')} €).`,
    });
  }

  // Alerte dépassement dépenses globales
  if (rateDep > data.settings.alertThresholdExpensePct) {
    alerts.push({
      type: 'danger',
      title: 'Dépassement du budget des dépenses',
      message: `Les dépenses réalisées dépassent le budget prévu (${rateDep.toFixed(1)}% consommé).`,
    });
  }

  // Alerte dépassement par pôle
  data.categories.filter(c => c.type === 'depense').forEach(cat => {
    const bItem = data.budgetItems.find(b => b.fiscalYearId === currentYear.id && b.categoryId === cat.id);
    if (bItem && bItem.plannedAmount > 0) {
      const realForCat = currentYearTx.filter(t => t.categoryId === cat.id && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      if (realForCat > bItem.plannedAmount) {
        alerts.push({
          type: 'warning',
          title: `Surconsommation sur le pôle : ${cat.name}`,
          message: `${realForCat.toLocaleString('fr-FR')} € réalisés pour un budget de ${bItem.plannedAmount.toLocaleString('fr-FR')} € (${((realForCat / bItem.plannedAmount) * 100).toFixed(0)}%).`,
        });
      }
    }
  });

  // Alerte sous-recouvrement des subventions ou adhésions
  const subvCat = data.categories.find(c => c.id === 'cat-rec-subv');
  if (subvCat) {
    const bItemSubv = data.budgetItems.find(b => b.fiscalYearId === currentYear.id && b.categoryId === subvCat.id);
    const realSubv = currentYearTx.filter(t => t.categoryId === subvCat.id && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    if (bItemSubv && bItemSubv.plannedAmount > 0 && realSubv < bItemSubv.plannedAmount * 0.7) {
      alerts.push({
        type: 'info',
        title: 'Recouvrement Subventions en cours',
        message: `${realSubv.toLocaleString('fr-FR')} € perçus sur ${bItemSubv.plannedAmount.toLocaleString('fr-FR')} € attendus. Relancer les dossiers si nécessaire.`,
      });
    }
  }

  // Données pour le Graphique de Projection cumulée (Juin à Mai)
  const months = ['Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai'];
  let cumulBudgetNet = 0;
  let cumulRealNet = 0;
  const avgMonthlyNetBudget = (totalPlannedRec - totalPlannedDep) / 12;

  const projectionData = months.map((m, idx) => {
    const calMonth = idx < 7 ? idx + 6 : idx - 6;
    cumulBudgetNet += avgMonthlyNetBudget;

    const txMonth = currentYearTx.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === calMonth;
    });

    const realRec = txMonth.filter(t => t.type === 'recette' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    const realDep = txMonth.filter(t => t.type === 'depense' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    const engRec = txMonth.filter(t => t.type === 'recette' && t.status !== 'realise').reduce((s, t) => s + t.amount, 0);
    const engDep = txMonth.filter(t => t.type === 'depense' && t.status !== 'realise').reduce((s, t) => s + t.amount, 0);

    const hasRealTransactions = realRec > 0 || realDep > 0;
    if (hasRealTransactions) {
      cumulRealNet += (realRec - realDep);
    }

    return {
      month: m,
      'Budget Théorique': Math.round(cumulBudgetNet),
      'Réalisé Cumulé': hasRealTransactions ? Math.round(cumulRealNet) : null,
      'Projection Atterrissage': Math.round(cumulBudgetNet * 0.9 + (cumulRealNet || 0) * 0.1),
      recettesMois: realRec + engRec,
      depensesMois: realDep + engDep,
    };
  });

  // Données de répartition des Dépenses par pôle
  const expensePieData = data.categories
    .filter(c => c.type === 'depense')
    .map(c => {
      const amount = currentYearTx
        .filter(t => t.categoryId === c.id && t.status === 'realise')
        .reduce((s, t) => s + t.amount, 0);
      return {
        name: c.name,
        value: amount,
        color: c.color || '#C8102E',
      };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Dernières transactions saisies
  const recentTransactions = [...currentYearTx]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title & Season Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#181a22] to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-red-950/80 text-red-400 border border-red-800/40">
              {currentYear.label}
            </span>
            <span className="text-xs text-slate-400">
              Du {new Date(currentYear.startDate).toLocaleDateString('fr-FR')} au {new Date(currentYear.endDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Tableau de Bord de Pilotage
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi opérationnel en temps réel, exécution budgétaire et projection d'atterrissage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab('transactions')}
            className="px-3.5 py-2 bg-[#C8102E] hover:bg-[#a50d26] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-950/50 transition-all"
          >
            + Nouvelle Écriture
          </button>
        </div>
      </div>

      {/* 5 KPIs CARDS (Conforme Spécifications Cahier des Charges) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1 : Taux d'exécution Recettes */}
        <div className="bg-[#171922] border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Taux Recettes</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">
              {rateRec.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>{totalRealRec.toLocaleString('fr-FR')} €</span>
              <span className="text-[11px] text-slate-500">/ {totalPlannedRec.toLocaleString('fr-FR')} €</span>
            </div>
            {/* Jauge visuelle */}
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(rateRec, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] text-emerald-400/90 mt-2 font-medium">
            {rateRec >= 100 ? 'Objectif atteint' : `${(100 - rateRec).toFixed(1)}% restant à percevoir`}
          </div>
        </div>

        {/* KPI 2 : Taux d'exécution Dépenses */}
        <div className="bg-[#171922] border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Taux Dépenses</span>
            <TrendingDown className={`w-4 h-4 ${rateDep > 100 ? 'text-red-500' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-black ${rateDep > 100 ? 'text-red-400' : 'text-white'}`}>
              {rateDep.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>{totalRealDep.toLocaleString('fr-FR')} €</span>
              <span className="text-[11px] text-slate-500">/ {totalPlannedDep.toLocaleString('fr-FR')} €</span>
            </div>
            {/* Jauge visuelle avec code couleur spécifié CDC : Vert si <= 100%, Rouge si > 100% */}
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  rateDep > 100 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(rateDep, 100)}%` }}
              />
            </div>
          </div>
          <div className={`text-[10px] mt-2 font-medium ${rateDep > 100 ? 'text-red-400' : 'text-emerald-400/90'}`}>
            {rateDep > 100 ? 'Attention : Dépassement budgétaire' : 'Budget sous contrôle'}
          </div>
        </div>

        {/* KPI 3 : Solde Net Actuel */}
        <div className="bg-[#171922] border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Solde Net Actuel</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-black ${netRealBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netRealBalance >= 0 ? '+' : ''}{netRealBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Recettes réalisées − Dépenses
            </p>
          </div>
          <div className="mt-2 text-[10px] font-semibold flex items-center gap-1 text-slate-300">
            {netRealBalance >= 0 ? (
              <span className="text-emerald-400 flex items-center"><ArrowUpRight className="w-3 h-3" /> Excédent courant</span>
            ) : (
              <span className="text-red-400 flex items-center"><ArrowDownRight className="w-3 h-3" /> Déficit courant</span>
            )}
          </div>
        </div>

        {/* KPI 4 : Atterrissage Prévisionnel (Forecast) */}
        <div className="bg-[#171922] border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Atterrissage (Forecast)</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-black ${forecastLandingNet >= 0 ? 'text-purple-300' : 'text-red-400'}`}>
              {forecastLandingNet >= 0 ? '+' : ''}{forecastLandingNet.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Réalisé + Engagé / Prévu restant
            </p>
          </div>
          <div className="mt-2">
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
              forecastLandingNet >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
            }`}>
              {forecastLandingNet >= 0 ? 'Bénéfice estimé' : 'Déficit estimé'}
            </span>
          </div>
        </div>

        {/* KPI 5 : Solde Global Disponible des Comptes */}
        <div className="bg-[#171922] border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Trésorerie Globale</span>
            <Landmark className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">
              {totalBankCash.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Total comptes & caisses
            </p>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 truncate">
            {data.bankAccounts.length} comptes actifs
          </div>
        </div>
      </div>

      {/* ALERTES & SEUILS CRITIQUES */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Alertes et Seuils Critiques
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((al, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-start space-x-3 text-xs ${
                  al.type === 'danger'
                    ? 'bg-red-950/30 border-red-800/50 text-red-200'
                    : al.type === 'warning'
                    ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                    : 'bg-blue-950/30 border-blue-800/50 text-blue-200'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                  al.type === 'danger' ? 'text-red-400' : al.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                }`} />
                <div>
                  <h4 className="font-bold text-white text-[13px]">{al.title}</h4>
                  <p className="mt-0.5 opacity-90 leading-relaxed">{al.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRAPHIQUES : PROJECTION & RÉPARTITION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique de Projection (Estimation clôture exercice) */}
        <div className="lg:col-span-2 bg-[#171922] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C8102E]" />
                Graphique de Projection du Résultat & Atterrissage
              </h3>
              <p className="text-xs text-slate-400">
                Évolution cumulée mois par mois (Réalisé vs Budget théorique)
              </p>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-1 rounded">
              Saison Sportive (Sep - Août)
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={projectionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262b36" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111317', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} €`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Budget Théorique" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Réalisé Cumulé" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Projection Atterrissage" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Dépenses par Pôle */}
        <div className="bg-[#171922] border border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Répartition des Dépenses Réalisées
            </h3>
            <p className="text-xs text-slate-400">Ventilation par pôle d'activité</p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111317', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} €`, 'Montant']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Mini-légende scrollable */}
          <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs pr-1">
            {expensePieData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-bold text-white shrink-0 ml-2">
                  {item.value.toLocaleString('fr-FR')} €
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COMPTES BANCAIRES & DERNIÈRES OPÉRATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Détail par compte bancaire */}
        <div className="bg-[#171922] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-400" />
              Soldes Disponibles par Banque
            </h3>
            <button
              onClick={() => onNavigateToTab('accounts')}
              className="text-xs text-red-400 hover:text-red-300 font-bold"
            >
              Gérer les comptes →
            </button>
          </div>
          <div className="space-y-2.5">
            {bankAccountsSummary.map(acc => (
              <div
                key={acc.id}
                className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-white">{acc.name}</h4>
                  <p className="text-[11px] text-slate-400">{acc.bankName} • {acc.accountNumber || 'Sans numéro'}</p>
                </div>
                <div className="text-right">
                  <div className={`text-base font-black ${acc.currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {acc.currentBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </div>
                  <span className="text-[10px] text-slate-400">Solde calculé</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dernières Écritures */}
        <div className="bg-[#171922] border border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Dernières Écritures Saisies
            </h3>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs text-red-400 hover:text-red-300 font-bold"
            >
              Toutes les écritures →
            </button>
          </div>
          <div className="space-y-2">
            {recentTransactions.map(tx => {
              const cat = data.categories.find(c => c.id === tx.categoryId);
              return (
                <div
                  key={tx.id}
                  className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="font-bold text-white truncate">{tx.label}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{new Date(tx.date).toLocaleDateString('fr-FR')}</span>
                      <span>•</span>
                      <span className="text-slate-300">{cat?.name}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-black text-sm ${tx.type === 'recette' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'recette' ? '+' : '-'}{tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </span>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">
                      {tx.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

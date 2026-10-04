import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppData, FiscalYear } from '../types/budget';

export const ExportService = {
  // Export Excel multi-onglets complet
  exportToExcel(data: AppData, currentYear: FiscalYear) {
    const wb = XLSX.utils.book_new();

    // 1. Feuille Saisie des Écritures
    const currentYearTx = data.transactions.filter(t => t.fiscalYearId === currentYear.id);
    const txRows = currentYearTx.map(t => {
      const acc = data.bankAccounts.find(a => a.id === t.accountId);
      const cat = data.categories.find(c => c.id === t.categoryId);
      return {
        'Date': t.date,
        'Libellé': t.label,
        'Compte Bancaire': acc ? acc.name : t.accountId,
        'Pôle / Catégorie': cat ? cat.name : t.categoryId,
        'Type': t.type === 'recette' ? 'Recette' : 'Dépense',
        'Statut': t.status === 'realise' ? 'Réalisé' : t.status === 'engage' ? 'Engagé' : 'Prévu',
        'Montant (€)': t.amount,
        'Pointé / Rapproché': t.reconciled ? 'Oui' : 'Non',
        'Date Pointage': t.reconciledDate || '',
        'Réf. Pièce': t.invoiceRef || '',
        'Commentaires': t.notes || '',
      };
    });
    const wsTx = XLSX.utils.json_to_sheet(txRows);
    XLSX.utils.book_append_sheet(wb, wsTx, 'Écritures');

    // 2. Feuille Réalisation Mensuelle (Juin à Mai)
    const months = ['Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Fev', 'Mar', 'Avr', 'Mai'];
    const monthlyRecettes: Record<string, number> = {};
    const monthlyDepenses: Record<string, number> = {};

    months.forEach((m, idx) => {
      // Month indices for June to May: 6->0, 7->1, 8->2, 9->3, 10->4, 11->5, 12->6, 1->7, 2->8, 3->9, 4->10, 5->11
      const calMonth = idx < 7 ? idx + 6 : idx - 6;
      const txInMonth = currentYearTx.filter(t => {
        if (t.status !== 'realise') return false;
        const d = new Date(t.date);
        return d.getMonth() + 1 === calMonth;
      });
      monthlyRecettes[m] = txInMonth.filter(t => t.type === 'recette').reduce((s, t) => s + t.amount, 0);
      monthlyDepenses[m] = txInMonth.filter(t => t.type === 'depense').reduce((s, t) => s + t.amount, 0);
    });

    const monthlySummary = [
      {
        'Ligne': 'Recettes Réalisées (€)',
        ...monthlyRecettes,
        'Total Annuel': Object.values(monthlyRecettes).reduce((a, b) => a + b, 0),
      },
      {
        'Ligne': 'Dépenses Réalisées (€)',
        ...monthlyDepenses,
        'Total Annuel': Object.values(monthlyDepenses).reduce((a, b) => a + b, 0),
      },
      {
        'Ligne': 'Solde Net Mensuel (€)',
        ...months.reduce((acc, m) => {
          acc[m] = monthlyRecettes[m] - monthlyDepenses[m];
          return acc;
        }, {} as Record<string, number>),
        'Total Annuel': Object.values(monthlyRecettes).reduce((a, b) => a + b, 0) - Object.values(monthlyDepenses).reduce((a, b) => a + b, 0),
      },
    ];
    const wsMonthly = XLSX.utils.json_to_sheet(monthlySummary);
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Réalisation Mensuelle');

    // 3. Feuille Comptes Bancaires
    const bankSummary = data.bankAccounts.map(acc => {
      const accTx = currentYearTx.filter(t => t.accountId === acc.id);
      const realRecettes = accTx.filter(t => t.type === 'recette' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      const realDepenses = accTx.filter(t => t.type === 'depense' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      
      const transfersIn = data.transfers.filter(tr => tr.toAccountId === acc.id && tr.fiscalYearId === currentYear.id).reduce((s, tr) => s + tr.amount, 0);
      const transfersOut = data.transfers.filter(tr => tr.fromAccountId === acc.id && tr.fiscalYearId === currentYear.id).reduce((s, tr) => s + tr.amount, 0);

      const calculatedBalance = acc.initialBalance + realRecettes - realDepenses + transfersIn - transfersOut;
      const statementBalance = acc.currentStatementBalance ?? calculatedBalance;
      const ecart = calculatedBalance - statementBalance;

      return {
        'Compte': acc.name,
        'Établissement': acc.bankName,
        'N° Compte / Réf': acc.accountNumber || '',
        'Solde Initial (€)': acc.initialBalance,
        'Total Recettes Réalisées (€)': realRecettes,
        'Total Dépenses Réalisées (€)': realDepenses,
        'Virements Reçus (€)': transfersIn,
        'Virements Émis (€)': transfersOut,
        'Solde Comptable Calculé (€)': calculatedBalance,
        'Dernier Solde Relevé Bancaire (€)': statementBalance,
        'Écart de Rapprochement (€)': ecart,
      };
    });
    const wsBank = XLSX.utils.json_to_sheet(bankSummary);
    XLSX.utils.book_append_sheet(wb, wsBank, 'Comptes Bancaires');

    // 4. Feuille Compte de Résultat
    const incomeRows: any[] = [];
    incomeRows.push({ 'Catégorie / Pôle': '--- PRODUITS (RECETTES) ---', 'Type': 'PRODUITS', 'Budget Validé (€)': '', 'Réalisé (€)': '', 'Écart (€)': '', 'Taux (%)': '' });
    
    let totalPlannedRec = 0;
    let totalRealRec = 0;
    data.categories.filter(c => c.type === 'recette').forEach(cat => {
      const bItem = data.budgetItems.find(b => b.fiscalYearId === currentYear.id && b.categoryId === cat.id);
      const planned = bItem ? bItem.plannedAmount : 0;
      const real = currentYearTx.filter(t => t.categoryId === cat.id && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      totalPlannedRec += planned;
      totalRealRec += real;
      incomeRows.push({
        'Catégorie / Pôle': cat.name,
        'Type': 'Recette',
        'Budget Validé (€)': planned,
        'Réalisé (€)': real,
        'Écart (€)': real - planned,
        'Taux (%)': planned > 0 ? `${((real / planned) * 100).toFixed(1)}%` : '-',
      });
    });
    incomeRows.push({
      'Catégorie / Pôle': 'SOUS-TOTAL PRODUITS',
      'Type': 'TOTAL',
      'Budget Validé (€)': totalPlannedRec,
      'Réalisé (€)': totalRealRec,
      'Écart (€)': totalRealRec - totalPlannedRec,
      'Taux (%)': totalPlannedRec > 0 ? `${((totalRealRec / totalPlannedRec) * 100).toFixed(1)}%` : '-',
    });

    incomeRows.push({ 'Catégorie / Pôle': '--- CHARGES (DÉPENSES) ---', 'Type': 'CHARGES', 'Budget Validé (€)': '', 'Réalisé (€)': '', 'Écart (€)': '', 'Taux (%)': '' });
    let totalPlannedDep = 0;
    let totalRealDep = 0;
    data.categories.filter(c => c.type === 'depense').forEach(cat => {
      const bItem = data.budgetItems.find(b => b.fiscalYearId === currentYear.id && b.categoryId === cat.id);
      const planned = bItem ? bItem.plannedAmount : 0;
      const real = currentYearTx.filter(t => t.categoryId === cat.id && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      totalPlannedDep += planned;
      totalRealDep += real;
      incomeRows.push({
        'Catégorie / Pôle': cat.name,
        'Type': 'Dépense',
        'Budget Validé (€)': planned,
        'Réalisé (€)': real,
        'Écart (€)': planned - real,
        'Taux (%)': planned > 0 ? `${((real / planned) * 100).toFixed(1)}%` : '-',
      });
    });
    incomeRows.push({
      'Catégorie / Pôle': 'SOUS-TOTAL CHARGES',
      'Type': 'TOTAL',
      'Budget Validé (€)': totalPlannedDep,
      'Réalisé (€)': totalRealDep,
      'Écart (€)': totalPlannedDep - totalRealDep,
      'Taux (%)': totalPlannedDep > 0 ? `${((totalRealDep / totalPlannedDep) * 100).toFixed(1)}%` : '-',
    });

    incomeRows.push({
      'Catégorie / Pôle': 'RÉSULTAT NET DE L’EXERCICE (EXCÉDENT / DÉFICIT)',
      'Type': 'RÉSULTAT',
      'Budget Validé (€)': totalPlannedRec - totalPlannedDep,
      'Réalisé (€)': totalRealRec - totalRealDep,
      'Écart (€)': (totalRealRec - totalRealDep) - (totalPlannedRec - totalPlannedDep),
      'Taux (%)': '-',
    });
    const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Compte de Résultat');

    // 5. Feuille Budget Prévisionnel & Scénarios
    const budgetRows = data.categories.map(cat => {
      const bItem = data.budgetItems.find(b => b.fiscalYearId === currentYear.id && b.categoryId === cat.id);
      const planned = bItem ? bItem.plannedAmount : 0;
      const real = currentYearTx.filter(t => t.categoryId === cat.id && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      
      const optMult = cat.type === 'recette' ? 1.08 : 0.97;
      const pessMult = cat.type === 'recette' ? 0.92 : 1.06;

      return {
        'Pôle': cat.name,
        'Type': cat.type === 'recette' ? 'Recette' : 'Dépense',
        'Budget Validé N (€)': planned,
        'Réalisé N (€)': real,
        'Scénario Neutre (€)': planned,
        'Scénario Optimiste (€)': Math.round(planned * optMult),
        'Scénario Pessimiste (€)': Math.round(planned * pessMult),
        'Commentaires': bItem?.notes || '',
      };
    });
    const wsBudget = XLSX.utils.json_to_sheet(budgetRows);
    XLSX.utils.book_append_sheet(wb, wsBudget, 'Budget Prévisionnel');

    // Trigger download
    const fileName = `Budget_Bouchemaine_Basket_${currentYear.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  },

  // Export PDF A4 Format Officiel (Rapport d'AG & Bilan Financier)
  exportToPdf(data: AppData, currentYear: FiscalYear) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const currentYearTx = data.transactions.filter(t => t.fiscalYearId === currentYear.id);

    // Calculs financiers
    const totalPlannedRec = data.budgetItems
      .filter(b => b.fiscalYearId === currentYear.id && data.categories.find(c => c.id === b.categoryId)?.type === 'recette')
      .reduce((s, b) => s + b.plannedAmount, 0);
    const totalPlannedDep = data.budgetItems
      .filter(b => b.fiscalYearId === currentYear.id && data.categories.find(c => c.id === b.categoryId)?.type === 'depense')
      .reduce((s, b) => s + b.plannedAmount, 0);

    const totalRealRec = currentYearTx.filter(t => t.type === 'recette' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    const totalRealDep = currentYearTx.filter(t => t.type === 'depense' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
    const netRealResult = totalRealRec - totalRealDep;

    const remainingPlannedRec = currentYearTx.filter(t => t.type === 'recette' && (t.status === 'engage' || t.status === 'prevu')).reduce((s, t) => s + t.amount, 0);
    const remainingPlannedDep = currentYearTx.filter(t => t.type === 'depense' && (t.status === 'engage' || t.status === 'prevu')).reduce((s, t) => s + t.amount, 0);
    const forecastRec = totalRealRec + remainingPlannedRec;
    const forecastDep = totalRealDep + remainingPlannedDep;
    const forecastLanding = forecastRec - forecastDep;

    // Header Color Band (Club Red #C8102E)
    doc.setFillColor(200, 16, 46);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Title & Club Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('BOUCHEMAINE BASKET CLUB', 14, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rapport Financier & Exécution Budgétaire — ${currentYear.label}`, 14, 19);
    doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 19, { align: 'right' });

    // Section 1: KPIs Cards
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('1. Synthèse Opérationnelle & Indicateurs Clés (KPIs)', 14, 38);

    const startY = 43;
    const cardW = 42;
    const cardH = 22;
    const gap = 3;

    // Card 1: Recettes
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('RECETTES RÉALISÉES', 17, startY + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${totalRealRec.toLocaleString('fr-FR')} €`, 17, startY + 13);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Taux: ${totalPlannedRec > 0 ? ((totalRealRec / totalPlannedRec) * 100).toFixed(1) : 0}% / ${totalPlannedRec.toLocaleString('fr-FR')} €`, 17, startY + 19);

    // Card 2: Dépenses
    doc.roundedRect(14 + cardW + gap, startY, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.text('DÉPENSES RÉALISÉES', 17 + cardW + gap, startY + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 16, 46);
    doc.text(`${totalRealDep.toLocaleString('fr-FR')} €`, 17 + cardW + gap, startY + 13);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Taux: ${totalPlannedDep > 0 ? ((totalRealDep / totalPlannedDep) * 100).toFixed(1) : 0}% / ${totalPlannedDep.toLocaleString('fr-FR')} €`, 17 + cardW + gap, startY + 19);

    // Card 3: Solde Net Actuel
    doc.roundedRect(14 + (cardW + gap) * 2, startY, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.text('SOLDE NET ACTUEL', 17 + (cardW + gap) * 2, startY + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(netRealResult >= 0 ? 16 : 220, netRealResult >= 0 ? 185 : 38, netRealResult >= 0 ? 129 : 38);
    doc.text(`${netRealResult >= 0 ? '+' : ''}${netRealResult.toLocaleString('fr-FR')} €`, 17 + (cardW + gap) * 2, startY + 13);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(netRealResult >= 0 ? 'Excédent d\'étape' : 'Déficit d\'étape', 17 + (cardW + gap) * 2, startY + 19);

    // Card 4: Atterrissage Estimé
    doc.roundedRect(14 + (cardW + gap) * 3, startY, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.text('ATTERRISSAGE (FORECAST)', 17 + (cardW + gap) * 3, startY + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(forecastLanding >= 0 ? 16 : 220, forecastLanding >= 0 ? 185 : 38, forecastLanding >= 0 ? 129 : 38);
    doc.text(`${forecastLanding >= 0 ? '+' : ''}${forecastLanding.toLocaleString('fr-FR')} €`, 17 + (cardW + gap) * 3, startY + 13);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Prévu fin d'exercice`, 17 + (cardW + gap) * 3, startY + 19);

    // Section 2: Compte de Résultat Associatif
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('2. Compte de Résultat Synthétique (Plan Comptable Associatif)', 14, 75);

    const tableData: any[] = [];
    
    // Produits
    tableData.push([{ content: 'PRODUITS D\'EXPLOITATION (RECETTES)', colSpan: 5, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [15, 23, 42] } }]);
    data.categories.filter(c => c.type === 'recette').forEach(cat => {
      const bItem = data.budgetItems.find(b => b.fiscalYearId === currentYear.id && b.categoryId === cat.id);
      const planned = bItem ? bItem.plannedAmount : 0;
      const real = currentYearTx.filter(t => t.categoryId === cat.id && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      const diff = real - planned;
      const pct = planned > 0 ? `${((real / planned) * 100).toFixed(0)}%` : '-';
      tableData.push([cat.name, `${planned.toLocaleString('fr-FR')} €`, `${real.toLocaleString('fr-FR')} €`, `${diff >= 0 ? '+' : ''}${diff.toLocaleString('fr-FR')} €`, pct]);
    });
    tableData.push([
      { content: 'TOTAL PRODUITS', styles: { fontStyle: 'bold' } },
      `${totalPlannedRec.toLocaleString('fr-FR')} €`,
      `${totalRealRec.toLocaleString('fr-FR')} €`,
      `${(totalRealRec - totalPlannedRec >= 0 ? '+' : '')}${(totalRealRec - totalPlannedRec).toLocaleString('fr-FR')} €`,
      `${totalPlannedRec > 0 ? ((totalRealRec / totalPlannedRec) * 100).toFixed(1) : 0}%`,
    ]);

    // Charges
    tableData.push([{ content: 'CHARGES D\'EXPLOITATION (DÉPENSES)', colSpan: 5, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [15, 23, 42] } }]);
    data.categories.filter(c => c.type === 'depense').forEach(cat => {
      const bItem = data.budgetItems.find(b => b.fiscalYearId === currentYear.id && b.categoryId === cat.id);
      const planned = bItem ? bItem.plannedAmount : 0;
      const real = currentYearTx.filter(t => t.categoryId === cat.id && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      const diff = planned - real;
      const pct = planned > 0 ? `${((real / planned) * 100).toFixed(0)}%` : '-';
      tableData.push([cat.name, `${planned.toLocaleString('fr-FR')} €`, `${real.toLocaleString('fr-FR')} €`, `${diff >= 0 ? '+' : ''}${diff.toLocaleString('fr-FR')} €`, pct]);
    });
    tableData.push([
      { content: 'TOTAL CHARGES', styles: { fontStyle: 'bold' } },
      `${totalPlannedDep.toLocaleString('fr-FR')} €`,
      `${totalRealDep.toLocaleString('fr-FR')} €`,
      `${(totalPlannedDep - totalRealDep >= 0 ? '+' : '')}${(totalPlannedDep - totalRealDep).toLocaleString('fr-FR')} €`,
      `${totalPlannedDep > 0 ? ((totalRealDep / totalPlannedDep) * 100).toFixed(1) : 0}%`,
    ]);

    // Net Result
    tableData.push([
      { content: 'RÉSULTAT NET COMPTABLE (EXCÉDENT / DÉFICIT)', styles: { fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [185, 28, 28] } },
      `${(totalPlannedRec - totalPlannedDep).toLocaleString('fr-FR')} €`,
      `${netRealResult.toLocaleString('fr-FR')} €`,
      `${(netRealResult - (totalPlannedRec - totalPlannedDep)).toLocaleString('fr-FR')} €`,
      '-',
    ]);

    autoTable(doc, {
      startY: 79,
      head: [['Poste / Pôle Comptable', 'Budget Prévu', 'Réalisé N', 'Écart', 'Taux (%)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [200, 16, 46], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'right', cellWidth: 26 },
        2: { halign: 'right', cellWidth: 26 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 24 },
      },
    });

    // Section 3: Trésorerie & Comptes Bancaires
    let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 190;
    
    // Add page if needed
    if (finalY > 230) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('3. Trésorerie & Comptes Bancaires', 14, finalY);

    const bankTableData = data.bankAccounts.map(acc => {
      const accTx = currentYearTx.filter(t => t.accountId === acc.id);
      const realRec = accTx.filter(t => t.type === 'recette' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      const realDep = accTx.filter(t => t.type === 'depense' && t.status === 'realise').reduce((s, t) => s + t.amount, 0);
      const transfersIn = data.transfers.filter(tr => tr.toAccountId === acc.id && tr.fiscalYearId === currentYear.id).reduce((s, tr) => s + tr.amount, 0);
      const transfersOut = data.transfers.filter(tr => tr.fromAccountId === acc.id && tr.fiscalYearId === currentYear.id).reduce((s, tr) => s + tr.amount, 0);
      const balance = acc.initialBalance + realRec - realDep + transfersIn - transfersOut;
      return [
        acc.name,
        acc.bankName,
        `${acc.initialBalance.toLocaleString('fr-FR')} €`,
        `${balance.toLocaleString('fr-FR')} €`,
        `${(acc.currentStatementBalance ?? balance).toLocaleString('fr-FR')} €`,
      ];
    });

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Compte', 'Établissement', 'Solde Initial', 'Solde Comptable', 'Solde Relevé Réel']],
      body: bankTableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8.5 },
      styles: { fontSize: 7.5, cellPadding: 2 },
    });

    // Section 4: Notes et Commentaires du Trésorier pour l'Assemblée Générale
    let notesY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 240;
    if (notesY > 240) {
      doc.addPage();
      notesY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('4. Rapport & Commentaires du Trésorier pour l\'Assemblée Générale', 14, notesY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(
      currentYear.treasurerNotes || 'Aucun commentaire renseigné pour cet exercice.',
      pageWidth - 28
    );
    doc.text(splitNotes, 14, notesY + 6);

    // Footer on all pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Bouchemaine Basket Club — Document officiel généré par l'application Standalone — Page ${i} sur ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    // Save PDF
    const pdfName = `Rapport_Financier_BBC_${currentYear.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(pdfName);
  },
};

// Mappage officiel Plan Comptable Associatif (Règlement ANC 2018-06)
// Numéros de comptes de Produits (Classe 7) et de Charges (Classe 6)

export const CATEGORY_ACCOUNT_CODES: Record<string, string> = {
  // === RECETTES (Classe 7 - Produits) ===
  'cat-recette-ventes-de-marchandises': '707',
  'cat-recette-produits-des-activites-annexes': '708',
  'cat-recette-prestations-de-services': '706',
  'cat-recette-production-immobilisee': '72',
  'cat-recette-subventions-d-exploitation': '74',
  'cat-recette-reprises-sur-provisions-et-amortissements': '781',
  'cat-recette-transferts-de-charges': '791',
  'cat-recette-autres-produits': '75',
  'cat-recette-produits-financiers': '76',
  'cat-recette-d-autres-valeurs-mobilieres-et-creances-de-l-actif-immobilise': '762',
  'cat-recette-autres-interets-et-produits-assimiles': '764',
  'cat-recette-reprises-sur-provisions-et-transfers-de-charges-financieres': '786',
  'cat-recette-differences-positives-de-change': '766',
  'cat-recette-produits-nets-sur-cessions-de-valeurs-mobilieres-de-placement': '767',
  'cat-recette-sur-operations-de-gestion': '771',
  'cat-recette-autres-charges-de-gestion-courante': '758',
  'cat-recette-non-categorise': '799',

  // Nomenclatures d'exemples par défaut
  'cat-rec-cotis': '756',
  'cat-rec-subv': '74',
  'cat-rec-spons': '77',
  'cat-rec-buvette': '707',
  'cat-rec-events': '708',
  'cat-rec-boutique': '707',
  'cat-rec-divers': '758',

  // === DÉPENSES (Classe 6 - Charges) ===
  'cat-depense-achats-de-marchandises': '607',
  'cat-depense-achats-stockes-d-approvisionnements': '602',
  'cat-depense-achats-non-stockes-de-matieres-et-fournitures': '606',
  'cat-depense-services-exterieurs': '61',
  'cat-depense-autres-services-exterieurs': '62',
  'cat-depense-impots-taxes-et-versements-assimiles': '63',
  'cat-depense-charges-de-personnel': '64',
  'cat-depense-autres-charges-de-gestion-courante': '65',
  'cat-depense-variation-des-stocks-de-marchandises': '6037',
  'cat-depense-variation-des-stocks-d-approvisionnements': '6032',
  'cat-depense-achats-de-sous-traitances': '604',
  'cat-depense-autres': '658',

  // Nomenclatures d'exemples par défaut
  'cat-dep-ffbb': '65',
  'cat-dep-arbitrage': '62',
  'cat-dep-materiel': '606',
  'cat-dep-maillots': '606',
  'cat-dep-coaching': '64',
  'cat-dep-deplacements': '62',
  'cat-dep-buvette': '607',
  'cat-dep-bancaires': '627',
  'cat-dep-com': '62',
  'cat-dep-divers': '658',
};

/**
 * Récupère le numéro de compte comptable pour une catégorie.
 */
export function getCategoryCode(cat: {
  id: string;
  name?: string;
  type?: string;
  code?: string;
}): string {
  if (cat.code) return cat.code;
  if (CATEGORY_ACCOUNT_CODES[cat.id]) return CATEGORY_ACCOUNT_CODES[cat.id];

  const n = (cat.name || '').toLowerCase();
  const isRec = cat.type === 'recette';

  if (isRec) {
    if (n.includes('marchandise') || n.includes('bar') || n.includes('boutique')) return '707';
    if (n.includes('annexe') || n.includes('tournoi') || n.includes('soirée') || n.includes('animation')) return '708';
    if (n.includes('prestation') || n.includes('stage')) return '706';
    if (n.includes('subvention') || n.includes('mairie') || n.includes('ans') || n.includes('collectiv')) return '74';
    if (n.includes('cotisation') || n.includes('licence') || n.includes('adhesion')) return '756';
    if (n.includes('sponsor') || n.includes('mecenat') || n.includes('partenariat')) return '77';
    if (n.includes('financier') || n.includes('interet')) return '76';
    if (n.includes('provision') || n.includes('amortissement')) return '781';
    if (n.includes('transfert')) return '791';
    return '75';
  } else {
    if (n.includes('marchandise')) return '607';
    if (n.includes('approvisionnement')) return '602';
    if (n.includes('matiere') || n.includes('fourniture') || n.includes('ballon') || n.includes('maillot') || n.includes('materiel')) return '606';
    if (n.includes('personnel') || n.includes('salaire') || n.includes('coaching') || n.includes('entraineur')) return '64';
    if (n.includes('arbitrage') || n.includes('deplacement') || n.includes('transport') || n.includes('assurance') || n.includes('bancaire')) return '62';
    if (n.includes('service exterieur')) return '61';
    if (n.includes('impot') || n.includes('taxe')) return '63';
    if (n.includes('licence') || n.includes('ffbb') || n.includes('comite') || n.includes('gestion courante')) return '65';
    if (n.includes('stock')) return '603';
    if (n.includes('sous-traitance')) return '604';
    return '658';
  }
}

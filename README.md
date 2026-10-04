# BBC49 Budget — Bouchemaine Basket Club

Application autonome de **suivi, pilotage et prévision budgétaire** pour le club de basket de Bouchemaine (BBC49), prête pour le déploiement sur serveur **Debian via Docker & Portainer** ou en local sur PC.

---

## 🏀 Fonctionnalités Clés

- **Tableau de Bord Central (KPIs)** : Taux d'exécution Recettes & Dépenses, solde bancaire global disponible, atterrissage prévisionnel (forecast) et alertes de seuils.
- **Saisie des Données & Rapprochement** : Journal de trésorerie avec catégories, comptes impactés, statuts (prévu, engagé, réalisé) et import direct de relevés bancaires (format Excel/CSV avec catégorisation assistée).
- **Réalisation Mensuelle** : Suivi mois par mois (Saison sportive de juin à mai / Janvier à Décembre) avec comparatif Réalisé vs Prévisionnel.
- **Gestion des Comptes Bancaires** : Suivi des soldes (Compte Courant Crédit Agricole, Caisse Espèces / Buvette, Livret A), ajout/suppression de comptes et rapprochement bancaire.
- **Mode Assemblée Générale (AG)** : Présentation synthétique grand format, camemberts de répartition par pôle et annotations pour les adhérents.
- **Compte de Résultat Associatif** : Présentation normalisée Plan Comptable Associatif (N-1, Budget Validé, Réalisé N, Écarts en € et %) avec **numéros de comptes officiels (classes 6 et 7)** et **colonne de commentaires**.
- **Budget Prévisionnel & Simulateur de Scénarios** : Matrice côte-à-côte (Neutre, Optimiste, Pessimiste) avec sliders de projection et édition rapide du budget global.
- **Exports Officiels** : Export du Bilan & Rapport d'AG en **PDF A4** et export complet en classeur **Excel multi-onglets**.

---

## 🚀 Déploiement sur Serveur Debian via Portainer

L'application est conteneurisée avec un **serveur web Node.js/Express ultra-léger** servant l'interface React et exposant une API REST sécurisée pour la persistance des données.

### Méthode 1 : Déploiement en 1 Clic via Portainer (Recommandé)

1. **Pousser ce projet sur votre GitHub** :
   ```bash
   git remote add origin https://github.com/<votre-identifiant>/bbc49-budget.git
   git branch -M main
   git push -u origin main
   ```

2. **Dans l'interface web de Portainer** :
   - Allez dans votre environnement (ex: `local`).
   - Cliquez sur **Stacks** dans le menu de gauche, puis sur **+ Add stack**.
   - Choisissez la méthode : **Repository**.
   - Renseignez les paramètres :
     - **Name** : `bbc49-budget`
     - **Repository URL** : `https://github.com/<votre-identifiant>/bbc49-budget`
     - **Repository reference** : `refs/heads/main`
     - **Compose path** : `docker-compose.yml`
   - *(Optionnel)* Activez **Automatic updates** (Polling ou Webhook) si vous souhaitez que Portainer redéploie automatiquement à chaque `git push`.
   - Cliquez sur **Deploy the stack** en bas de page.

3. **Accès à l'application** :
   - Rendez-vous sur `http://<IP-DE-VOTRE-SERVEUR-DEBIAN>:3000`.

---

### Méthode 2 : Déploiement en ligne de commande (CLI Debian)

Connectez-vous en SSH sur votre serveur Debian :

```bash
# Cloner le dépôt
git clone https://github.com/<votre-identifiant>/bbc49-budget.git
cd bbc49-budget

# Lancer la pile Docker Compose en arrière-plan
docker compose up -d --build
```

Pour vérifier que le conteneur tourne bien :
```bash
docker compose ps
docker compose logs -f
```

---

## 💾 Persistance des Données & Sauvegardes

Le fichier de données principal est stocké dans un volume Docker monté sur l'hôte Debian :
- **Fichier de données actif** : `./data/donnees_budget.json` (monté sur `/app/data/donnees_budget.json` dans le conteneur).
- **Sauvegardes automatiques** : `./data/backups/donnees_budget_YYYYMMDD_HHMMSS.json`.
  * Chaque modification enregistrée depuis l'interface déclenche automatiquement la création d'une archive de sécurité horodatée (jusqu'à 50 versions conservées).
  * L'écriture est atomique (fichier temporaire + renommage) pour éviter tout risque de corruption lors d'un redémarrage.
- **Restauration** : Vous pouvez restaurer ou exporter une copie JSON à tout moment via le menu **Données ▼** du Header.

---

## 🔒 Configuration Reverse Proxy (HTTPS / Domaine personnalisé)

Si vous utilisez **Nginx Proxy Manager**, **Traefik**, **Caddy** ou **Apache** sur votre Debian :
- Pointez votre sous-domaine (ex: `budget.basket-bouchemaine.fr`) vers le conteneur sur le port `3000`.
- Activez le certificat SSL Let's Encrypt.
- Aucune configuration supplémentaire n'est requise.

---

## 💻 Développement & Utilisation Locale

### Lancement en mode développement
```bash
npm install
npm run dev
# Interface accessible sur http://localhost:5173
```

### Lancement du serveur Node local
```bash
npm run build
npm start
# Application accessible sur http://localhost:3000
```

### Mode Standalone Desktop (Windows)
```bash
npm run electron
```

---

## 📦 Structure du Projet

```
bbc49-budget/
├── Dockerfile                  # Construction multi-stage optimisée (Alpine)
├── docker-compose.yml          # Déploiement Portainer avec volume persistant
├── .dockerignore               # Exclusion des dépendances et caches
├── .gitignore                  # Fichiers ignorés par Git
├── server/
│   └── index.js                # Serveur Express API REST & fichiers statiques
├── data/
│   ├── donnees_budget.json     # Base de données active (154 transactions, budget 84 500 €)
│   └── backups/                # Dossier des sauvegardes automatiques horodatées
├── data_seed/
│   └── donnees_budget.json     # Graine de secours pour initialiser un volume vide
├── src/
│   ├── components/             # Composants d'interface (Dashboard, Saisie, AG, etc.)
│   ├── services/
│   │   ├── storage.ts          # Détection automatique : Serveur Docker / Electron / Local
│   │   └── exportService.ts    # Génération PDF & classeurs Excel
│   ├── types/                  # Modèles de données TypeScript
│   └── utils/                  # Plan Comptable Associatif & helpers
└── public/
    └── logo.jpg                # Logo officiel Bouchemaine Basket Club
```

---

**Bouchemaine Basket Club (BBC49)** — Conçu pour une gestion saine, portable et pérenne de la trésorerie associative.

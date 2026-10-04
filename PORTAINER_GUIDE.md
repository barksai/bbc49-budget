# Guide de Déploiement Portainer sur Serveur Debian — BBC49 Budget

Ce guide détaille pas à pas l'installation et le déploiement continu de l'application **BBC49 Budget** sur votre serveur Debian équipé de **Portainer**, directement connecté à votre dépôt **GitHub**.

---

## 📋 Prérequis

1. Un serveur Debian avec **Docker** et **Portainer** opérationnels.
2. Un compte **GitHub** avec le code du projet poussé sur un dépôt (ex: `https://github.com/votre-compte/bbc49-budget`).
3. Port `3000` (ou tout autre port de votre choix) disponible sur le serveur.

---

## Étape 1 : Pousser votre projet sur GitHub

Depuis le dossier `C:\Users\pierre\.gemini\antigravity\scratch\bbc49-budget` sur votre machine :

```bash
# 1. Initialiser le dépôt git (si ce n'est pas déjà fait)
git init
git add .
git commit -m "Initial commit BBC49 Budget - Prêt pour Docker et Portainer"

# 2. Relier à votre dépôt GitHub distant
git remote add origin https://github.com/<votre-nom-utilisateur>/<votre-depot>.git
git branch -M main

# 3. Pousser le code
git push -u origin main
```

> **Note si votre dépôt est privé** :
> Générez un **Personal Access Token (classic)** sur GitHub (`Settings` > `Developer settings` > `Personal access tokens`) avec les droits `repo:read`. Vous le fournirez dans Portainer comme mot de passe.

---

## Étape 2 : Créer la Stack dans Portainer

1. Connectez-vous à votre interface Portainer (ex: `https://ip-serveur:9443`).
2. Cliquez sur votre environnement (généralement nommé **local**).
3. Dans la barre de navigation latérale gauche, cliquez sur **Stacks**.
4. Cliquez sur le bouton bleu en haut à droite **+ Add stack**.

### Configuration de la Stack :
- **Name** : `bbc49-budget`
- **Build method** : Cliquez sur l'onglet **Repository** (avec l'icône GitHub/Git).

Remplissez les champs comme suit :
| Champ | Valeur recommandée | Explication |
|---|---|---|
| **Repository URL** | `https://github.com/<utilisateur>/<depot>.git` | L'URL HTTPS de votre dépôt GitHub |
| **Repository reference** | `refs/heads/main` (ou `main`) | La branche principale à déployer |
| **Compose path** | `docker-compose.yml` | Emplacement du fichier compose dans le repo |
| **Authentication** | À cocher si le repo est **Privé** | Entrez votre Username GitHub et votre Personal Access Token |

---

## Étape 3 : Automatisation des Mises à Jour (Optionnel mais recommandé)

Sous la section **Automatic updates** dans Portainer :
- **Mechanism** : Sélectionnez **Webhook** ou **Polling**.
  * Si vous choisissez **Webhook** : Portainer vous génère une URL unique. Copiez-la et collez-la dans les **Webhooks** de votre dépôt GitHub (`Settings` > `Webhooks` > `Payload URL`). Chaque fois que vous ferez un `git push`, Portainer reconstruira et redéploiera le conteneur automatiquement !
  * Si vous choisissez **Polling** : Vous pouvez définir un intervalle (ex: toutes les 5 minutes) où Portainer vérifie s'il y a un nouveau commit.

---

## Étape 4 : Déployer la Stack

1. Cliquez sur le bouton bleu **Deploy the stack** en bas de page.
2. Portainer va cloner le dépôt GitHub, lancer le build multi-stage Docker (compilation Vite + package Node.js Alpine) et démarrer le conteneur.
3. Après 1 à 2 minutes, le statut passera à **running** avec un indicateur vert.

---

## Étape 5 : Accéder à l'Application

Ouvrez votre navigateur web et accédez à :
```
http://<IP_DE_VOTRE_SERVEUR_DEBIAN>:3000
```

Dans la barre latérale gauche de l'application, vous observerez le badge :
`Serveur Debian (Portainer)` avec le voyant vert `DOCKER`.

---

## 💾 Où se trouvent vos données sur le serveur Debian ?

Le fichier `docker-compose.yml` monte le volume `./data:/app/data`.
Sur votre serveur Debian, les données sont situées directement dans le sous-dossier `data/` de la stack Portainer (généralement dans `/data/compose/<stack-id>/data` ou dans le dossier où se trouve le compose).

- **Base de données active** : `donnees_budget.json` (contient l'intégralité des écritures, soldes et budgets).
- **Sauvegardes automatiques** : `data/backups/donnees_budget_YYYYMMDD_HHMMSS.json`.

### Comment faire une sauvegarde manuelle sur Debian :
```bash
# Exemple pour copier le fichier de données vers un dossier de sauvegarde :
cp /chemin/vers/stack/data/donnees_budget.json /home/utilisateur/sauvegarde_budget_$(date +%Y%m%d).json
```
Vous pouvez également télécharger un fichier JSON directement depuis l'interface web de l'application via le menu **Données ▼ > Télécharger copie JSON**.

---

## 🔄 En cas de mise à jour manuelle ou de problème

Si vous souhaitez forcer la reconstruction du conteneur dans Portainer :
1. Allez dans **Stacks** > **bbc49-budget**.
2. Cliquez sur l'onglet **Editor**.
3. Cliquez sur **Update the stack**.
4. Cochez **Re-pull image and redeploy**.
5. Validez avec **Update**.

# ==========================================
# 1. Étape de Build (Node 20 Alpine)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des fichiers de configuration des dépendances
COPY package.json package-lock.json* ./

# Installation complète pour compilation Vite
RUN npm install

# Copie des fichiers sources et de configuration
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.cjs postcss.config.cjs ./
COPY public ./public
COPY src ./src

# Compilation de l'interface React / Vite
RUN npm run build

# ==========================================
# 2. Étape d'Exécution Production
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Copie et installation uniquement des dépendances d'exécution
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Copie du serveur Node.js / Express
COPY server ./server

# Copie de la base initiale comme modèle de secours
COPY data ./data_seed

# Copie du build statique compilé
COPY --from=builder /app/dist ./dist

# Création du dossier de données
RUN mkdir -p /app/data /app/data/backups

# Point de montage persistant pour le volume Docker
VOLUME ["/app/data"]

# Exposition du port
EXPOSE 3000

# Vérification de santé (Healthcheck Docker)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/status || exit 1

# Lancement de l'application
CMD ["node", "server/index.js"]

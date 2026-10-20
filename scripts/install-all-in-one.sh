#!/usr/bin/env bash
# ==============================================================================
# SCRIPT TOUT-EN-UN D'INSTALLATION - NDM TEAMS MANAGER
# Établissement : Ensemble Scolaire Notre-Dame des Missions
# Environnement cible : LXC Proxmox Debian 12 (avec Docker & Node.js/npm)
# Répertoire d'installation recommandé : /opt/ndm-teams-manager
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${GREEN}   NDM TEAMS MANAGER - INSTALLATION TOUT-EN-UN POUR PROXMOX LXC DEBIAN 12   ${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# Vérifier si l'utilisateur est root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERREUR] Veuillez exécuter ce script en tant que root (sudo su)${NC}"
  exit 1
fi

APP_DIR="/opt/ndm-teams-manager"
echo -e "${YELLOW}>> Répertoire de travail : ${APP_DIR}${NC}"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo -e "\n${BLUE}[1/5] Mise à jour des paquets Debian 12...${NC}"
apt-get update -y
apt-get install -y curl wget git rsync ca-certificates gnupg lsb-release build-essential

echo -e "\n${BLUE}[2/5] Vérification et installation de Node.js 22 LTS & npm...${NC}"
if ! command -v node &> /dev/null; then
  echo "Installation de Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  echo "Node.js est déjà installé : $(node -v)"
fi
echo "NPM Version : $(npm -v)"

echo -e "\n${BLUE}[3/5] Vérification et installation de Docker & Compose (pour Proxmox LXC)...${NC}"
if ! command -v docker &> /dev/null; then
  echo "Installation de Docker CE..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "Docker est déjà installé : $(docker -v)"
fi

echo -e "\n${BLUE}[4/5] Installation des dépendances du projet et compilation...${NC}"
if [ -f "package.json" ]; then
  npm install --legacy-peer-deps || npm install
  npm run build
else
  echo -e "${YELLOW}[ATTENTION] Le fichier package.json n'est pas encore présent dans ${APP_DIR}.${NC}"
  echo -e "${YELLOW}Déposez les fichiers de l'application via FileZilla dans ${APP_DIR} puis relancez ce script.${NC}"
fi

echo -e "\n${BLUE}[5/5] Création et activation du service Systemd 'ndm-teams.service'...${NC}"
cat << 'EOF' > /etc/systemd/system/ndm-teams.service
[Unit]
Description=NDM Teams Manager - Service Automatisé Microsoft Teams M365
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ndm-teams-manager
ExecStart=/bin/bash -c "PATH=$PATH:/usr/local/bin:/usr/bin npm start"
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=-/opt/ndm-teams-manager/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ndm-teams.service
if [ -f "package.json" ]; then
  systemctl restart ndm-teams.service
fi

# Génération systématique du README.md à jour si absent
if [ ! -f "/opt/ndm-teams-manager/README.md" ]; then
cat << 'README_EOF' > /opt/ndm-teams-manager/README.md
# NDM Teams Manager — Gestion Automatique des Équipes Microsoft Teams

**Établissement :** Ensemble Scolaire Notre-Dame des Missions  
**Périmètre :** Collège (24 classes) & Lycée (13 classes) — Total : 37 classes  
**Source Utilisateurs :** 100% Réel Microsoft Entra ID, import de rentrée depuis l'export Charlemagne (Aplim)  
**Architecture :** 100% Serveur (Node.js/Express + Vite SPA), Zéro Cache Navigateur, Adapté iFrame & Mobile  
**Cible :** Conteneur LXC Proxmox Debian 12 (avec Docker & npm)  

---

## 🚀 1. Déploiement via FileZilla (SFTP)

1. Connectez-vous via **FileZilla** à votre conteneur **LXC Proxmox Debian 12** :
   * **Hôte :** `<IP_DE_VOTRE_CONTENEUR_LXC>`
   * **Port :** `22`
   * **Protocole :** SFTP
   * **Utilisateur :** `root`
   * **Répertoire distant cible :**
     ```text
     /opt/ndm-teams-manager/
     ```

2. Glissez-déposez tous les fichiers du projet dans `/opt/ndm-teams-manager/`.

3. Dans la console ou terminal Proxmox du conteneur LXC, exécutez le script tout-en-un :
   ```bash
   cd /opt/ndm-teams-manager
   chmod +x scripts/install-all-in-one.sh
   ./scripts/install-all-in-one.sh
   ```

---

## 🔑 2. Identifiants Microsoft 365 / Entra ID configurés

* **Tenant ID :** `55b01275-e53b-4146-94a3-cb58e71ec7bf`
* **Client ID :** `1b4e3135-da49-4e36-9d17-d15d3ab497d3`
* **Client Secret :** _voir `/opt/ndm-teams-manager/.env` (jamais dans le dépôt)_
* **Effectifs réels (2026-2027) :** 1 174 élèves actifs répartis dans les 37 classes (28 à 38 par classe)
* **Corps professoral :** 117 professeurs réels Entra ID
* **Grille officielle :** 565 équipes pré-configurées avec affectations UnDeuxTEMPS / Axess
* **Multi-Propriétaires & Co-propriété :** Prise en charge de plusieurs enseignants par équipe + co-propriété automatique pour `mjoubin@notredamedesmissions.com` et les administrateurs Office 365

---

## 📱 3. Accès & Caractéristiques Clés

* **URL de l'application :** `http://<IP_DU_CONTENEUR_LXC>:3000`
* **Zéro Cache :** Headers `Cache-Control: no-store, no-cache, must-revalidate`
* **Intégration iFrame :** `X-Frame-Options: ALLOWALL` & `Content-Security-Policy: frame-ancestors *;`
* **Responsive 100% :** Compatible smartphones, tablettes et bureau

---

## 📦 4. Gestion du Service Systemd

```bash
systemctl status ndm-teams       # Statut du service
systemctl restart ndm-teams      # Redémarrage du service
journalctl -u ndm-teams -f       # Suivi des logs en temps réel
```

---

## 🐙 5. Déploiement GitHub

* **Utilisateur :** `serviceinformatique-droid`
* **Dépôt :** `ndm-teams-manager`
* **Script :**
  ```bash
  cd /opt/ndm-teams-manager
  chmod +x scripts/push-github.sh
  ./scripts/push-github.sh "Mise à jour NDM Teams Manager"
  ```
README_EOF
fi

IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "IP_LXC")

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN} INSTALLATION TERMINÉE AVEC SUCCÈS SUR VOTRE CONTENEUR LXC DEBIAN 12 ! ${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "Accès Web (100% sans cache navigateur, adapté iFrame & mobile) :"
echo -e "${YELLOW}http://${IP_ADDR}:3000${NC}"
echo -e "\nDocumentation à jour créée : /opt/ndm-teams-manager/README.md"
echo -e "Commandes utiles :"
echo -e "- Statut du service : ${BLUE}systemctl status ndm-teams${NC}"
echo -e "- Logs en direct    : ${BLUE}journalctl -u ndm-teams -f${NC}"
echo -e "- Redémarrage       : ${BLUE}systemctl restart ndm-teams${NC}"

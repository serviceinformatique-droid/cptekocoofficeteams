#!/usr/bin/env bash
# ==============================================================================
# Déploiement du projet sur TOUS les serveurs NDM (Windows : PuTTY plink / pscp requis).
# Usage : NDM_DEPLOY_PASSWORD='...' ./scripts/deploy.sh
# Le mot de passe root n'est JAMAIS écrit dans le dépôt : il vient de la variable d'environnement.
# Chaque serveur est identifié par l'empreinte de sa clé SSH (pas de confiance aveugle).
# Pour ajouter un serveur : une ligne "IP|empreinte" ci-dessous (ssh-keyscan -t ed25519 IP puis ssh-keygen -lf).
# ==============================================================================
set -uo pipefail

SERVERS=(
  "192.168.96.16|SHA256:lMFDj6u8fTBQaWemf7tk+y7JNix2bF/CxwBgEtq5TuM"
  "192.168.96.61|SHA256:UJLQEMz9kF4HEJalU2k98+xRq4JelMFdK2AJewOo/IM"
  "192.168.96.74|SHA256:NvO7tPsjm+1Hm5WleVjnyBuxsPleaDOK7uQGhhn8b50"
)
APP_DIR="/opt/ndm-teams-manager"
: "${NDM_DEPLOY_PASSWORD:?Définissez NDM_DEPLOY_PASSWORD (mot de passe root des serveurs)}"

cd "$(dirname "$0")/.."
ARCHIVE="$(mktemp -d)/ndm-deploy.tgz"
tar --exclude='./node_modules' --exclude='./dist' --exclude='./.env' --exclude='./data' --exclude='./.git' -czf "$ARCHIVE" .
echo "Archive prête : $(du -h "$ARCHIVE" | cut -f1)"

FAILED=0
for entry in "${SERVERS[@]}"; do
  HOST="${entry%%|*}"; HK="${entry##*|}"
  echo; echo "=== $HOST ==="
  if ! pscp -batch -hostkey "$HK" -pw "$NDM_DEPLOY_PASSWORD" "$ARCHIVE" "root@$HOST:/root/ndm-deploy.tgz" >/dev/null 2>&1; then
    echo "[ECHEC] $HOST injoignable ou identifiants refusés"; FAILED=$((FAILED+1)); continue
  fi
  plink -ssh -batch -hostkey "$HK" -pw "$NDM_DEPLOY_PASSWORD" "root@$HOST" "
    set -e
    cd $APP_DIR && tar -xzf /root/ndm-deploy.tgz && rm -f /root/ndm-deploy.tgz
    sed -i 's/\r\$//' install.sh scripts/*.sh
    npm install --legacy-peer-deps >/dev/null 2>&1
    npm run build 2>&1 | grep -E 'built in|rror' || true
    systemctl restart ndm-teams && sleep 8
    echo \"service : \$(systemctl is-active ndm-teams)\"
    echo \"page    : HTTP \$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)\"
    echo \"api     : HTTP \$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/rentree/pending)\"
  " || { echo "[ECHEC] déploiement sur $HOST"; FAILED=$((FAILED+1)); }
done

echo
if [ "$FAILED" -eq 0 ]; then echo "=== Tous les serveurs sont à jour ==="; else echo "=== $FAILED serveur(s) en échec ==="; exit 1; fi

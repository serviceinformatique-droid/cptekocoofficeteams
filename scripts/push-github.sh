#!/usr/bin/env bash
# ==============================================================================
# Envoi du projet vers GitHub : serviceinformatique-droid/cptekocoofficeteams (branche main)
# Usage : ./scripts/push-github.sh "message du commit"
# Refuse d'envoyer quoi que ce soit si un secret Microsoft est détecté dans les fichiers.
# ==============================================================================
set -euo pipefail

REPO_URL="https://github.com/serviceinformatique-droid/cptekocoofficeteams.git"
cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  git init -q -b main
  git remote add origin "$REPO_URL"
  git fetch -q origin main && git reset -q origin/main || true
fi
git remote set-url origin "$REPO_URL"
git config user.name  >/dev/null 2>&1 || git config user.name  "Mikael JOUBIN"
git config user.email >/dev/null 2>&1 || git config user.email "ia@notredamedesmissions.fr"

echo "=== Contrôle anti-secret ==="
if git ls-files -o -c --exclude-standard -z | xargs -0 grep -lE "8Q~[A-Za-z0-9_.~-]{25,}" 2>/dev/null; then
  echo "[ERREUR] Un secret a été détecté dans les fichiers ci-dessus : envoi annulé."
  exit 1
fi
echo "Aucun secret détecté."

git add -A
if git diff --cached --quiet; then
  echo "Rien à envoyer : GitHub est déjà à jour."
  exit 0
fi

MSG="${*:-chore: mise à jour du projet}"
git commit -q -m "$MSG" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -u origin main
echo "=== GitHub à jour : $(git rev-parse --short HEAD) ==="

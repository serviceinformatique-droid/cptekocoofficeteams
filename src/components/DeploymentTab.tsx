import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Terminal, 
  Copy, 
  Check, 
  Server, 
  FolderDown, 
  Download, 
  ShieldCheck, 
  FileCode, 
  Layers, 
  ArrowRight,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { api } from '../services/api.ts';

export const DeploymentTab: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [scriptsData, setScriptsData] = useState<{
    allInOneScript: string;
    gitPushScript: string;
    filezillaPath: string;
    runCommand: string;
  } | null>(null);

  useEffect(() => {
    api.getDeploymentScripts().then((data) => setScriptsData(data));
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const filezillaPath = '/opt/ndm-teams-manager/';
  const executionCommand = 'cd /opt/ndm-teams-manager && chmod +x scripts/install-all-in-one.sh && ./scripts/install-all-in-one.sh';

  const catAllInOneCommand = `mkdir -p /opt/ndm-teams-manager/scripts
cat << 'EOF' > /opt/ndm-teams-manager/scripts/install-all-in-one.sh
#!/usr/bin/env bash
set -e
echo "=== [1/4] Mise a jour Debian 12 LXC ==="
apt-get update && apt-get install -y curl wget git rsync build-essential
echo "=== [2/4] Installation Node.js 22 LTS ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
cd /opt/ndm-teams-manager
echo "=== [3/4] Installation dependances et build ==="
npm install
npm run build
echo "=== [4/4] Configuration Service Systemd ==="
cat << 'SERVICE' > /etc/systemd/system/ndm-teams.service
[Unit]
Description=NDM Teams Manager Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ndm-teams-manager
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
SERVICE
systemctl daemon-reload
systemctl enable --now ndm-teams
echo "NDM Teams Manager installe et demarre sur le port 3000 !"
EOF
chmod +x /opt/ndm-teams-manager/scripts/install-all-in-one.sh
/opt/ndm-teams-manager/scripts/install-all-in-one.sh`;

  const gitPushCommand = `cd /opt/ndm-teams-manager
chmod +x scripts/push-github.sh
./scripts/push-github.sh`;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Centre de Déploiement LXC Proxmox Debian 12 & GitHub
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              100% Serveur • Zéro Cache
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Instructions précises pour FileZilla, conteneur LXC Debian 12, Docker, et scripts GitHub pour <code className="text-blue-700 font-mono">serviceinformatique-droid</code>.
          </p>
        </div>
      </div>

      {/* 1. FILEZILLA DIRECTORY NOTICE (Mandatory per user instructions) */}
      <div className="bg-gradient-to-r from-blue-50 via-white to-white border-2 border-blue-200 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              FZ
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Répertoire distant FileZilla (SFTP - Port 22 - root)
              </h2>
              <p className="text-xs text-slate-700">
                Déposez l'intégralité des fichiers du projet dans ce répertoire sur votre conteneur LXC Proxmox :
              </p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(filezillaPath, 'fz')}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-600/25"
          >
            {copiedKey === 'fz' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'fz' ? 'Copié !' : 'Copier Répertoire'}
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 font-mono text-sm sm:text-base font-bold text-emerald-600 flex items-center justify-between">
          <span>{filezillaPath}</span>
          <span className="text-xs text-slate-500 font-normal">Recommandé Debian 12</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Protocole : SFTP (SSH File Transfer)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Port : 22 • Utilisateur : root</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Permissions : chmod 755 sur /opt</span>
          </div>
        </div>
      </div>

      {/* 2. COMMAND TO EXECUTE AFTER FILEZILLA UPLOAD */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600" />
            2. Commande à exécuter après le dépôt FileZilla
          </h2>
          <button
            onClick={() => copyToClipboard(executionCommand, 'exec')}
            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
          >
            {copiedKey === 'exec' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'exec' ? 'Copié !' : 'Copier Commande'}
          </button>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-blue-700 overflow-x-auto">
          <code>{executionCommand}</code>
        </div>
        <p className="text-xs text-slate-500">
          Cette commande rend le script exécutable et lance l'installation automatique (Node.js 22, npm install, build et création du service Systemd).
        </p>
      </div>

      {/* 3. SCRIPT TOUT-EN-UN VIA COMMANDE CAT (COPIER-COLLER DIRECT SANS FILEZILLA) */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-600" />
              3. Script Tout-en-un via commande "cat" (Installation directe en 1 clic)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Si vous préférez installer sans passer par FileZilla : collez directement ce bloc dans votre terminal Proxmox LXC.
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(catAllInOneCommand, 'cat')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
          >
            {copiedKey === 'cat' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'cat' ? 'Copié !' : 'Copier Script cat'}
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 max-h-48 overflow-y-auto">
          <pre>{catAllInOneCommand}</pre>
        </div>
      </div>

      {/* 4. SCRIPT GITHUB PUSH (Pour serviceinformatique-droid) */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-emerald-600" />
              4. Script de Push GitHub (Utilisateur : serviceinformatique-droid)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Synchronisez automatiquement votre dépôt local vers GitHub avec l'utilisateur spécifié.
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(gitPushCommand, 'git')}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
          >
            {copiedKey === 'git' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'git' ? 'Copié !' : 'Copier Commande Git'}
          </button>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-emerald-700">
          <code>{gitPushCommand}</code>
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <p>Dépôt cible : <span className="font-mono text-slate-900">https://github.com/serviceinformatique-droid/ndm-teams-manager.git</span></p>
          <p>Le script gère automatiquement l'initialisation git, la branche main, le commit et le push.</p>
        </div>
      </div>

      {/* 5. DOCKER & DOCKER COMPOSE ALTERNATIVE */}
      <div className="bg-slate-50 border border-slate-300/80 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-600" />
          5. Alternative : Déploiement Docker Compose dans le conteneur LXC
        </h2>
        <p className="text-xs text-slate-500">
          Si votre conteneur Debian 12 LXC a Docker d'activé (option nesting=1 dans Proxmox) :
        </p>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-xs text-blue-700 flex items-center justify-between">
          <code>cd /opt/ndm-teams-manager && docker compose up -d --build</code>
          <button
            onClick={() => copyToClipboard('cd /opt/ndm-teams-manager && docker compose up -d --build', 'compose')}
            className="p-1 rounded text-slate-500 hover:text-slate-900"
          >
            {copiedKey === 'compose' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Fichier README.md complet présent à la racine du projet avec toutes les spécifications documentées.</span>
        </div>
      </div>

    </div>
  );
};

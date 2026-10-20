# NDM Teams Manager — Gestion Automatique des Équipes Microsoft Teams

**Établissement :** Ensemble Scolaire Notre-Dame des Missions  
**Périmètre :** Collège (24 classes : 601-606 à 301-306) & Lycée (13 classes : 201-205, 101-104, T01-T04) — Total : 37 classes  
**Source Utilisateurs :** 100% Réel Microsoft Entra ID, import de rentrée depuis l'export Charlemagne (Aplim)  
**Architecture :** 100% Serveur (Node.js/Express + Vite React SPA), Zéro Cache Navigateur, 100% Adapté iFrame & Mobile  
**Cible Serveur :** Conteneur LXC Proxmox Debian 12 (avec Docker & npm)  
**Utilisateur GitHub :** `serviceinformatique-droid`  
**Dépôt :** `ndm-teams-manager`  


> **Fusion :** ce projet intègre l'ancien *compteoffice (SyncM365)* dans l'onglet **Comptes M365** (import CSV élèves/profs, création de comptes Entra ID, licences A1/A3, groupes). API : `/api/office/*` (`server/office.ts`), identifiants Entra partagés avec l'onglet *M365 & Config*.
> **Secrets :** `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET` se définissent dans `.env` (voir `.env.example`), jamais dans le code.

---

## 📁 1. Répertoire de Dépôt FileZilla (SFTP)

Connectez-vous à votre conteneur **LXC Proxmox Debian 12** via FileZilla :
* **Protocole :** SFTP (SSH File Transfer Protocol)
* **Hôte :** `<IP_DE_VOTRE_CONTENEUR_LXC>`
* **Port :** `22`
* **Utilisateur :** `root`
* **Répertoire distant cible :**
  ```text
  /opt/ndm-teams-manager/
  ```

> **Consigne FileZilla :** Glissez-déposez tous les fichiers du projet directement dans `/opt/ndm-teams-manager/`.

---

## ⚡ 2. Script d'Exécution Tout-en-Un (cat ou sh)

### Option A : Exécution du script existant
Dans la console Proxmox ou par SSH :
```bash
cd /opt/ndm-teams-manager
chmod +x scripts/install-all-in-one.sh
./scripts/install-all-in-one.sh
```

### Option B : Commande unique par copier-coller (`cat` tout-en-un)
Si vous souhaitez initialiser l'installation en une seule ligne de commande dans votre terminal :
```bash
mkdir -p /opt/ndm-teams-manager && cd /opt/ndm-teams-manager && bash -c "$(curl -fsSL https://raw.githubusercontent.com/serviceinformatique-droid/ndm-teams-manager/main/scripts/install-all-in-one.sh 2>/dev/null || cat << 'EOF'
#!/usr/bin/env bash
set -e
mkdir -p /opt/ndm-teams-manager && cd /opt/ndm-teams-manager
apt-get update -y && apt-get install -y curl wget git build-essential
command -v node >/dev/null || (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs)
[ -f "package.json" ] && npm install && npm run build
cat << 'SERVICE_EOF' > /etc/systemd/system/ndm-teams.service
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
SERVICE_EOF
systemctl daemon-reload && systemctl enable ndm-teams && systemctl restart ndm-teams
echo "NDM Teams Manager démarré sur http://$(hostname -I | awk '{print $1}'):3000"
EOF
)"
```

---

## 🔑 3. Paramètres Microsoft 365 & Entra ID

| Paramètre | Valeur |
| :--- | :--- |
| **Tenant ID** | `55b01275-e53b-4146-94a3-cb58e71ec7bf` |
| **Client ID** | `1b4e3135-da49-4e36-9d17-d15d3ab497d3` |
| **Client Secret** | _voir `/opt/ndm-teams-manager/.env` (jamais dans le dépôt)_ |
| **Convention de nommage** | `[CLASSE]-[MATIÈRE]` (ex: `601-Français`, `201-Mathématiques`) |
| **Modèle d'équipe Teams** | `educationClass` (Classe avec devoirs et bloc-notes) |

### Validation du Secret Client sur Microsoft Azure (Erreur AADSTS7000215) :
L'erreur `AADSTS7000215: Invalid client secret provided` prouve que votre **Tenant ID** et votre **Application (Client ID)** sont désormais **100 % reconnus** par Microsoft. **Il ne faut surtout pas recommencer les tenants ni recréer l'application !**
Il s'agit uniquement du secret client applicatif :
1. Connectez-vous sur **[portal.azure.com](https://portal.azure.com)**.
2. Allez dans **Microsoft Entra ID** > **Inscriptions d'applications** > votre application.
3. Dans le menu de gauche, cliquez sur **Certificats & secrets**.
4. Cliquez sur **« + Nouveau secret client »** (description: `NDM Teams Manager`, expiration: 24 mois), puis **Ajouter**.
5. ⚠️ **POINT CRUCIAL :** Copiez immédiatement la colonne **Valeur** (et **SURTOUT PAS** l'ID de secret qui est un piège classique Azure).
6. Collez cette Valeur directement dans l'application web dans l'onglet **M365 & Config** > champ **Client Secret**, puis cliquez sur **« Enregistrer les paramètres »**.
7. Lancez le **Diagnostic 7 points** : l'étape 1 passera immédiatement au vert !

---

## 🛡️ 4. Données Réelles & Effectifs Exacts (Filtre KoXo 2026-2027)

L'annuaire synchronise l'intégralité de votre tenant Microsoft Entra ID avec un filtrage rigoureux basé sur les règles **KoXo Administrator** pour l'année scolaire active 2026-2027 :
* **Effectifs Réels des Élèves Actifs :** Exactement **1 174 élèves actifs** répartis dans les **37 classes** :
  * **Collège (601 à 306) :** 28 à 33 élèves par classe (ex: 601: 33, 602: 31, 604: 30, 501: 33, 401: 30, 301: 30...).
  * **Lycée 2nde (201 à 205) :** 29 à 34 élèves par classe (ex: 201: 30, 204: 34, 205: 29...).
  * **Lycée 1ère (101 à 104) :** 34 à 35 élèves par classe (ex: 101: 35, 102: 35, 103: 35, 104: 34).
  * **Lycée Terminale (T01 à T04) :** 36 à 38 élèves par classe (ex: T01: 38, T02: 36, T03: 37, T04: 37).
* **Pourquoi les effectifs étaient erronés auparavant ?**
  Dans Entra ID, d'anciens comptes d'élèves ayant obtenu leur baccalauréat en 2024 ou 2025 conservaient l'historique « T01 » dans leur département, et des comptes de salles/visio (comme `201-2@`) contenaient des numéros de classe.
  Le serveur filtre désormais strictement par le champ officiel KoXo `officeLocation` de la rentrée 2026-2027. Les 393 anciens comptes sont automatiquement classés en **Anciens élèves / Archivés** et n'alourdissent plus les effectifs réels des classes.
* **Corps professoral réel :** **117 professeurs réels** identifiés et reliés aux équipes pédagogiques.

---

## 👥 5. Création Réelle sur Teams & Grille Officielle des Professeurs

### Pourquoi les équipes n'étaient pas encore créées en direct sur Teams ?
C'est une **sécurité essentielle** : l'application ne crée pas aveuglément 260 équipes vides sur votre tenant Microsoft 365 tant que vous n'avez pas validé le plan prévisionnel et les professeurs référents.

### Intégration du Document Officiel UnDeuxTEMPS / Axess (30/09/2026) :
* **565 équipes officielles** ont été automatiquement générées et affectées pour l'intégralité des **37 classes** (601 à 606, 501 à 506, 401 à 406, 301 à 306, 201 à 205, 101 à 104, T01 à T04).
* Chaque professeur (ex: *Mme LESTANG Marie* en Français, *M. GUEDJ GUILLAUME* en Maths, *Mme LACOSTE AUDE-MARIE* en Histoire-Géo, *M. BACQUET GILLES* en Techno, etc.) est associé avec son compte réel Microsoft Entra ID comme **Propriétaire (Owner)** de l'équipe de sa matière.
* Le **Professeur Principal** de chaque classe (`mainTeacher`) est automatiquement renseigné à partir de la matière *Vie de classe*.

### Multi-Propriétaires & Co-Propriété des Administrateurs Office :
* **Multi-Propriétaires par équipe :** Chaque équipe supporte plusieurs propriétaires (Owners). Vous pouvez assigner conjointement le professeur titulaire, un co-enseignant ou suppléant, et les comptes administrateurs Office.
* **Comptes Administrateurs Office associés :**
  * `mjoubin@notredamedesmissions.com` (Mikael JOUBIN, Responsable Informatique)
  * `admin@notredamedesmissions.com` (Service Informatique NDM)
  * `admin@notredamedesmissions.onmicrosoft.com` (Admin Global Microsoft 365)
* **Bouton Global « 🛡️ Co-propriété Admins Office » :**
  Dans l'onglet **Équipes Teams**, ce bouton orange permet d'injecter en 1 clic les comptes administrateurs Office en co-propriétaires sur l'ensemble des 565 équipes Teams sans écraser les professeurs de chaque matière.
* **Création Réelle sur Microsoft Graph :**
  Lors de la création de l'équipe sur Teams, tous les propriétaires assignés sont passés directement dans `owners@odata.bind` (ou ajoutés via l'API Graph).

### Comment créer les équipes et assigner les professeurs :
1. **Création en Masse Automatisée (Recommandé) :**
   * **Vous n'avez pas besoin de créer les équipes une par une !** Cliquez simplement sur le bouton **« 🚀 Tout créer sur Teams (En masse) »** dans l'onglet *Équipes Teams*.
   * Choisissez le périmètre : **Classe sélectionnée** (ex: les 15 équipes de la classe 101 en 1 clic) ou **Toutes les équipes en attente** (les 565 équipes).
   * L'outil crée les groupes, active Teams (`PUT /groups/{id}/team`), injecte les restrictions membres, associe tous les élèves et propriétaires avec temporisation anti-blocage Microsoft.
2. **Assignation Multi-Propriétaires :**
   Sur chaque carte d'équipe, cliquez sur **« Gérer »** ou **« + Assigner »** : une fenêtre interactive s'ouvre pour cocher autant d'enseignants et d'admins que nécessaire.
3. **Co-propriété Massive des Administrateurs :**
   Cliquez sur **« 🛡️ Co-propriété Admins Office »** pour associer `mjoubin@notredamedesmissions.com` et les admins à toutes les équipes.
4. **Application des Restrictions Membres Strictes :**
   Le bouton **« 🛡️ Restrictions membres »** permet de ré-appliquer à tout moment le profil de sécurité sur toutes les équipes Teams actives.
5. **Création Unitaire Ponctuelle :**
   Le bouton vert **« Créer sur Teams »** reste disponible sur chaque équipe individuelle si vous souhaitez tester ou créer une équipe spécifique isolément.

---

## 🔒 7. Restrictions Strictes & Modération du Canal Général (Profil Conforme)

L'application intègre le panneau exact de gestion des paramètres et de modération Microsoft Teams, configurable **pour une équipe isolée** ou **pour l'ensemble des 565 équipes**, avec **mémorisation par défaut pour toutes les nouvelles équipes créées** :

### A. Modération du Canal Général (Préférences de publication) :
Conforme à l'écran officiel des paramètres du canal Général dans Microsoft Teams :
* 🔵 **« Tout le monde peut publier des messages »** : Tout élève et enseignant peut initier une discussion.
* 🔵 **« Tout le monde peut publier dans le canal ; afficher l'alerte indiquant que tous les membres seront avertis »** : Recommandé pour grandes équipes avec rappel de notification.
* 🔵 **« Seuls les propriétaires peuvent publier des messages » (Recommandé Établissement Scolaire)** : Seuls les enseignants et les administrateurs Office peuvent créer de nouvelles publications. Les élèves ne peuvent pas polluer le fil d'annonces officiel.

### B. Autorisations des Membres Teams (Graph API) :
| Paramètre Teams (Graph API) | Valeur Appliquée | Contexte Pédagogique |
|---|---|---|
| `generalChannelModeration` | **`ownersOnly`** | **Seuls les propriétaires (profs/admins) publient sur le canal Général** |
| `allowCreateUpdateChannels` | **Désactivé (`false`)** | Les élèves ne peuvent ni créer ni renommer de canaux |
| `allowCreatePrivateChannels` | **Désactivé (`false`)** | Interdiction formelle de canaux privés entre élèves |
| `allowDeleteChannels` | **Désactivé (`false`)** | Les élèves ne peuvent pas supprimer de canaux |
| `allowAddRemoveApps` | **Désactivé (`false`)** | Interdiction d'ajouter des applications ou bots externes |
| `allowCreateUpdateRemoveTabs` | **Désactivé (`false`)** | Interdiction de modifier les onglets de cours |
| `allowCreateUpdateRemoveConnectors`| **Désactivé (`false`)** | Interdiction d'ajouter des connecteurs |
| `allowOwnerDeleteMessages` | **Activé (`true`)** | **Les professeurs et admins peuvent modérer et supprimer tous les messages** |
| `allowUserDeleteMessages` | **Activé (`true`)** | Les élèves peuvent supprimer leurs propres erreurs |
| `allowUserEditMessages` | **Activé (`true`)** | Les élèves peuvent corriger leurs propres messages |
| `allowGiphy` / Memes | **Désactivé (`false`)** | Environnement d'apprentissage sérieux et sécurisé |

---

## ⚙️ 8. Gestion des Équipes & Utilisateurs Globaux (100% Serveur, Zéro Cache)

### 1. Ajouter un utilisateur à TOUTES les équipes :
* Cliquez sur **« 👤 Ajouter à toutes les équipes »** en haut de l'onglet **Équipes Teams**.
* Vous pouvez :
  * Sélectionner n'importe quel compte existant (enseignant, personnel, suppléant, admin)
  * Ou taper directement une adresse email (ex: `nouveau.professeur@notredamedesmissions.com` ou `direction@...`)
* Définissez son rôle : **Propriétaire (Owner)** ou **Membre (Member)**.
* L'utilisateur est rattaché en local, et **automatiquement synchronisé en direct sur Microsoft 365 Cloud** pour toutes les équipes actives via l'API Graph (`POST /groups/{id}/owners` ou `members`).

### 2. Modifier une équipe :
* Sur chaque carte d'équipe, cliquez sur le bouton **✏️ (Modifier)**.
* Vous pouvez modifier : le nom de l'équipe, le code de classe, la matière, et le mode de gestion automatique.
* Si l'équipe est déjà déployée sur Microsoft 365 Cloud, son `displayName` et sa description sont **automatiquement mis à jour sur Microsoft Teams**.

### 3. Supprimer une équipe :
* Sur chaque carte d'équipe, cliquez sur le bouton **🗑️ (Supprimer)**.
* Une confirmation s'affiche : si l'équipe est créée sur Microsoft 365 Cloud, elle est également **définitivement supprimée du Cloud Microsoft Teams (`DELETE /v1.0/groups/{id}`)**.

### 4. Supprimer TOUTES les équipes :
* Cliquez sur le bouton rouge **« 🗑️ Supprimer tout »** dans la barre d'outils.
* Une boîte de dialogue de sécurité protégée requiert la saisie du mot `SUPPRIMER`.
* Vous pouvez choisir de supprimer uniquement la base locale ou de **purger également toutes les équipes du Cloud Microsoft 365**.
* Vous pouvez ensuite recréer ou ré-importer le catalogue propre à tout moment en cliquant sur **« Catalogue 37 Classes »** ou **« Affecter Profs Officiels »**.

---

## 🚀 9. Déploiement GitHub

Pour synchroniser le code avec votre compte GitHub `serviceinformatique-droid` :
```bash
cd /opt/ndm-teams-manager
chmod +x scripts/push-github.sh
./scripts/push-github.sh "feat: gestion complete equipes ajout utilisateur a tout modif et suppression unitaire et globale"
```

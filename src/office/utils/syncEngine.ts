import {
  UserAccount,
  CsvValidationItem,
  PreviewItem,
  PreviewActionType,
  M365License,
  TenantConfig,
  SyncStats,
  SyncLogItem,
  SynchronizationRecord,
  AbsentAccount,
  UserRole,
} from '../types';

export function generatePreview(
  elevesItems: CsvValidationItem[],
  profsItems: CsvValidationItem[],
  existingAccounts: UserAccount[],
  licenses: M365License[],
  config: TenantConfig
): {
  previewItems: PreviewItem[];
  absentAccounts: AbsentAccount[];
} {
  const accountByEmail = new Map<string, UserAccount>();
  for (const acc of existingAccounts) {
    accountByEmail.set(acc.email.toLowerCase(), acc);
  }

  const eleveLicense = licenses.find((l) => l.skuId === config.defaultEleveSkuId) || licenses[0];
  const profLicense = licenses.find((l) => l.skuId === config.defaultProfSkuId) || licenses[1] || licenses[0];

  const previewItems: PreviewItem[] = [];
  const processedEmails = new Set<string>();

  // Process Élèves
  for (const item of elevesItems) {
    if (item.status === 'error' && !item.ignored) continue;

    const email = item.email.toLowerCase();
    processedEmails.add(email);
    const existing = accountByEmail.get(email);

    const displayName = `${item.prenom} ${item.nom.toUpperCase()}`;
    const targetSku = eleveLicense?.skuId || '';
    const targetLicenseName = eleveLicense?.displayName || 'Office 365 A1 pour les étudiants';
    const targetGroup = config.groupEleve || 'ELEVE';

    if (!existing) {
      // Creation
      previewItems.push({
        id: `prev-el-new-${item.lineNumber}`,
        lineNumber: item.lineNumber,
        nom: item.nom,
        prenom: item.prenom,
        displayName,
        email,
        userType: 'eleve',
        rawPassword: item.rawPassword,
        action: 'creation',
        newLicenceSku: targetSku,
        newLicenceName: targetLicenseName,
        newGroup: targetGroup,
        changesDescription: [
          'Création du compte Microsoft 365 dans Entra ID',
          `Attribution de la licence : ${targetLicenseName}`,
          `Ajout au groupe de sécurité : ${targetGroup}`,
          'Attribution du mot de passe initial (changement forcé à la 1ère connexion)',
        ],
        statusInTenant: "N'existe pas",
        selected: true,
      });
    } else {
      // Existing
      const isCategoryChanged = existing.type !== 'eleve';
      const isLicenceDifferent = existing.licenceSkuId !== targetSku;
      const isNameDifferent =
        existing.nom.toLowerCase() !== item.nom.toLowerCase() ||
        existing.prenom.toLowerCase() !== item.prenom.toLowerCase();
      const hasPasswordUpdate = Boolean(item.rawPassword);

      let action: PreviewActionType = 'aucun';
      const changesDescription: string[] = [];

      if (isCategoryChanged) {
        action = 'categorie_change';
        changesDescription.push(
          `Changement de catégorie : ${existing.type === 'professeur' ? 'Professeur' : 'Autre'} → Élève`,
          `Remplacement licence : "${existing.licenceName}" → "${targetLicenseName}"`,
          `Migration de groupe vers : ${targetGroup}`
        );
      } else if (isLicenceDifferent) {
        action = 'licence_change';
        changesDescription.push(`Mise à jour licence : "${existing.licenceName}" → "${targetLicenseName}"`);
      } else if (isNameDifferent || hasPasswordUpdate) {
        action = 'modification';
        if (isNameDifferent) {
          changesDescription.push(`Mise à jour identité : ${existing.displayName} → ${displayName}`);
        }
        if (hasPasswordUpdate) {
          changesDescription.push('Mise à jour du mot de passe temporaire');
        }
      } else {
        changesDescription.push('Toutes les informations sont conformes au tenant Microsoft 365');
      }

      previewItems.push({
        id: `prev-el-exist-${existing.id}`,
        lineNumber: item.lineNumber,
        nom: item.nom,
        prenom: item.prenom,
        displayName,
        email,
        userType: 'eleve',
        rawPassword: item.rawPassword,
        action,
        existingAccount: existing,
        oldLicenceSku: existing.licenceSkuId,
        oldLicenceName: existing.licenceName,
        newLicenceSku: targetSku,
        newLicenceName: targetLicenseName,
        oldGroup: existing.groups[0],
        newGroup: targetGroup,
        changesDescription,
        statusInTenant: 'Existe',
        selected: true,
        isCategoryChanged,
      });
    }
  }

  // Process Professeurs
  for (const item of profsItems) {
    if (item.status === 'error' && !item.ignored) continue;

    const email = item.email.toLowerCase();
    processedEmails.add(email);
    const existing = accountByEmail.get(email);

    const displayName = `${item.prenom} ${item.nom.toUpperCase()}`;
    const targetSku = profLicense?.skuId || '';
    const targetLicenseName = profLicense?.displayName || 'Microsoft 365 A3 pour les enseignants';
    const targetGroup = config.groupProf || 'PROFESSEURS';

    if (!existing) {
      // Creation
      previewItems.push({
        id: `prev-pr-new-${item.lineNumber}`,
        lineNumber: item.lineNumber,
        nom: item.nom,
        prenom: item.prenom,
        displayName,
        email,
        userType: 'professeur',
        rawPassword: item.rawPassword,
        action: 'creation',
        newLicenceSku: targetSku,
        newLicenceName: targetLicenseName,
        newGroup: targetGroup,
        changesDescription: [
          'Création du compte enseignant dans Entra ID',
          `Attribution de la licence : ${targetLicenseName}`,
          `Ajout au groupe de sécurité : ${targetGroup}`,
          'Attribution du mot de passe initial',
        ],
        statusInTenant: "N'existe pas",
        selected: true,
      });
    } else {
      // Existing
      const isCategoryChanged = existing.type !== 'professeur';
      const isLicenceDifferent = existing.licenceSkuId !== targetSku;
      const isNameDifferent =
        existing.nom.toLowerCase() !== item.nom.toLowerCase() ||
        existing.prenom.toLowerCase() !== item.prenom.toLowerCase();
      const hasPasswordUpdate = Boolean(item.rawPassword);

      let action: PreviewActionType = 'aucun';
      const changesDescription: string[] = [];

      if (isCategoryChanged) {
        action = 'categorie_change';
        changesDescription.push(
          `Changement de catégorie : ${existing.type === 'eleve' ? 'Élève' : 'Autre'} → Professeur`,
          `Remplacement licence : "${existing.licenceName}" → "${targetLicenseName}"`,
          `Migration de groupe vers : ${targetGroup}`
        );
      } else if (isLicenceDifferent) {
        action = 'licence_change';
        changesDescription.push(`Mise à jour licence : "${existing.licenceName}" → "${targetLicenseName}"`);
      } else if (isNameDifferent || hasPasswordUpdate) {
        action = 'modification';
        if (isNameDifferent) {
          changesDescription.push(`Mise à jour identité : ${existing.displayName} → ${displayName}`);
        }
        if (hasPasswordUpdate) {
          changesDescription.push('Mise à jour du mot de passe enseignant');
        }
      } else {
        changesDescription.push('Toutes les informations sont conformes au tenant Microsoft 365');
      }

      previewItems.push({
        id: `prev-pr-exist-${existing.id}`,
        lineNumber: item.lineNumber,
        nom: item.nom,
        prenom: item.prenom,
        displayName,
        email,
        userType: 'professeur',
        rawPassword: item.rawPassword,
        action,
        existingAccount: existing,
        oldLicenceSku: existing.licenceSkuId,
        oldLicenceName: existing.licenceName,
        newLicenceSku: targetSku,
        newLicenceName: targetLicenseName,
        oldGroup: existing.groups[0],
        newGroup: targetGroup,
        changesDescription,
        statusInTenant: 'Existe',
        selected: true,
        isCategoryChanged,
      });
    }
  }

  // Detect absent accounts in tenant (Section 25)
  const absentAccounts: AbsentAccount[] = [];
  for (const acc of existingAccounts) {
    if (!processedEmails.has(acc.email.toLowerCase()) && acc.statut === 'actif') {
      absentAccounts.push({
        account: acc,
        missingFrom: acc.type === 'eleve' ? 'eleves' : 'professeurs',
        detectionDate: new Date().toISOString(),
        potentialStatus:
          acc.type === 'eleve'
            ? 'Ancien élève ayant quitté l’établissement'
            : 'Enseignant non renouvelé ou muté',
      });
    }
  }

  return { previewItems, absentAccounts };
}

export function executeSynchronization(
  previewItems: PreviewItem[],
  existingAccounts: UserAccount[],
  licenses: M365License[],
  config: TenantConfig,
  operatorRole: UserRole,
  fileNames: string[]
): {
  updatedAccounts: UserAccount[];
  updatedLicenses: M365License[];
  syncRecord: SynchronizationRecord;
} {
  const timestamp = new Date().toLocaleString('fr-FR');
  const logs: SyncLogItem[] = [];
  const accountsMap = new Map<string, UserAccount>();

  for (const acc of existingAccounts) {
    accountsMap.set(acc.email.toLowerCase(), { ...acc });
  }

  const licensesMap = new Map<string, M365License>();
  for (const lic of licenses) {
    licensesMap.set(lic.skuId, { ...lic });
  }

  let createdEleves = 0;
  let modifiedEleves = 0;
  let unchangedEleves = 0;
  let errorEleves = 0;

  let createdProfs = 0;
  let modifiedProfs = 0;
  let unchangedProfs = 0;
  let errorProfs = 0;

  const selectedItems = previewItems.filter((i) => i.selected);

  for (const item of selectedItems) {
    const isEleve = item.userType === 'eleve';

    // REAL / ACTIVE EXECUTION
    try {
      const email = item.email.toLowerCase();
      const targetLic = licensesMap.get(item.newLicenceSku);

      // Check licence quota
      if (targetLic && targetLic.availableUnits <= 0 && targetLic.totalUnits < 999999) {
        throw new Error(
          `Licence indisponible dans le tenant : le quota pour "${item.newLicenceName}" est épuisé (0 disponible).`
        );
      }

      if (item.action === 'creation') {
        const newId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const m365Id = `m365-${Math.random().toString(36).substring(2, 11)}`;

        const newAccount: UserAccount = {
          id: newId,
          nom: item.nom.toUpperCase(),
          prenom: item.prenom,
          displayName: item.displayName,
          email: item.email,
          type: item.userType,
          microsoft365_id: m365Id,
          statut: 'actif',
          licenceSkuId: item.newLicenceSku,
          licenceName: item.newLicenceName,
          groups: [item.newGroup],
          mustChangePasswordOnNextLogin: config.forcePasswordChangeOnFirstLogin,
          lastSyncDate: timestamp,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: timestamp,
        };

        accountsMap.set(email, newAccount);

        // Consume licence quota
        if (targetLic && targetLic.totalUnits < 999999) {
          targetLic.consumedUnits++;
          targetLic.availableUnits--;
        }

        if (isEleve) createdEleves++;
        else createdProfs++;

        logs.push({
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp,
          userEmail: item.email,
          userName: item.displayName,
          userType: item.userType,
          action: 'Création compte',
          newLicence: item.newLicenceName,
          status: 'success',
          message: `Compte Microsoft 365 créé avec succès. Licence ${item.newLicenceName} attribuée. Ajouté au groupe ${item.newGroup}.`,
        });
      } else if (item.action === 'aucun') {
        if (isEleve) unchangedEleves++;
        else unchangedProfs++;
      } else {
        // Modification, Licence change, or Category change
        const currentAcc = accountsMap.get(email);
        if (currentAcc) {
          // If licence changed, update quotas
          if (currentAcc.licenceSkuId !== item.newLicenceSku) {
            const oldLic = licensesMap.get(currentAcc.licenceSkuId);
            if (oldLic && oldLic.consumedUnits > 0 && oldLic.totalUnits < 999999) {
              oldLic.consumedUnits--;
              oldLic.availableUnits++;
            }
            if (targetLic && targetLic.totalUnits < 999999) {
              targetLic.consumedUnits++;
              targetLic.availableUnits--;
            }
          }

          currentAcc.nom = item.nom.toUpperCase();
          currentAcc.prenom = item.prenom;
          currentAcc.displayName = item.displayName;
          currentAcc.type = item.userType;
          currentAcc.licenceSkuId = item.newLicenceSku;
          currentAcc.licenceName = item.newLicenceName;
          currentAcc.groups = [item.newGroup];
          currentAcc.lastSyncDate = timestamp;
          currentAcc.updatedAt = timestamp;
          if (item.rawPassword) {
            currentAcc.mustChangePasswordOnNextLogin = config.forcePasswordChangeOnFirstLogin;
          }
        }

        if (isEleve) modifiedEleves++;
        else modifiedProfs++;

        logs.push({
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp,
          userEmail: item.email,
          userName: item.displayName,
          userType: item.userType,
          action:
            item.action === 'categorie_change'
              ? 'Changement de catégorie & licence'
              : item.action === 'licence_change'
              ? 'Changement de licence'
              : 'Mise à jour compte',
          oldLicence: item.oldLicenceName,
          newLicence: item.newLicenceName,
          status: 'success',
          message: `Compte mis à jour avec succès : ${item.changesDescription.join(' ; ')}.`,
        });
      }
    } catch (err: any) {
      if (isEleve) errorEleves++;
      else errorProfs++;

      logs.push({
        id: `err-${Date.now()}-${Math.random()}`,
        timestamp,
        userEmail: item.email,
        userName: item.displayName,
        userType: item.userType,
        action: 'Erreur synchronisation',
        status: 'error',
        message: err.message || "Erreur inattendue lors de l'appel Microsoft Graph API.",
        details: 'Vérifiez les licences Microsoft 365 disponibles et les autorisations de votre tenant.',
      });
    }
  }

  const totalProcessed = selectedItems.length;
  const totalCreated = createdEleves + createdProfs;
  const totalModified = modifiedEleves + modifiedProfs;
  const totalUnchanged = unchangedEleves + unchangedProfs;
  const totalErrors = errorEleves + errorProfs;

  const stats: SyncStats = {
    totalProcessed,
    totalCreated,
    totalModified,
    totalUnchanged,
    totalErrors,
    eleves: {
      total: createdEleves + modifiedEleves + unchangedEleves + errorEleves,
      created: createdEleves,
      modified: modifiedEleves,
      unchanged: unchangedEleves,
      errors: errorEleves,
    },
    profs: {
      total: createdProfs + modifiedProfs + unchangedProfs + errorProfs,
      created: createdProfs,
      modified: modifiedProfs,
      unchanged: unchangedProfs,
      errors: errorProfs,
    },
  };

  const syncRecord: SynchronizationRecord = {
    id: `sync-${Date.now()}`,
    date: timestamp,
    operatorRole,
    operatorName: operatorRole === 'admin' ? 'Administrateur Informatique' : 'Opérateur',
    filesProcessed: fileNames,
    stats,
    logs,
  };

  return {
    updatedAccounts: Array.from(accountsMap.values()),
    updatedLicenses: Array.from(licensesMap.values()),
    syncRecord,
  };
}

/**
 * Module "Comptes M365" (ex-compteoffice) : création / mise à jour des comptes
 * Entra ID, licences et groupes via Microsoft Graph. Partage les identifiants
 * Entra de NDM Teams Manager (db.config) au lieu d'avoir un fichier séparé.
 */
import type { Express, Request, Response } from 'express';

const GRAPH = 'https://graph.microsoft.com/v1.0';

export interface OfficeContext {
  /** Configuration partagée (db.config) – mutable. */
  getConfig: () => any;
  /** Identifiants par défaut (variables d'environnement). */
  defaults: { tenantId: string; clientId: string; clientSecret: string };
  persist: () => void;
}

const OFFICE_DEFAULTS = {
  domain: '',
  organizationName: '',
  defaultEleveSkuId: '314c4481-f395-4525-be8b-2ec4bb1e9d91',
  defaultProfSkuId: '94763226-9b3c-4e75-a931-5c89701abe66',
  groupEleve: 'ELEVE',
  groupProf: 'PROFESSEURS',
  forcePasswordChangeOnFirstLogin: true,
  purgeTempCsv: true,
  liveGraphApiEnabled: true,
  connectionStatus: 'untested' as 'connected' | 'untested' | 'error',
  lastTestedDate: '',
};

export function registerOfficeRoutes(app: Express, ctx: OfficeContext) {
  const creds = () => {
    const c = ctx.getConfig();
    return {
      tenantId: c.tenantId || ctx.defaults.tenantId,
      clientId: c.clientId || ctx.defaults.clientId,
      clientSecret: c.clientSecret || ctx.defaults.clientSecret,
    };
  };
  const office = () => ({ ...OFFICE_DEFAULTS, ...(ctx.getConfig().office || {}) });
  const saveOffice = (patch: Record<string, unknown>) => {
    const c = ctx.getConfig();
    c.office = { ...office(), ...patch };
    ctx.persist();
    return c.office;
  };
  const publicConfig = () => {
    const { tenantId, clientId, clientSecret } = creds();
    return {
      ...office(),
      tenantId,
      clientId,
      clientSecretMasked: clientSecret ? `••••••••••••••••••••••••${clientSecret.slice(-4)}` : '',
    };
  };

  async function token(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Tenant ID, Client ID et Client Secret sont obligatoires.');
    }
    const body = new URLSearchParams({
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });
    const res = await fetch(`https://login.microsoftonline.com/${tenantId.trim()}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data: any = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(`Erreur authentification Microsoft Entra ID (${res.status}): ${data.error_description || data.error || 'échec OAuth2'}`);
    }
    return data.access_token;
  }

  const authed = (t: string, extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${t}`, ...extra });
  const json = { 'Content-Type': 'application/json' };

  app.get('/api/office/tenant/config', (_req, res) => res.json(publicConfig()));

  app.post('/api/office/tenant/config', (req, res) => {
    const { clientSecret, clientSecretMasked, tenantId, clientId, ...rest } = req.body || {};
    const c = ctx.getConfig();
    if (tenantId) c.tenantId = String(tenantId).trim();
    if (clientId) c.clientId = String(clientId).trim();
    if (clientSecret && !String(clientSecret).startsWith('•')) c.clientSecret = String(clientSecret).trim();
    const allowed = Object.keys(OFFICE_DEFAULTS);
    saveOffice(Object.fromEntries(Object.entries(rest).filter(([k]) => allowed.includes(k))));
    res.json({ success: true, config: publicConfig() });
  });

  app.post('/api/office/graph/test-connection', async (req: Request, res: Response) => {
    try {
      const cur = creds();
      const tenantId = req.body?.tenantId || cur.tenantId;
      const clientId = req.body?.clientId || cur.clientId;
      const clientSecret = req.body?.clientSecret && !String(req.body.clientSecret).startsWith('•') ? req.body.clientSecret : cur.clientSecret;
      const t = await token(tenantId, clientId, clientSecret);
      const orgRes = await fetch(`${GRAPH}/organization`, { headers: authed(t) });
      if (!orgRes.ok) {
        const e: any = await orgRes.json().catch(() => ({}));
        throw new Error(`Impossible de lire l'organisation Graph (${orgRes.status}): ${e.error?.message || 'vérifiez Organization.Read.All'}`);
      }
      const org = ((await orgRes.json()) as any).value?.[0];
      const organizationName = org?.displayName || 'Organisation Microsoft 365';
      const verifiedDomains = (org?.verifiedDomains || []).map((d: any) => ({
        name: d.name, isDefault: d.isDefault, isInitial: d.isInitial, capabilities: d.capabilities,
      }));
      let domain = office().domain;
      if (!domain) domain = (verifiedDomains.find((d: any) => d.isDefault) || verifiedDomains[0])?.name || '';
      saveOffice({
        organizationName, domain, connectionStatus: 'connected',
        lastTestedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });
      res.json({ success: true, message: `Connexion Microsoft Graph réussie ! Le tenant "${organizationName}" est authentifié et actif.`, organizationName, verifiedDomains, domain });
    } catch (err: any) {
      saveOffice({ connectionStatus: 'error' });
      res.status(400).json({ success: false, message: err.message || 'Erreur inconnue lors du test Microsoft Graph' });
    }
  });

  app.get('/api/office/graph/licenses', async (_req, res) => {
    try {
      const c = creds();
      const t = await token(c.tenantId, c.clientId, c.clientSecret);
      const r = await fetch(`${GRAPH}/subscribedSkus`, { headers: authed(t) });
      if (!r.ok) {
        const e: any = await r.json().catch(() => ({}));
        throw new Error(`Erreur récupération licences (${r.status}): ${e.error?.message || ''}`);
      }
      const licenses = (((await r.json()) as any).value || []).map((sku: any) => {
        const totalUnits = sku.prepaidUnits?.enabled || 0;
        const consumedUnits = sku.consumedUnits || 0;
        return { skuId: sku.skuId, skuPartNumber: sku.skuPartNumber, displayName: sku.skuPartNumber, totalUnits, consumedUnits, availableUnits: Math.max(0, totalUnits - consumedUnits) };
      });
      res.json({ success: true, licenses });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/office/graph/user', async (req: Request, res: Response) => {
    try {
      const { nom, prenom, email, password, forcePasswordChange = true, skuId, groupName } = req.body || {};
      if (!email || !nom || !prenom) {
        return res.status(400).json({ success: false, message: 'Nom, prénom et email sont requis.' });
      }
      const c = creds();
      const t = await token(c.tenantId, c.clientId, c.clientSecret);
      const displayName = `${prenom} ${String(nom).toUpperCase()}`;
      const payload: any = {
        accountEnabled: true, displayName,
        mailNickname: String(email).split('@')[0].replace(/[^a-zA-Z0-9]/g, ''),
        userPrincipalName: email, givenName: prenom, surname: String(nom).toUpperCase(), usageLocation: 'FR',
      };
      const pwd = password ? { passwordProfile: { forceChangePasswordNextSignIn: forcePasswordChange, password } } : null;
      if (pwd) Object.assign(payload, pwd);

      let user: any;
      let isNewUser = true;
      const create = await fetch(`${GRAPH}/users`, { method: 'POST', headers: authed(t, json), body: JSON.stringify(payload) });
      if (create.ok) {
        user = await create.json();
      } else {
        const err: any = await create.json().catch(() => ({}));
        // Graph renvoie 400 (ObjectConflict / "another object with the same value") si l'UPN existe déjà.
        const exists = create.status === 409 || /already exists|same value|ObjectConflict/i.test(JSON.stringify(err));
        if (!exists) throw new Error(`Échec création compte Entra ID pour ${email}: ${err.error?.message || `HTTP ${create.status}`}`);
        isNewUser = false;
        const get = await fetch(`${GRAPH}/users/${encodeURIComponent(email)}`, { headers: authed(t) });
        if (!get.ok) throw new Error(`Utilisateur existant ${email}, mais impossible d'accéder à son profil.`);
        user = await get.json();
        if (pwd) {
          const patch = await fetch(`${GRAPH}/users/${user.id}`, { method: 'PATCH', headers: authed(t, json), body: JSON.stringify(pwd) });
          if (!patch.ok) throw new Error(`Mise à jour du mot de passe refusée pour ${email} (${patch.status}).`);
        }
      }
      const userId = user.id;

      let licenseAssigned = false;
      let licenseError = '';
      if (skuId) {
        const a = await fetch(`${GRAPH}/users/${userId}/assignLicense`, {
          method: 'POST', headers: authed(t, json), body: JSON.stringify({ addLicenses: [{ skuId }], removeLicenses: [] }),
        });
        if (a.ok) licenseAssigned = true;
        else licenseError = ((await a.json().catch(() => ({}))) as any).error?.message || `Erreur assignation licence (${a.status})`;
      }

      let groupAdded = false;
      let groupError = '';
      if (groupName) {
        try {
          const safe = String(groupName).replace(/'/g, "''");
          const s = await fetch(`${GRAPH}/groups?$filter=${encodeURIComponent(`displayName eq '${safe}'`)}`, { headers: authed(t) });
          if (!s.ok) throw new Error(`recherche du groupe (${s.status})`);
          let gid = ((await s.json()) as any).value?.[0]?.id;
          if (!gid) {
            const g = await fetch(`${GRAPH}/groups`, {
              method: 'POST', headers: authed(t, json),
              body: JSON.stringify({ displayName: groupName, mailEnabled: false, mailNickname: String(groupName).toLowerCase().replace(/[^a-z0-9]/g, '') || 'groupe', securityEnabled: true }),
            });
            if (!g.ok) throw new Error(`création du groupe (${g.status})`);
            gid = ((await g.json()) as any).id;
          }
          const m = await fetch(`${GRAPH}/groups/${gid}/members/$ref`, {
            method: 'POST', headers: authed(t, json), body: JSON.stringify({ '@odata.id': `${GRAPH}/directoryObjects/${userId}` }),
          });
          if (m.ok) groupAdded = true;
          else {
            const body = JSON.stringify(await m.json().catch(() => ({})));
            if (m.status === 400 && /already exist/i.test(body)) groupAdded = true; // déjà membre
            else throw new Error(`ajout au groupe (${m.status})`);
          }
        } catch (e: any) {
          groupError = e.message;
          console.warn('Erreur gestion groupe M365:', e.message);
        }
      }

      res.json({
        success: true, isNewUser, userId, userPrincipalName: email, displayName,
        licenseAssigned, licenseError, groupAdded, groupError,
        message: isNewUser ? `Compte ${email} créé avec succès dans Entra ID.` : `Compte ${email} mis à jour dans Entra ID.`,
      });
    } catch (err: any) {
      console.error('Erreur Graph API user creation:', err.message);
      res.status(500).json({ success: false, message: err.message || 'Erreur lors de la création du compte' });
    }
  });
}

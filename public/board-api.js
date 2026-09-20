// Board API client. This file runs in the Board page context, where the
// existing Board session and authentication cookies are available.
const KNOWN_VERSIONS = [
  { pattern: /epm-silicones-dev\.elkem\.com/, version: '14.5' },
  { pattern: /epm-silicones-test\.elkem\.com/, version: '14.5' },
  { pattern: /\.elkem\.com/, version: '14.5' },
  { pattern: /localhost/, version: '14.2' },
  { pattern: /\.toot\.board\.com/, version: '14.3' },
  { pattern: /([a-z])-northeu\.board\.com/, version: '14.4' },
];
const DEFAULT_VERSION = '14.3';

class BoardApiClient {
  constructor() {
    this.connectionId = null;
    this.connectionInitialized = false;
  }

  async request(endpointName, params = {}, bodyOverride = undefined) {
    const version = this.detectVersion();
    const resource = resolveEndpoint(endpointName, version);
    const url = window.location.origin + buildUrl(resource.url, params);
    const token = this.getAccessToken();

    if (endpointName !== 'getClientInfo') {
      await this.ensureConnection(version);
    }

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.connectionId) headers['Board-Connection-Id'] = this.connectionId;
    if (token) headers.Authorization = `Bearer ${token}`;

    const method = resource.method || 'GET';
    const body = method === 'POST'
      ? JSON.stringify(bodyOverride !== undefined ? bodyOverride : resource.data ?? null)
      : undefined;
    const response = await fetch(url, { method, headers, credentials: 'include', body });
    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} ${response.statusText} - ${url}`);
      error.status = response.status;
      error.body = data;
      throw error;
    }

    return { url, method, version, tokenFound: !!token, data };
  }

  async getCoreProcedures(modelId) {
    const { data } = await this.request('getCoreProcedures', { dbname: modelId });
    if (!Array.isArray(data)) throw new Error('The core procedure response is not a list.');
    return data;
  }

  async getAllCubes(modelId) {
    const { data } = await this.request('getAllCubes', { dbname: modelId });
    return data;
  }

  async getProcedureDetails(modelId, procedureId) {
    if (Array.isArray(procedureId)) {
      return Promise.all(
        procedureId.map((id) => this.getProcedureDetails(modelId, id)),
      );
    }

    const { data } = await this.request(
      'getProcedures',
      { dbname: modelId },
      [procedureId],
    );
    const procedure = Array.isArray(data) ? data[0] : data;
    if (!procedure || typeof procedure !== 'object') {
      throw new Error('The procedure response is empty.');
    }

    const procedureGroups = await Promise.all(
      (procedure.procedureGroups ?? []).map(async (group) => ({
        ...group,
        steps: await Promise.all(
          (group.steps ?? []).map((step) => this.loadProcedureStepLayout(
            modelId,
            procedureId,
            step,
          )),
        ),
      })),
    );

    return { ...procedure, procedureGroups };
  }

  async loadProcedureStepLayout(modelId, procedureId, step) {
    if (!Array.isArray(step.configuredLayoutIds) || step.configuredLayoutIds.length === 0) {
      return step;
    }

    const { data: layouts } = await this.request(
      'layoutEditorProcedureGetBlockLayout',
      {
        dbname: modelId,
        procedureId,
        actionId: step.id,
        isNotSaved: false,
      },
    );

    return { ...step, layouts };
  }

  detectVersion() {
    const origin = window.location.origin;
    for (const { pattern, version } of KNOWN_VERSIONS) {
      if (pattern.test(origin)) return version;
    }
    return DEFAULT_VERSION;
  }

  getAccessToken() {
    const v12Key = `oidc.user:${window.location.origin}/:boardwebapplication`;
    let raw = sessionStorage.getItem(v12Key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.access_token) return parsed.access_token;
      } catch { /* try the next storage key */ }
    }

    raw = sessionStorage.getItem('board-oidc-config-id');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.authnResult?.access_token) return parsed.authnResult.access_token;
      } catch { /* try the remaining storage keys */ }
    }

    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key && key.startsWith('oidc.user:')) {
        try {
          const parsed = JSON.parse(sessionStorage.getItem(key));
          if (parsed.access_token) return parsed.access_token;
        } catch { /* keep scanning */ }
      }
    }

    return null;
  }

  async ensureConnection(version) {
    if (!this.connectionId) this.connectionId = crypto.randomUUID();
    if (this.connectionInitialized) return;

    try {
      const resource = resolveEndpoint('startConnectionId', version);
      const url = window.location.origin + buildUrl(resource.url, {
        connectionId: this.connectionId,
      });
      await fetch(url, {
        method: resource.method || 'GET',
        headers: {
          Accept: 'application/json',
          'Board-Connection-Id': this.connectionId,
        },
        credentials: 'include',
      });
      this.connectionInitialized = true;
    } catch (error) {
      console.warn('Board API Bridge: startConnectionId failed', error);
    }
  }
}

const boardApi = new BoardApiClient();

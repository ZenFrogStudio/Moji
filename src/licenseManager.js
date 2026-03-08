'use strict';

const https  = require('https');
const vscode = require('vscode');

const API_HOST = 'txsfvojjzmoxtzhszzoa.supabase.co';
const API_BASE = '/functions/v1/moji-license';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4c2Z2b2pqem1veHR6aHN6em9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTY2MzgsImV4cCI6MjA4ODM5MjYzOH0.4dsx0LktL5pwYAaN3JgVl5A5nEzB7W8KPHyhWapWMY4';

const SECRET_KEY = 'moji_license_key';
const STATE_KEY  = 'moji_license_state'; // globalState key: { validationSuccess, lastValidated, activeDevices, maxDevices }

class LicenseManager {
  constructor(secrets, globalState) {
    this._secrets       = secrets;
    this._globalState   = globalState;
    this._valid         = false;
    this._key           = null;
    this._activeDevices = 0;
    this._maxDevices    = 5;
  }

  /**
   * Called once on extension activation. Reads SecretStorage and uses cached
   * globalState for immediate validity — never blocks on network. Fires async
   * background validation that can revoke premium only on explicit server rejection.
   * @returns {Promise<boolean>}
   */
  async initialize() {
    const key = await this._secrets.get(SECRET_KEY);

    if (!key) {
      this._valid = false;
      return false;
    }

    this._key = key;

    // Use cached validation result for immediate premium access
    const cached = this._globalState.get(STATE_KEY);
    if (cached && cached.validationSuccess) {
      this._valid         = true;
      this._activeDevices = cached.activeDevices || 0;
      this._maxDevices    = cached.maxDevices    || 5;
    }

    // Re-validate in background — only revokes on explicit server rejection
    this._validateAsync(key);

    return this._valid;
  }

  /**
   * Background validation against the server. Updates cached state on success.
   * On explicit rejection (invalid/revoked), clears credentials and fires a
   * decorator refresh. Network failures are silently ignored.
   * @param {string} key
   */
  async _validateAsync(key) {
    try {
      const response = await this._post('/activate', {
        license_key:        key,
        device_fingerprint: vscode.env.machineId,
      });

      if (response.valid === true) {
        // Server confirmed — refresh cached state
        this._valid         = true;
        this._activeDevices = response.active_devices ?? this._activeDevices;
        this._maxDevices    = response.max_devices    ?? this._maxDevices;
        await this._globalState.update(STATE_KEY, {
          validationSuccess: true,
          lastValidated:     Date.now(),
          activeDevices:     this._activeDevices,
          maxDevices:        this._maxDevices,
        });
      } else if (response.valid === false) {
        // Server explicitly rejected — revoke premium access
        this._valid = false;
        this._key   = null;
        await this._secrets.delete(SECRET_KEY);
        await this._globalState.update(STATE_KEY, undefined);
        vscode.commands.executeCommand('mojiPro._refreshDecorator');
        vscode.window.showWarningMessage(
          'Moji Pro: Your license key is no longer valid and has been removed.'
        );
      }
      // Any other response shape — keep existing state unchanged
    } catch (_networkError) {
      // Offline or timeout — cached state stands, no change
    }
  }

  /**
   * Activates a license key against the server. Idempotent — safe to call even
   * if the device is already registered (covers the reinstall scenario).
   * @param {string} licenseKey
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async activate(licenseKey) {
    if (!licenseKey || !licenseKey.trim()) {
      return { success: false, error: 'License key cannot be empty.' };
    }

    const trimmedKey = licenseKey.trim();

    try {
      const response = await this._post('/activate', {
        license_key:        trimmedKey,
        device_fingerprint: vscode.env.machineId,
      });

      if (response.valid === true) {
        // Covers "Device activated" and "Device already activated"
        await this._secrets.store(SECRET_KEY, trimmedKey);
        this._key           = trimmedKey;
        this._valid         = true;
        this._activeDevices = response.active_devices ?? this._activeDevices;
        this._maxDevices    = response.max_devices    ?? this._maxDevices;
        await this._globalState.update(STATE_KEY, {
          validationSuccess: true,
          lastValidated:     Date.now(),
          activeDevices:     this._activeDevices,
          maxDevices:        this._maxDevices,
        });
        return { success: true };
      }

      // Build a human-readable error — surface device counts when limit is hit
      let error = response.error || 'Activation failed. Please check your license key.';
      if (typeof response.active_devices === 'number' && typeof response.max_devices === 'number') {
        error = `All ${response.max_devices} device slots are in use. Deactivate another device to free a slot.`;
      }
      return { success: false, error };

    } catch (_networkError) {
      return { success: false, error: 'Network error. Check your connection and try again.' };
    }
  }

  /**
   * Deactivates the license on this machine. Best-effort server call —
   * local credentials are always cleared regardless of the server response.
   * @returns {Promise<void>}
   */
  async deactivate() {
    const key = this._key;
    try {
      if (key) {
        await this._post('/deactivate', {
          license_key:        key,
          device_fingerprint: vscode.env.machineId,
        });
      }
    } catch (_err) {
      // Best-effort — always clean up locally
    } finally {
      await this._secrets.delete(SECRET_KEY);
      await this._globalState.update(STATE_KEY, undefined);
      this._key           = null;
      this._valid         = false;
      this._activeDevices = 0;
    }
  }

  /**
   * Synchronous validity check — the single gate used throughout the extension.
   * @returns {boolean}
   */
  get isValid() {
    return this._valid;
  }

  /**
   * Returns a partially-masked license key for display (first 8 chars visible),
   * or null if no key is stored.
   * @returns {Promise<string|null>}
   */
  async getMaskedKey() {
    const key = this._key || (await this._secrets.get(SECRET_KEY));
    if (!key) return null;
    if (key.length <= 8) return key;
    return key.slice(0, 8) + '*'.repeat(key.length - 8);
  }

  /**
   * Returns current license status info for display commands.
   * @returns {{ isPremium: boolean, activeDevices: number, maxDevices: number }}
   */
  getLicenseStatus() {
    return {
      isPremium:     this._valid,
      activeDevices: this._activeDevices,
      maxDevices:    this._maxDevices,
    };
  }

  /**
   * Internal HTTP POST to the Supabase Edge Function.
   * Uses Node's built-in https module — no external dependencies.
   * @param {string} endpoint - e.g. '/activate'
   * @param {object} data
   * @returns {Promise<object>} - parsed JSON response
   */
  _post(endpoint, data) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(data);

      const options = {
        hostname: API_HOST,
        path:     `${API_BASE}${endpoint}`,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization':  `Bearer ${ANON_KEY}`,
          'apikey':         ANON_KEY,
        },
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch (_e) {
            reject(new Error('Invalid JSON response from license server'));
          }
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

module.exports = { LicenseManager };

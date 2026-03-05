'use strict';

const https = require('https');
const os    = require('os');

const LS_HOST     = 'api.lemonsqueezy.com';
const SECRET_KEY  = 'moji_license_key';
const SECRET_INST = 'moji_instance_id';

class LicenseManager {
  constructor(secrets) {
    this._secrets    = secrets;
    this._valid      = false;
    this._key        = null;
    this._instanceId = null;
  }

  /**
   * Called once on extension activation. Reads stored credentials and
   * validates them against LemonSqueezy. On network error, allows the
   * extension to run (offline leniency).
   * @returns {Promise<boolean>}
   */
  async initialize() {
    const key        = await this._secrets.get(SECRET_KEY);
    const instanceId = await this._secrets.get(SECRET_INST);

    if (!key || !instanceId) {
      this._valid = false;
      return false;
    }

    try {
      const response = await this._post('/v1/licenses/validate', {
        license_key: key,
        instance_id: instanceId
      });
      this._valid = response.valid === true;
      if (this._valid) {
        this._key        = key;
        this._instanceId = instanceId;
      }
      return this._valid;
    } catch (_networkError) {
      // Offline leniency — assume valid so extension still works without internet
      this._valid      = true;
      this._key        = key;
      this._instanceId = instanceId;
      return true;
    }
  }

  /**
   * Activates a new license key against LemonSqueezy and stores the
   * resulting credentials in SecretStorage.
   * @param {string} licenseKey
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async activate(licenseKey) {
    if (!licenseKey || !licenseKey.trim()) {
      return { success: false, error: 'License key cannot be empty.' };
    }

    const trimmedKey   = licenseKey.trim();
    const instanceName = 'vscode-' + os.hostname()
      .replace(/[^a-zA-Z0-9\-.]/g, '-')
      .slice(0, 50);

    try {
      const response = await this._post('/v1/licenses/activate', {
        license_key:   trimmedKey,
        instance_name: instanceName
      });

      if (response.activated === true) {
        const instanceId = response.instance.id;
        await this._secrets.store(SECRET_KEY, trimmedKey);
        await this._secrets.store(SECRET_INST, instanceId);
        this._key        = trimmedKey;
        this._instanceId = instanceId;
        this._valid      = true;
        return { success: true };
      }

      return {
        success: false,
        error: response.error || 'Activation failed. Please check your license key.'
      };
    } catch (_networkError) {
      return { success: false, error: 'Network error. Check your connection and try again.' };
    }
  }

  /**
   * Deactivates the current license on this machine and clears stored credentials.
   * The LemonSqueezy deactivation call is best-effort; secrets are always cleared.
   * @returns {Promise<void>}
   */
  async deactivate() {
    const key        = this._key;
    const instanceId = this._instanceId;

    try {
      if (key && instanceId) {
        await this._post('/v1/licenses/deactivate', {
          license_key: key,
          instance_id: instanceId
        });
      }
    } catch (_err) {
      // Best-effort — always clean up locally regardless
    } finally {
      await this._secrets.delete(SECRET_KEY);
      await this._secrets.delete(SECRET_INST);
      this._key        = null;
      this._instanceId = null;
      this._valid      = false;
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
   * Internal HTTP POST helper using Node.js built-in https module.
   * LemonSqueezy license endpoints require application/x-www-form-urlencoded.
   * @param {string} path - e.g. '/v1/licenses/validate'
   * @param {object} data - key-value pairs to URL-encode
   * @returns {Promise<object>} - parsed JSON response
   */
  _post(path, data) {
    return new Promise((resolve, reject) => {
      const body = new URLSearchParams(data).toString();

      const options = {
        hostname: LS_HOST,
        path,
        method:  'POST',
        headers: {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'Accept':         'application/json',
        }
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch (_e) {
            reject(new Error('Invalid JSON response from LemonSqueezy'));
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

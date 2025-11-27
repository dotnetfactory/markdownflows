import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Simple settings service for storing application settings
 * Settings are stored in a JSON file in the user data directory
 */
export class SettingsService {
  private settingsPath: string;
  private settings: Record<string, string>;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): Record<string, string> {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[SettingsService] Failed to load settings:', error);
    }
    return {};
  }

  private saveSettings(): void {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('[SettingsService] Failed to save settings:', error);
      throw error;
    }
  }

  get(key: string): string | null {
    return this.settings[key] || null;
  }

  set(key: string, value: string): void {
    this.settings[key] = value;
    this.saveSettings();
  }

  delete(key: string): void {
    delete this.settings[key];
    this.saveSettings();
  }

  getAll(): Record<string, string> {
    return { ...this.settings };
  }

  /**
   * Get the OpenAI API key (securely stored)
   */
  getOpenAIApiKey(): string | null {
    const encryptedKey = this.get('openai_api_key_encrypted');
    if (!encryptedKey) {
      // Fall back to plain text key if no encrypted key exists
      return this.get('openai_api_key');
    }

    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encryptedKey, 'base64');
        return safeStorage.decryptString(buffer);
      }
    } catch (error) {
      console.error('[SettingsService] Failed to decrypt API key:', error);
    }

    return null;
  }

  /**
   * Set the OpenAI API key (securely stored)
   */
  setOpenAIApiKey(apiKey: string): void {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(apiKey);
        this.set('openai_api_key_encrypted', encrypted.toString('base64'));
        // Remove plain text key if it exists
        this.delete('openai_api_key');
      } else {
        // Fall back to plain text if encryption is not available
        console.warn('[SettingsService] Encryption not available, storing API key in plain text');
        this.set('openai_api_key', apiKey);
      }
    } catch (error) {
      console.error('[SettingsService] Failed to encrypt API key:', error);
      throw error;
    }
  }

  /**
   * Get the OpenAI model to use
   */
  getOpenAIModel(): string {
    return this.get('openai_model') || 'gpt-5';
  }

  /**
   * Set the OpenAI model to use
   */
  setOpenAIModel(model: string): void {
    this.set('openai_model', model);
  }
}

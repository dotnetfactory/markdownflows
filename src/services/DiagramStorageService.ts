import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export interface DiagramVersion {
  id: string;
  diagramId: string;
  content: string;
  prompt?: string;
  createdAt: number;
}

export interface DiagramFile {
  id: string;
  name: string;
  content: string;
  prompt?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Generates a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * DiagramStorageService handles saving and loading Mermaid diagram files
 * Files are stored in the user data directory under diagrams
 */
export class DiagramStorageService {
  private diagramsDir: string;
  private versionsDir: string;

  constructor() {
    // Store diagrams in user data directory under diagrams
    const userDataPath = app.getPath('userData');
    this.diagramsDir = path.join(userDataPath, 'diagrams');
    this.versionsDir = path.join(this.diagramsDir, 'versions');

    // Ensure diagrams directory exists
    if (!fs.existsSync(this.diagramsDir)) {
      fs.mkdirSync(this.diagramsDir, { recursive: true });
      console.log(`[DiagramStorageService] Created diagrams directory: ${this.diagramsDir}`);
    }

    // Ensure versions directory exists
    if (!fs.existsSync(this.versionsDir)) {
      fs.mkdirSync(this.versionsDir, { recursive: true });
      console.log(`[DiagramStorageService] Created versions directory: ${this.versionsDir}`);
    }
  }

  /**
   * Get the metadata file path
   */
  private getMetadataPath(): string {
    return path.join(this.diagramsDir, 'metadata.json');
  }

  /**
   * Get the file path for a diagram
   */
  private getDiagramPath(id: string): string {
    return path.join(this.diagramsDir, `${id}.mmd`);
  }

  /**
   * Get the version metadata file path for a diagram
   */
  private getVersionsMetadataPath(diagramId: string): string {
    return path.join(this.versionsDir, `${diagramId}-versions.json`);
  }

  /**
   * Get the file path for a specific version
   */
  private getVersionPath(diagramId: string, versionId: string): string {
    return path.join(this.versionsDir, `${diagramId}-${versionId}.mmd`);
  }

  /**
   * Load version metadata for a diagram
   */
  private loadVersionsMetadata(diagramId: string): Omit<DiagramVersion, 'content'>[] {
    const versionsPath = this.getVersionsMetadataPath(diagramId);
    if (!fs.existsSync(versionsPath)) {
      return [];
    }
    try {
      const data = fs.readFileSync(versionsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[DiagramStorageService] Failed to load versions metadata:', error);
      return [];
    }
  }

  /**
   * Save version metadata for a diagram
   */
  private saveVersionsMetadata(diagramId: string, versions: Omit<DiagramVersion, 'content'>[]): void {
    const versionsPath = this.getVersionsMetadataPath(diagramId);
    try {
      fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2), 'utf-8');
    } catch (error) {
      console.error('[DiagramStorageService] Failed to save versions metadata:', error);
      throw error;
    }
  }

  /**
   * Create a new version for a diagram
   */
  private createVersion(diagramId: string, content: string, prompt?: string): DiagramVersion {
    const versionId = generateId();
    const now = Date.now();

    // Save version content
    const versionPath = this.getVersionPath(diagramId, versionId);
    fs.writeFileSync(versionPath, content, 'utf-8');

    // Update versions metadata
    const versions = this.loadVersionsMetadata(diagramId);
    const newVersion: Omit<DiagramVersion, 'content'> = {
      id: versionId,
      diagramId,
      prompt,
      createdAt: now,
    };
    versions.push(newVersion);
    this.saveVersionsMetadata(diagramId, versions);

    console.log(`[DiagramStorageService] Created version ${versionId} for diagram ${diagramId}`);

    return {
      ...newVersion,
      content,
    };
  }

  /**
   * Load metadata from disk
   */
  private loadMetadata(): Record<string, Omit<DiagramFile, 'content'>> {
    const metadataPath = this.getMetadataPath();
    if (!fs.existsSync(metadataPath)) {
      return {};
    }
    try {
      const data = fs.readFileSync(metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[DiagramStorageService] Failed to load metadata:', error);
      return {};
    }
  }

  /**
   * List all versions for a diagram
   */
  async listVersions(diagramId: string): Promise<DiagramVersion[]> {
    try {
      const versionsMetadata = this.loadVersionsMetadata(diagramId);
      const versions: DiagramVersion[] = [];

      for (const meta of versionsMetadata) {
        const versionPath = this.getVersionPath(diagramId, meta.id);
        if (fs.existsSync(versionPath)) {
          const content = fs.readFileSync(versionPath, 'utf-8');
          versions.push({
            ...meta,
            content,
          });
        }
      }

      // Sort by createdAt descending (newest first)
      versions.sort((a, b) => b.createdAt - a.createdAt);

      return versions;
    } catch (error) {
      console.error('[DiagramStorageService] Failed to list versions:', error);
      throw error;
    }
  }

  /**
   * Get a specific version by ID
   */
  async getVersion(diagramId: string, versionId: string): Promise<DiagramVersion | null> {
    try {
      const versionsMetadata = this.loadVersionsMetadata(diagramId);
      const meta = versionsMetadata.find(v => v.id === versionId);
      
      if (!meta) {
        return null;
      }

      const versionPath = this.getVersionPath(diagramId, versionId);
      if (!fs.existsSync(versionPath)) {
        return null;
      }

      const content = fs.readFileSync(versionPath, 'utf-8');
      return {
        ...meta,
        content,
      };
    } catch (error) {
      console.error('[DiagramStorageService] Failed to get version:', error);
      throw error;
    }
  }

  /**
   * Save metadata to disk
   */
  private saveMetadata(metadata: Record<string, Omit<DiagramFile, 'content'>>): void {
    const metadataPath = this.getMetadataPath();
    try {
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    } catch (error) {
      console.error('[DiagramStorageService] Failed to save metadata:', error);
      throw error;
    }
  }

  /**
   * List all saved diagrams
   */
  async list(): Promise<DiagramFile[]> {
    try {
      const metadata = this.loadMetadata();
      const diagrams: DiagramFile[] = [];

      for (const [id, meta] of Object.entries(metadata)) {
        const filePath = this.getDiagramPath(id);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          diagrams.push({
            id,
            name: meta.name,
            content,
            prompt: meta.prompt,
            createdAt: meta.createdAt,
            updatedAt: meta.updatedAt,
          });
        }
      }

      // Sort by updatedAt descending
      diagrams.sort((a, b) => b.updatedAt - a.updatedAt);

      return diagrams;
    } catch (error) {
      console.error('[DiagramStorageService] Failed to list diagrams:', error);
      throw error;
    }
  }

  /**
   * Get a diagram by ID
   */
  async getById(id: string): Promise<DiagramFile | null> {
    try {
      const metadata = this.loadMetadata();
      const meta = metadata[id];
      if (!meta) {
        return null;
      }

      const filePath = this.getDiagramPath(id);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        id,
        name: meta.name,
        content,
        prompt: meta.prompt,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      };
    } catch (error) {
      console.error('[DiagramStorageService] Failed to get diagram:', error);
      throw error;
    }
  }

  /**
   * Create a new diagram
   */
  async create(name: string, content: string, prompt?: string): Promise<DiagramFile> {
    try {
      const id = generateId();
      const now = Date.now();

      // Save the content file
      const filePath = this.getDiagramPath(id);
      fs.writeFileSync(filePath, content, 'utf-8');

      // Update metadata
      const metadata = this.loadMetadata();
      metadata[id] = {
        id,
        name,
        prompt,
        createdAt: now,
        updatedAt: now,
      };
      this.saveMetadata(metadata);

      // Create initial version
      this.createVersion(id, content, prompt);

      console.log(`[DiagramStorageService] Created diagram: ${name} (${id})`);

      return {
        id,
        name,
        content,
        prompt,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('[DiagramStorageService] Failed to create diagram:', error);
      throw error;
    }
  }

  /**
   * Update an existing diagram
   */
  async update(id: string, content: string, prompt?: string): Promise<DiagramFile> {
    try {
      const metadata = this.loadMetadata();
      const meta = metadata[id];
      if (!meta) {
        throw new Error(`Diagram not found: ${id}`);
      }

      const now = Date.now();

      // Update the content file
      const filePath = this.getDiagramPath(id);
      fs.writeFileSync(filePath, content, 'utf-8');

      // Create a new version
      this.createVersion(id, content, prompt);

      // Update metadata with the latest prompt if provided
      metadata[id] = {
        ...meta,
        prompt: prompt ?? meta.prompt,
        updatedAt: now,
      };
      this.saveMetadata(metadata);

      console.log(`[DiagramStorageService] Updated diagram: ${meta.name} (${id})`);

      return {
        id,
        name: meta.name,
        content,
        prompt: prompt ?? meta.prompt,
        createdAt: meta.createdAt,
        updatedAt: now,
      };
    } catch (error) {
      console.error('[DiagramStorageService] Failed to update diagram:', error);
      throw error;
    }
  }

  /**
   * Delete a diagram
   */
  async delete(id: string): Promise<void> {
    try {
      const metadata = this.loadMetadata();
      const meta = metadata[id];
      if (!meta) {
        throw new Error(`Diagram not found: ${id}`);
      }

      // Delete the content file
      const filePath = this.getDiagramPath(id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete all version files
      const versionsMetadata = this.loadVersionsMetadata(id);
      for (const version of versionsMetadata) {
        const versionPath = this.getVersionPath(id, version.id);
        if (fs.existsSync(versionPath)) {
          fs.unlinkSync(versionPath);
        }
      }

      // Delete versions metadata file
      const versionsMetadataPath = this.getVersionsMetadataPath(id);
      if (fs.existsSync(versionsMetadataPath)) {
        fs.unlinkSync(versionsMetadataPath);
      }

      // Remove from metadata
      delete metadata[id];
      this.saveMetadata(metadata);

      console.log(`[DiagramStorageService] Deleted diagram: ${meta.name} (${id})`);
    } catch (error) {
      console.error('[DiagramStorageService] Failed to delete diagram:', error);
      throw error;
    }
  }

  /**
   * Rename a diagram
   */
  async rename(id: string, newName: string): Promise<DiagramFile> {
    try {
      const metadata = this.loadMetadata();
      const meta = metadata[id];
      if (!meta) {
        throw new Error(`Diagram not found: ${id}`);
      }

      const now = Date.now();

      // Update metadata
      metadata[id] = {
        ...meta,
        name: newName,
        updatedAt: now,
      };
      this.saveMetadata(metadata);

      // Get current content
      const filePath = this.getDiagramPath(id);
      const content = fs.readFileSync(filePath, 'utf-8');

      console.log(`[DiagramStorageService] Renamed diagram: ${meta.name} -> ${newName} (${id})`);

      return {
        id,
        name: newName,
        content,
        prompt: meta.prompt,
        createdAt: meta.createdAt,
        updatedAt: now,
      };
    } catch (error) {
      console.error('[DiagramStorageService] Failed to rename diagram:', error);
      throw error;
    }
  }

  /**
   * Restore a diagram from a specific version
   */
  async restoreVersion(diagramId: string, versionId: string): Promise<DiagramFile> {
    try {
      const version = await this.getVersion(diagramId, versionId);
      if (!version) {
        throw new Error(`Version not found: ${versionId}`);
      }

      // Update the diagram with the version content (this also creates a new version)
      return this.update(diagramId, version.content, version.prompt);
    } catch (error) {
      console.error('[DiagramStorageService] Failed to restore version:', error);
      throw error;
    }
  }
}

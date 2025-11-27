import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export interface DiagramFile {
  id: string;
  name: string;
  content: string;
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

  constructor() {
    // Store diagrams in user data directory under diagrams
    const userDataPath = app.getPath('userData');
    this.diagramsDir = path.join(userDataPath, 'diagrams');

    // Ensure diagrams directory exists
    if (!fs.existsSync(this.diagramsDir)) {
      fs.mkdirSync(this.diagramsDir, { recursive: true });
      console.log(`[DiagramStorageService] Created diagrams directory: ${this.diagramsDir}`);
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
  async create(name: string, content: string): Promise<DiagramFile> {
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
        createdAt: now,
        updatedAt: now,
      };
      this.saveMetadata(metadata);

      console.log(`[DiagramStorageService] Created diagram: ${name} (${id})`);

      return {
        id,
        name,
        content,
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
  async update(id: string, content: string): Promise<DiagramFile> {
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

      // Update metadata
      metadata[id] = {
        ...meta,
        updatedAt: now,
      };
      this.saveMetadata(metadata);

      console.log(`[DiagramStorageService] Updated diagram: ${meta.name} (${id})`);

      return {
        id,
        name: meta.name,
        content,
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
        createdAt: meta.createdAt,
        updatedAt: now,
      };
    } catch (error) {
      console.error('[DiagramStorageService] Failed to rename diagram:', error);
      throw error;
    }
  }
}

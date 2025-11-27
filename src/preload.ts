import { contextBridge, ipcRenderer } from 'electron';

export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

export interface DiagramFile {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const diagramsAPI = {
  list: (): Promise<IPCResponse<DiagramFile[]>> => ipcRenderer.invoke('diagrams:list'),
  getById: (id: string): Promise<IPCResponse<DiagramFile | null>> =>
    ipcRenderer.invoke('diagrams:getById', id),
  create: (name: string, content: string): Promise<IPCResponse<DiagramFile>> =>
    ipcRenderer.invoke('diagrams:create', name, content),
  update: (id: string, content: string): Promise<IPCResponse<DiagramFile>> =>
    ipcRenderer.invoke('diagrams:update', id, content),
  delete: (id: string): Promise<IPCResponse<void>> => ipcRenderer.invoke('diagrams:delete', id),
  generate: (prompt: string, existingDiagram?: string): Promise<IPCResponse<string>> =>
    ipcRenderer.invoke('diagrams:generate', prompt, existingDiagram),
  rename: (id: string, newName: string): Promise<IPCResponse<DiagramFile>> =>
    ipcRenderer.invoke('diagrams:rename', id, newName),
  revealInFinder: (): Promise<IPCResponse<string>> =>
    ipcRenderer.invoke('diagrams:revealInFinder'),
};

const settingsAPI = {
  get: (key: string): Promise<IPCResponse<string | null>> =>
    ipcRenderer.invoke('settings:get', key),
  set: (key: string, value: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke('settings:set', key, value),
  getAll: (): Promise<IPCResponse<Record<string, string>>> =>
    ipcRenderer.invoke('settings:getAll'),
};

const openaiAPI = {
  test: (): Promise<IPCResponse<{ model: string; message: string }>> =>
    ipcRenderer.invoke('openai:test'),
};

const platformAPI = {
  platform: process.platform as 'darwin' | 'win32' | 'linux',
};

contextBridge.exposeInMainWorld('api', {
  diagrams: diagramsAPI,
  settings: settingsAPI,
  openai: openaiAPI,
  platform: platformAPI,
});

// Type declarations for the exposed API
declare global {
  interface Window {
    api: {
      diagrams: typeof diagramsAPI;
      settings: typeof settingsAPI;
      openai: typeof openaiAPI;
      platform: typeof platformAPI;
    };
  }
}

import { app, BrowserWindow, ipcMain, nativeImage, shell, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { DiagramStorageService } from './services/DiagramStorageService';
import { OpenAIService } from './services/OpenAIService';
import { SettingsService } from './services/SettingsService';

// Set app name for menu bar (must be called before ready)
if (app.setName) {
  app.setName('MarkdownFlows');
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Services
let diagramStorageService: DiagramStorageService;
let openaiService: OpenAIService;
let settingsService: SettingsService;

const createWindow = () => {
  // Try to load icon
  let icon: Electron.NativeImage | undefined;
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    // Set dock icon on macOS
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(icon);
    }
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Initialize services
  settingsService = new SettingsService();
  diagramStorageService = new DiagramStorageService();
  openaiService = new OpenAIService(settingsService);

  // Set up custom menu for macOS to show correct app name
  if (process.platform === 'darwin') {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'MarkdownFlows',
        submenu: [
          { role: 'about', label: 'About MarkdownFlows' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide', label: 'Hide MarkdownFlows' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit', label: 'Quit MarkdownFlows' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  createWindow();

  // On macOS, re-create a window when the dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
});

// ============================================================================
// IPC Handlers - Diagrams
// ============================================================================

ipcMain.handle('diagrams:list', async () => {
  try {
    const diagrams = await diagramStorageService.list();
    return { success: true, data: diagrams };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to list diagrams',
        code: 'DIAGRAM_LIST_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:getById', async (_, id: string) => {
  try {
    const diagram = await diagramStorageService.getById(id);
    return { success: true, data: diagram };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get diagram',
        code: 'DIAGRAM_GET_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:create', async (_, name: string, content: string, prompt?: string) => {
  try {
    const diagram = await diagramStorageService.create(name, content, prompt);
    return { success: true, data: diagram };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create diagram',
        code: 'DIAGRAM_CREATE_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:update', async (_, id: string, content: string, prompt?: string) => {
  try {
    const diagram = await diagramStorageService.update(id, content, prompt);
    return { success: true, data: diagram };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update diagram',
        code: 'DIAGRAM_UPDATE_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:delete', async (_, id: string) => {
  try {
    await diagramStorageService.delete(id);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to delete diagram',
        code: 'DIAGRAM_DELETE_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:generate', async (_, prompt: string, existingDiagram?: string) => {
  try {
    const result = await openaiService.generateMermaidDiagram(prompt, existingDiagram);
    return result;
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to generate diagram',
        code: 'DIAGRAM_GENERATE_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:rename', async (_, id: string, newName: string) => {
  try {
    const diagram = await diagramStorageService.rename(id, newName);
    return { success: true, data: diagram };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to rename diagram',
        code: 'DIAGRAM_RENAME_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:revealInFinder', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const diagramsPath = path.join(userDataPath, 'diagrams');
    await shell.openPath(diagramsPath);
    return { success: true, data: diagramsPath };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to reveal in Finder',
        code: 'DIAGRAM_REVEAL_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:listVersions', async (_, diagramId: string) => {
  try {
    const versions = await diagramStorageService.listVersions(diagramId);
    return { success: true, data: versions };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to list versions',
        code: 'DIAGRAM_LIST_VERSIONS_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:getVersion', async (_, diagramId: string, versionId: string) => {
  try {
    const version = await diagramStorageService.getVersion(diagramId, versionId);
    return { success: true, data: version };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get version',
        code: 'DIAGRAM_GET_VERSION_ERROR',
      },
    };
  }
});

ipcMain.handle('diagrams:restoreVersion', async (_, diagramId: string, versionId: string) => {
  try {
    const diagram = await diagramStorageService.restoreVersion(diagramId, versionId);
    return { success: true, data: diagram };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to restore version',
        code: 'DIAGRAM_RESTORE_VERSION_ERROR',
      },
    };
  }
});

// ============================================================================
// IPC Handlers - Settings
// ============================================================================

ipcMain.handle('settings:get', async (_, key: string) => {
  try {
    const value = settingsService.get(key);
    return { success: true, data: value };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get setting',
        code: 'SETTINGS_GET_ERROR',
      },
    };
  }
});

ipcMain.handle('settings:set', async (_, key: string, value: string) => {
  try {
    // Handle OpenAI API key specially - store it securely
    if (key === 'openai_api_key') {
      settingsService.setOpenAIApiKey(value);
    } else {
      settingsService.set(key, value);
    }
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to set setting',
        code: 'SETTINGS_SET_ERROR',
      },
    };
  }
});

ipcMain.handle('settings:getAll', async () => {
  try {
    const settings = settingsService.getAll();
    return { success: true, data: settings };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get settings',
        code: 'SETTINGS_GET_ALL_ERROR',
      },
    };
  }
});

// ============================================================================
// IPC Handlers - OpenAI
// ============================================================================

ipcMain.handle('openai:test', async () => {
  try {
    const result = await openaiService.testConnection();
    return result;
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to test OpenAI connection',
        code: 'OPENAI_TEST_ERROR',
      },
    };
  }
});

// Declare the constants that Vite injects
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

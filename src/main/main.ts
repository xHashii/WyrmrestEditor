import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { service } from '../core/service.js';
import { APP_ROOT } from '../core/paths.js';

/**
 * Electron main process — thin shell around WyrmrestService.
 *
 * Every renderer call arrives as `wyrmrest:<method>` and is forwarded to the
 * same service object the HTTP server uses, so desktop and browser behave
 * identically.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devServer = process.env.WYRMREST_DEV_SERVER;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#12151c',
    title: 'Wyrmrest Editor',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (devServer) {
    void mainWindow.loadURL(devServer);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(APP_ROOT, 'dist', 'renderer', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Export staged changes…',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('wyrmrest:menu', 'export'),
        },
        {
          label: 'Connection settings…',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('wyrmrest:menu', 'settings'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
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
      label: 'Help',
      submenu: [
        {
          label: 'TrinityCore database documentation',
          click: () => shell.openExternal('https://trinitycore.info/en/database/master/world/home'),
        },
        {
          label: 'About Wyrmrest Editor',
          click: () =>
            dialog.showMessageBox({
              type: 'info',
              title: 'Wyrmrest Editor',
              message: 'Wyrmrest Editor',
              detail:
                'TrinityCore 3.4.3 database editor.\n' +
                'Metadata generated from the shipped schema dumps and the TrinityCore wiki.',
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

type Handler = (...args: any[]) => unknown;

const handlers: Record<string, Handler> = {
  getIndex: () => service.getIndex(),
  getTable: (database: never, table: string) => service.getTable(database, table),
  getStatus: () => service.getStatus(),
  connect: (profile: never) => service.connect(profile),
  useDemo: () => service.useDemo(),
  disconnect: () => service.disconnect(),
  query: (request: never) => service.query(request),
  lookup: (request: never) => service.lookup(request),
  resolveNames: (entity: string, ids: never) => service.resolveNames(entity, ids),
  getLedger: () => service.getLedger(),
  stage: (request: never) => service.stage(request),
  revert: (ids: never) => service.revert(ids),
  clearLedger: () => service.clearLedger(),
  previewSql: (ids: never) => service.previewSql(ids),
  exportSql: (request: never) => service.exportSql(request),
  applyToDatabase: (ids: never) => service.applyToDatabase(ids),
  getSettings: () => service.getSettings(),
  saveSettings: (patch: never) => service.saveSettings(patch),
  chooseExportRoot: async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose the repository root for sql/updates exports',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return service.saveSettings({ exportRoot: result.filePaths[0] });
  },
  revealPath: async (target: string) => {
    shell.showItemInFolder(target);
    return true;
  },
};

for (const [name, handler] of Object.entries(handlers)) {
  ipcMain.handle(`wyrmrest:${name}`, async (_event, ...args) => {
    try {
      return { ok: true, data: await handler(...args) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
}

void app.whenReady().then(async () => {
  buildMenu();
  await service.restore().catch(() => undefined);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  void service.shutdown();
});

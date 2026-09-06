// Preload bridge. CommonJS on purpose: Electron loads .cjs preloads directly,
// no bundling step required.
const { contextBridge, ipcRenderer } = require('electron');

const call = (channel, ...args) => ipcRenderer.invoke(`wyrmrest:${channel}`, ...args);

contextBridge.exposeInMainWorld('wyrmrest', {
  isDesktop: true,
  platform: process.platform,
  invoke: call,
  onMenu: (handler) => {
    const listener = (_event, action) => handler(action);
    ipcRenderer.on('wyrmrest:menu', listener);
    return () => ipcRenderer.removeListener('wyrmrest:menu', listener);
  },
});

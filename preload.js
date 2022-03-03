
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    closeWindow: () => ipcRenderer.invoke('closeWindow'),
    minWindow: () => ipcRenderer.invoke('minWindow'),
    toggleMaxWindow: () => ipcRenderer.invoke('toggleMaxWindow')
});
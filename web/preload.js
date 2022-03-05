
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    invokeIpc: ipcRenderer.invoke
});

window.addEventListener('load', () => {
    document.getElementById('versionNode').innerText = process.versions.node;
    document.getElementById('versionElectron').innerText = process.versions.electron;
    document.getElementById('versionChrome').innerText = process.versions.chrome;
});
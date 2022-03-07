
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    ipcRenderer: {
        on: (channel, code) => { ipcRenderer.on(channel, code) },
        invoke: ipcRenderer.invoke
    }
});

window.addEventListener('load', () => {
    // Set version element contents
    document.getElementById('versionNode').innerText = process.versions.node;
    document.getElementById('versionElectron').innerText = process.versions.electron;
    document.getElementById('versionChrome').innerText = process.versions.chrome;
});
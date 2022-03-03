
const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

app.on('ready', () => {
    const win = new BrowserWindow({
        width: 800,
        height: 530,
        minWidth: 550,
        minHeight: 320,
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    // Load the HTML file
    win.loadFile('./web/main.html');
    // Add IPC handles
    ipcMain.handle('closeWindow', () => {
        win.close();
    });
    ipcMain.handle('minWindow', () => {
        win.minimize();
    });
    ipcMain.handle('toggleMaxWindow', () => {
        if (win.isMaximized())
            win.unmaximize();
        else
            win.maximize();
    });
});
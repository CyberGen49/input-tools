
const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// See the "About" tab in the main window for program versions

app.on('ready', () => {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 900,
        minHeight: 600,
        transparent: false,
        autoHideMenuBar: true,
        frame: false,
        show: false,
        icon: 'icon.png',
        webPreferences: {
            preload: path.join(__dirname, 'web/preload.js')
        }
    });
    // Load the HTML file
    win.loadFile('./web/main.html');
    // Handle window controls
    ipcMain.handle('closeWindow', () => { win.close(); });
    ipcMain.handle('minWindow', () => { win.minimize(); });
    ipcMain.handle('toggleMaxWindow', () => {
        if (win.isMaximized()) win.unmaximize(); else win.maximize();
    });
    // Handle opening external links
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
    // Handle the auto clicker
    let autoClickStatus = false;
    let autoClickProcess;
    ipcMain.handle('autoClicker', (event, opts) => {
        if (opts.status == 'start' && !autoClickStatus) {
            autoClickProcess = spawn('autoclick-cli.exe', [
                '--run',
                '--button', opts.button,
                '--interval', opts.interval,
                '--double', new Boolean(opts.double).toString(),
            ]);
            autoClickProcess.stdout.on('data', (data) => {
                console.log(data.toString());
            });
            autoClickStatus = true;
        }
        if (opts.status == 'stop' && autoClickStatus) {
            autoClickProcess.kill();
            autoClickStatus = false;
        }
    });
    // Show the window once it's fully loaded
    win.once('ready-to-show', () => {
        win.show();
    });
    // Quit the app if the main window is closed
    win.on('close', () => { app.quit() });
});
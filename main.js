
const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const robot = require('robotjs');
const EventEmitter = require('events')
const autoClickEmitter = new EventEmitter();

console.log(`Node.js version: ${process.versions.node}`);
console.log(`Electron version: ${process.versions.electron}`);
console.log(`Chromium version: ${process.versions.chrome}`);

app.on('ready', () => {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        //minWidth: 550,
        //minHeight: 320,
        minWidth: 900,
        minHeight: 600,
        transparent: false,
        autoHideMenuBar: true,
        frame: false,
        show: false,
        icon: 'icon.png',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
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
    // Handle the auto clicker
    let autoClickInterval;
    let autoClickTimeout;
    let autoClickStatus = false;
    let autoClickLastClick = 0;
    ipcMain.handle('autoClicker', (event, opts) => {
        if (opts.status == 'start' && !autoClickStatus) {
            autoClickInterval = setInterval(() => {
                if (Date.now() > (autoClickLastClick+opts.delay)) {
                    autoClickLastClick = Date.now();
                    autoClickEmitter.emit('click', opts);
                    //console.log(`Click took ${Date.now()-autoClickLastClick}ms`);
                }
            }, 1);
            console.log('Started autoclicker:', opts);
            autoClickStatus = true;
        }
        if (opts.status == 'stop' && autoClickStatus) {
            clearInterval(autoClickInterval);
            clearTimeout(autoClickTimeout);
            console.log('Stopped autoclicker:', opts);
            autoClickStatus = false;
        }
    });
    autoClickEmitter.on('click', (opts) => {
        robot.mouseClick(opts.button, opts.double);
        console.log('Clicked');
    });
    // Show the window once it's fully loaded
    win.once('ready-to-show', () => {
        win.show();
    });
});

const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const clc = require('cli-color');

// See the "About" tab in the main window for program versions

app.on('ready', () => {
    app.setAppUserModelId('org.simplecyber.inputTools');
    // Build the window
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
    // Quit the app if the main window is closed
    win.on('close', () => { app.quit() });
    // Handle window controls
    // Handle opening external links
    win.webContents.setWindowOpenHandler(({url}) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
    // Load the HTML file
    win.loadFile('./web/main.html');
    // Show the window once it's fully loaded
    win.once('ready-to-show', () => {
        win.show();
    });
    // Create main websocket
    const wss = new WebSocketServer({ port: 31264 });
    wss.on('listening', () => {
        console.log(clc.greenBright('Main:'), `Interval websocket is ready`);
    });
    // On new websocket connection
    wss.on('connection', (ws, request) => {
        // On new websocket message
        ws.on('message', (dataRaw) => {
            const data = JSON.parse(dataRaw);
            // If the message is for main
            if (data.to == 'main') {
                console.log(clc.greenBright('Main:'), `Received WS message:`, data);
                // Handle window controls
                if (data.action == 'closeWindow') win.close();
                if (data.action == 'minWindow') win.minimize();
                if (data.action == 'toggleMaxWindow') {
                    if (win.isMaximized()) win.unmaximize();
                    else win.maximize();
                }
            // Otherwise, resend it to all clients
            } else {
                console.log(clc.greenBright('Main:'), `Passing along WS message:`, data);
                wss.clients.forEach((client) => {
                    client.send(dataRaw);
                });
            }
        });
    });
    // Handle the auto clicker
    const robot = spawn(path.join(__dirname, 'robot.exe').replace('app.asar', 'app.asar.unpacked'));
    robot.stdout.on('data', (data) => {
        console.log(data.toString().replace("\n", ''));
    });
    robot.on('close', () => {
        console.log(clc.greenBright('Main:'), `Robot process has died`);
    });
});
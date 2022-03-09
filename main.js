
const { app, BrowserWindow, globalShortcut, ipcMain, shell, screen } = require('electron');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const clc = require('cli-color');
const fs = require('fs');

const isObject = (item) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
const mergeDeep = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, {
                    [key]: {}
                });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, {
                    [key]: source[key]
                });
            }
        }
    }
    return mergeDeep(target, ...sources);
}

// Nothing happens until Electron is ready
app.on('ready', () => {
    app.setAppUserModelId('org.simplecyber.inputTools');
    const primaryDisplay = screen.getPrimaryDisplay();
    const dataDir = app.getPath('userData');
    // Compile user data
    let targetStructureVersion = 1;
    let userData = {
        structureVersion: targetStructureVersion,
            // If the version of the settings file doesn't match, we won't load it
        dataDir: dataDir,  
        versions: process.versions,
        autoClick: {
            shortcut: ['CommandOrControl', 'Alt', 'A']
        }
    };
    if (fs.existsSync(path.join(dataDir, 'settings.json'))) {
        let dataFromFile = JSON.stringify(fs.readFileSync(path.join(dataDir, 'settings.json')));
        if (dataFromFile.structureVersion === targetStructureVersion) {
            mergeDeep(userData, dataFromFile);
            console.log(clc.greenBright('Main:'), `Loaded data from settings.json`);
        } console.log(clc.greenBright('Main:'), `settings.json doesn't match targetStructureVersion, so it wasn't loaded`);
    } else console.log(clc.greenBright('Main:'), `settings.json doesn't exist, so no data was loaded`);

    // Build the main window
    const ui = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 900,
        minHeight: 600,
        autoHideMenuBar: true,
        frame: false,
        show: false,
        icon: 'icon.png'
    });
    ui.loadFile('ui/main.html');
    // Show the window once it's fully loaded
    ui.once('ready-to-show', () => { ui.show(); });
    // Quit the app if the main window is closed
    ui.on('close', () => { app.quit() });
    // Handle opening external links
    ui.webContents.setWindowOpenHandler(({url}) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Build overlay window
    const overlay = new BrowserWindow({
        x: primaryDisplay.workArea.x,
        y: (primaryDisplay.workArea.height-150),
        height: 200,
        width: primaryDisplay.workArea.width,
        frame: false,
        transparent: true,
        autoHideMenuBar: true,
        focusable: false,
        resizable: false,
        maximizable: false,
        minimizable: false,
        backgroundColor: '#00000000',
        show: false,
    });
    overlay.setAlwaysOnTop(true, 'floating');
    overlay.setIgnoreMouseEvents(true);
    overlay.loadFile('overlay/main.html');
    
    // Create main websocket
    const wssPort = 31264;
    const wss = new WebSocketServer({ port: wssPort });
    wss.on('listening', () => {
        console.log(clc.greenBright('Main:'), `Internal websocket is listening on port ${wssPort}`);
    });
    // Send a message to all connected clients
    wss.broadcast = (data) => {
        wss.clients.forEach((client) => {
            client.send(JSON.stringify(data));
        });
    };
    // On new websocket connection
    wss.on('connection', (ws, request) => {
        // On new websocket message
        ws.on('message', (dataRaw) => {
            const data = JSON.parse(dataRaw);
            // If the message is for main
            if (data.to == 'main') {
                console.log(clc.greenBright('Main:'), `Received WS message:`, data);
                // Handle window controls
                if (data.action == 'closeWindow') ui.close();
                if (data.action == 'minWindow') ui.minimize();
                if (data.action == 'toggleMaxWindow') {
                    if (ui.isMaximized()) ui.unmaximize();
                    else ui.maximize();
                }
                // Handle sending user data to renderer
                if (data.action == 'getData') {
                    wss.broadcast({ to: 'renderer', action: 'userData', data: userData });
                }
                // Handle opening the data folder
                if (data.action == 'openDataFolder') {
                    shell.openPath(dataDir);
                }
                // Handle the auto-click overlay
                if (data.action == 'showAutoClickPopup') overlay.show();
                if (data.action == 'hideAutoClickPopup') overlay.hide();
            // Otherwise, resend it to all clients
            } else {
                console.log(clc.greenBright('Main:'), `Passing along WS message:`, data);
                wss.broadcast(data);
            }
        });
    });

    // Spawn and handle the robot process
    const spawnRobot = () => {
        const robot = spawn(path.join(__dirname, 'robot.exe').replace('app.asar', 'app.asar.unpacked'));
        robot.stdout.on('data', (data) => {
            console.log(data.toString().replace("\n", ''));
        });
        robot.on('close', () => {
            console.log(clc.greenBright('Main:'), `Robot process has died`);
            // Respawn the process
            spawnRobot();
        });
    };
    spawnRobot();

    // Handle global keyboard shortcuts
    const registerShortcuts = () => {
        globalShortcut.unregisterAll();
        const registerShortcut = (accelerator, callback) => {
            if (globalShortcut.register(accelerator, callback))
                console.log(clc.greenBright('Main:'), `Registered shortcut ${accelerator}`);
            else
                console.log(clc.greenBright('Main:'), `Failed to register shortcut ${accelerator}`);
        }
        try {
            let accelerator = userData.autoClick.shortcut.join('+');
            registerShortcut(accelerator, () => {
                wss.broadcast({ to: 'renderer', action: 'toggleAutoClick' });
            });
        } catch (error) {}
    };
    registerShortcuts();
});
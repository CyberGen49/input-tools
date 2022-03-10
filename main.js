
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
    const dataFile = path.join(dataDir, 'settings.json');
    // Compile user data
    let userData = {
        inputs: {},
        shortcuts: {
            autoClick: ['CommandOrControl', 'Alt', 'A']
        }
    };
    // If the settings file exists
    if (fs.existsSync(dataFile)) {
        // Load the file
        let dataFromFile = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
        // Merge contents
        Object.assign(userData.inputs, dataFromFile.inputs);
        Object.assign(userData.shortcuts, dataFromFile.shortcuts);
        // Add extra data
        userData.dataDir = dataDir;
        userData.versions = process.versions;
        console.log(clc.greenBright('Main:'), `Loaded data from settings.json`);
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
    //overlay.webContents.openDevTools();

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
                // Handle saving data sent from renderer
                if (data.action == 'saveData') {
                    userData = data.data;
                    let dataToSave = {}
                    dataToSave.inputs = userData.inputs;
                    dataToSave.shortcuts = userData.shortcuts;
                    fs.writeFile(dataFile, JSON.stringify(dataToSave), (err) => {
                        if (err) {
                            console.log(clc.greenBright('Main:'), `Error writing user data to file:`, err);
                            return
                        }
                        console.log(clc.greenBright('Main:'), `Saved user data to file`);
                        if (data.reRegisterShortcuts) registerShortcuts();
                        wss.broadcast({ to: 'renderer', action: 'userData', data: userData });
                    });
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
        let shortcutNames = Object.keys(userData.shortcuts);
        shortcutNames.forEach((name) => {
            const accelerator = userData.shortcuts[name].join('+');
            let callback = () => {};
            if (name == 'autoClick') callback = () => {
                wss.broadcast({ to: 'renderer', action: 'toggleAutoClick' });
            };
            if (globalShortcut.register(accelerator, callback))
                console.log(clc.greenBright('Main:'), `Bound ${name} shortcut to ${accelerator}`);
            else
                console.log(clc.greenBright('Main:'), `Failed to bind ${name} shortcut to ${accelerator}`);
        });
    };
    registerShortcuts();
});
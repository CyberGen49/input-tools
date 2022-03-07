
const robot = require('robotjs');
const WebSocket = require('ws').WebSocket;
const clc = require('cli-color');

function connectWs() {
    const ws = new WebSocket(`ws://localhost:31264`);
    ws.on('open', () => {
        console.log(clc.blueBright('Robot:'), `Connected to main websocket`);
    });
    ws.on('close', () => {
        console.log(clc.blueBright('Robot:'), `Lost connection to main websocket`);
        setTimeout(connectWs, 1000);
    });
    ws.on('error', () => {
        console.log(clc.blueBright('Robot:'), `Failed to connect to main websocket`);
        //setTimeout(connectWs, 1000);
    });
    ws.on('message', (dataRaw) => {
        const data = JSON.parse(dataRaw);
        if (data.to == 'robot') {
            if (data.action == 'startAutoClick')
                startAutoClick(data.opts, ws);
            if (data.action == 'stopAutoClick')
                stopAutoClick(ws);
        }
    });
}
connectWs();

// Handle the autoclicker
let autoClickInterval;
function startAutoClick(opts, ws) {
    let timeoutTime = ((opts.timeout) ? (Date.now()+(opts.timeout*1000)) : null);
    let lastClick = 0;
    const click = () => {
        let now = Date.now();
        if (opts.timeout && now > timeoutTime) stopAutoClick(ws);
        if (now > (lastClick+opts.interval)) {
            robot.mouseClick(opts.button, opts.double)
            lastClick = now;
        }
    };
    autoClickInterval = setInterval(click, 1); click();
    console.log(clc.blueBright('Robot:'), `Auto-clicking started on an interval of ${opts.interval}ms`, ((opts.timeout) ? `for ${opts.timeout}s`:'with no timeout'));
    ws.send(JSON.stringify({ to: 'renderer', action: 'autoClickStarted' }));
}
function stopAutoClick(ws) {
    clearInterval(autoClickInterval);
    console.log(clc.blueBright('Robot:'), `Auto-clicking stopped`);
    ws.send(JSON.stringify({ to: 'renderer', action: 'autoClickStopped' }));
}

const robot = require('robotjs');
const WebSocket = require('ws').WebSocket;
const clc = require('cli-color');

let ws;
let wsSend;
function connectWs() {
    ws = new WebSocket(`ws://localhost:31264`);
    wsSend = (data) => { ws.send(JSON.stringify(data)) };
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
                startAutoClick(data.opts);
            if (data.action == 'stopAutoClick')
                stopAutoClick();
            if (data.action == 'getReadyStatus')
                wsSend({ to: 'renderer', action: 'robotReadyStatus', status: true });
        }
    });
}
connectWs();

// Handle the autoclicker
let autoClickInterval;
let autoClickStatus = false;
function startAutoClick(opts) {
    if (autoClickStatus) return;
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
    wsSend({ to: 'renderer', action: 'autoClickStarted' });
    autoClickStatus = true;
}
function stopAutoClick() {
    if (!autoClickStatus) return;
    clearInterval(autoClickInterval);
    console.log(clc.blueBright('Robot:'), `Auto-clicking stopped`);
    wsSend({ to: 'renderer', action: 'autoClickStopped' });
    autoClickStatus = false;
}
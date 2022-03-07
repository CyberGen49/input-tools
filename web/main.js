
const main = window.electronAPI;
const ipcRenderer = main.ipcRenderer;

// Shorthand function for *.getElementById()
function _id(id, ancestor = document) {
    return ancestor.getElementById(id);
}

// On app load
window.addEventListener('load', async () => {
    // Connect to main websocket
    const ws = new WebSocket(`ws://localhost:31264`);
    ws.addEventListener('open', () => {
        console.log(`Connected to main websocket`);
    });

    // Adjust buttons
    let buttons = document.getElementsByTagName('button');
    for (i = 0; i < buttons.length; i++) {
        let button = buttons[i];
        button.addEventListener('click', () => {
            button.blur();
        });
    }
    // Adjust anchors
    const anchors = document.getElementsByTagName('a');
    for (i = 0; i < anchors.length; i++) {
        anchors[i].target = '_blank';
        anchors[i].addEventListener('click', () => {
            anchors[i].blur();
        });
    }

    // Handle control buttons
    _id('windowClose').addEventListener('click', async () => {
        ws.send(JSON.stringify({ to: 'main', action: 'closeWindow' }));
    });
    _id('windowMax').addEventListener('click', async () => {
        ws.send(JSON.stringify({ to: 'main', action: 'toggleMaxWindow' }));
    });
    _id('windowMin').addEventListener('click', async () => {
        ws.send(JSON.stringify({ to: 'main', action: 'minWindow' }));
    });

    // Handle sections
    const sections = _id('main').getElementsByClassName('section');
    const tabs = _id('sidebar').getElementsByClassName('item');
    let sectionInterval;
    let currentSection = '';
    const showSection = (id) => {
        if (id == currentSection) return;
        clearInterval(sectionInterval);
        currentSection = id;
        const section = _id(`section${id}`);
        for (i = 0; i < sections.length; i++) {
            sections[i].classList.remove('visible');
            tabs[i].classList.remove('selected');
        }
        sectionInterval = setTimeout(() => {
            section.style.display = '';
            sectionInterval = setTimeout(() => {
                section.classList.add('visible');
                _id(`tab${id}`).classList.add('selected');
                sectionInterval = setTimeout(() => {
                    for (i = 0; i < sections.length; i++) {
                        if (sections[i].id !== section.id)
                            sections[i].style.display = 'none';
                    }
                }, 200);
            }, 10);
        }, 100);
    };
    ['AutoClicker', 'Macros', 'Recorder',
     'Settings', 'About'].forEach((section) => {
        _id(`tab${section}`).addEventListener('click', () => {
            showSection(section);
        });
    });
    showSection('AutoClicker');

    // Handle the auto clicker
    ['autoClickInterval', 'autoClickTimeout'].forEach((id) => {
        _id(id).addEventListener('change', (el) => {
            el = el.target;
            let value = el.value;
            let valueInt = parseInt(value);
            if (value === '' || valueInt < 1) el.value = 1;
            if (valueInt > 100000) el.value = 99999;
        });
    });
    _id('autoClickTimeoutUnit').addEventListener('change', (el) => {
        el = el.target;
        if (el.value == 'none')
            _id('autoClickTimeoutCont').classList.add('hidden');
        else
            _id('autoClickTimeoutCont').classList.remove('hidden');
    });
    _id('autoClickStart').addEventListener('click', async () => {
        _id('autoClickStart').disabled = true;
        ws.send(JSON.stringify({ to: 'robot', action: 'startAutoClick', opts: {
            button: _id('autoClickButton').value,
            double: JSON.parse(_id('autoClickType').value),
            interval: (() => {
                if (_id('autoClickUnit').value === 'ms')
                    return parseInt(_id('autoClickInterval').value);
                if (_id('autoClickUnit').value === 's')
                    return (parseInt(_id('autoClickInterval').value)*1000);
                if (_id('autoClickUnit').value === 'm')
                    return (parseInt(_id('autoClickInterval').value)*(1000*60));
                if (_id('autoClickUnit').value === 'h')
                    return (parseInt(_id('autoClickInterval').value)*(1000*60*60));
            })(),
            timeout: (() => {
                if (_id('autoClickTimeoutUnit').value === 's')
                    return (parseInt(_id('autoClickTimeout').value));
                if (_id('autoClickTimeoutUnit').value === 'm')
                    return (parseInt(_id('autoClickTimeout').value)*(60));
                if (_id('autoClickTimeoutUnit').value === 'h')
                    return (parseInt(_id('autoClickTimeout').value)*(60*60));
                return false;
            })()
        }}));
        //new Notification('Auto-clicking started!');
    });
    _id('autoClickStop').addEventListener('click', async () => {
        _id('autoClickStop').disabled = true;
        ws.send(JSON.stringify({ to: 'robot', action: 'stopAutoClick' }));
        //new Notification('Auto-clicking stopped!');
    });

    // Handle incoming websocket messages
    ws.addEventListener('message', async(event) => {
        const data = JSON.parse(await event.data.text());
        if (data.to == 'renderer') {
            console.log('WS:', data);
            if (data.action == 'autoClickStarted') {
                _id('autoClickStop').disabled = false;
            }
            if (data.action == 'autoClickStopped') {
                _id('autoClickStop').click();
                _id('autoClickStart').disabled = false;
            }
        }
    });
});
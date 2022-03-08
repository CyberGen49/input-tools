
// Shorthand function for *.getElementById()
function _id(id, ancestor = document) {
    return ancestor.getElementById(id);
}

// Copy text to the clipboard
function copyText(value) {
    navigator.clipboard.writeText(value);
    console.log("Copied text to clipboard: ");
    console.log(value);
}

// Adjust elements
function adjustElements() {
    // Adjust buttons
    const buttons = document.getElementsByTagName('button');
    for (i = 0; i < buttons.length; i++) {
        let button = buttons[i];
        if (!button.classList.contains('fixed')) {
            button.classList.add('fixed');
            button.addEventListener('click', () => {
                button.blur();
                // If this button is a checkbox
                if (button.classList.contains('checkbox')) {
                    if (button.classList.contains('selected'))
                        button.classList.remove('selected');
                    else
                        button.classList.add('selected');
                }
            });
        }
    }
    // Adjust anchors
    const anchors = document.getElementsByTagName('a');
    for (i = 0; i < anchors.length; i++) {
        let anchor = anchors[i];
        anchor.target = '_blank';
        // anchors[i].addEventListener('click', () => {
        //     anchors[i].blur();
        // });
    }
}

// Handle popups
function showPopup(title, innerHtml, closeable = true, onClose = () => {}) {
    let id = `popup-${Date.now()}`;
    document.documentElement.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="popupCont">
            <div id="${id}-box" class="popup">
                <div class="titlebar">
                    <div class="title">${title}</div>
                    ${(closeable) ? `<button id="${id}-close" class="close">close</button>`:''}
                </div>
                <div class="content">${innerHtml}</div>
            </div>
        </div>
    `);
    _id(id).addEventListener('click', (e) => {
        if (closeable) hidePopup(id, onClose);
    });
    if (closeable) _id(`${id}-close`).addEventListener('click', (e) => {
        hidePopup(id, onClose);
    });
    _id(`${id}-box`).addEventListener('click', (e) => {
        e.stopPropagation();
    });
    adjustElements();
    setTimeout(() => { _id(id).classList.add('visible') }, 50);
    return id;
}
function hidePopup(id, onClose = () => {}) {
    _id(id).classList.remove('visible');
    setTimeout(() => { _id(id).remove() }, 200);
    onClose();
}

// On app load
window.addEventListener('load', async () => {
    let userData = {};
    let robotCheckInterval;
    // Connect to main websocket
    const ws = new WebSocket(`ws://localhost:31264`);
    ws.addEventListener('open', () => {
        console.log(`Connected to main websocket`);
        // Request user data
        wsSend({ to: 'main', action: 'getData' });
        // Make sure robot is ready
        const getRobotReadyStatus = () => {
            wsSend({ to: 'robot', action: 'getReadyStatus' })
        };
        getRobotReadyStatus();
        robotCheckInterval = setInterval(getRobotReadyStatus, 1000);
    });
    const wsSend = (data) => { ws.send(JSON.stringify(data)) };
    // Handle incoming websocket messages
    ws.addEventListener('message', async(event) => {
        //const data = JSON.parse(await event.data.text());
        const data = JSON.parse(event.data);
        if (data.to == 'renderer') {
            console.log('WS:', data);
            // Handle user data response
            if (data.action == 'userData') {
                userData = data.data;
                _id('userDataDir').innerText = userData.dataDir;
                Object.keys(userData.versions).sort().forEach((key) => {
                    _id('components').innerHTML += `<span style="color: var(--fgDD)">${key}</span>&nbsp;&nbsp;&nbsp;${userData.versions[key]}<br>`;
                });
                _id('autoClickShortcut').innerText = userData.autoClick.shortcut.join(' + ');
                showSection('AutoClicker');
            }
            // Handle auto-click keyboard shortcut
            if (data.action == 'toggleAutoClick') {
                if (!_id('autoClickStart').disabled)
                    _id('autoClickStart').click();
                else
                    _id('autoClickStop').click();
            }
            // Handle auto-click status responses
            if (data.action == 'autoClickStarted') {
                _id('autoClickStop').disabled = false;
                wsSend({ to: 'main', action: 'showAutoClickPopup' });
            }
            if (data.action == 'autoClickStopped') {
                _id('autoClickStop').disabled = true;
                _id('autoClickStart').disabled = false;
                wsSend({ to: 'main', action: 'hideAutoClickPopup' });
            }
            // Handle robot status
            if (data.action == 'robotReadyStatus' && data.status) {
                clearInterval(robotCheckInterval);
                _id('autoClickStart').disabled = false;
            }
        }
    });

    // Adjust elements
    adjustElements();

    // Handle control buttons
    _id('windowClose').addEventListener('click', () => {
        wsSend({ to: 'main', action: 'closeWindow' });
    });
    _id('windowMax').addEventListener('click', () => {
        wsSend({ to: 'main', action: 'toggleMaxWindow' });
    });
    _id('windowMin').addEventListener('click', () => {
        wsSend({ to: 'main', action: 'minWindow' });
    });

    // Handle sections
    const sections = _id('main').getElementsByClassName('section');
    const tabs = _id('sidebar').getElementsByClassName('item');
    let sectionInterval;
    let currentSection = '';
    const showSection = (id) => {
        if (id == currentSection) return;
        clearInterval(sectionInterval);
        _id('main').scrollTo(0, 0);
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
        wsSend({ to: 'robot', action: 'startAutoClick', opts: {
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
        }});
        //new Notification('Auto-clicking started!');
    });
    _id('autoClickStop').addEventListener('click', async () => {
        _id('autoClickStop').disabled = true;
        wsSend({ to: 'robot', action: 'stopAutoClick' });
        //new Notification('Auto-clicking stopped!');
    });
    _id('autoClickChangeShortcut').addEventListener('click', () => {
        let keys = [
            { value: 'A', code: 'KeyA', name: 'value' },
            { value: 'B', code: 'KeyB', name: 'value' },
            { value: 'C', code: 'KeyC', name: 'value' },
            { value: 'D', code: 'KeyD', name: 'value' },
            { value: 'E', code: 'KeyE', name: 'value' },
            { value: 'F', code: 'KeyF', name: 'value' },
            { value: 'G', code: 'KeyG', name: 'value' },
            { value: 'H', code: 'KeyH', name: 'value' },
            { value: 'I', code: 'KeyI', name: 'value' },
            { value: 'J', code: 'KeyJ', name: 'value' },
            { value: 'K', code: 'KeyK', name: 'value' },
            { value: 'L', code: 'KeyL', name: 'value' },
            { value: 'M', code: 'KeyM', name: 'value' },
            { value: 'N', code: 'KeyN', name: 'value' },
            { value: 'O', code: 'KeyO', name: 'value' },
            { value: 'P', code: 'KeyP', name: 'value' },
            { value: 'Q', code: 'KeyQ', name: 'value' },
            { value: 'R', code: 'KeyR', name: 'value' },
            { value: 'S', code: 'KeyS', name: 'value' },
            { value: 'T', code: 'KeyT', name: 'value' },
            { value: 'U', code: 'KeyU', name: 'value' },
            { value: 'V', code: 'KeyV', name: 'value' },
            { value: 'W', code: 'KeyW', name: 'value' },
            { value: 'X', code: 'KeyX', name: 'value' },
            { value: 'Y', code: 'KeyY', name: 'value' },
            { value: 'Z', code: 'KeyZ', name: 'value' },
            { value: '0', code: 'Digit0', name: 'value' },
            { value: '1', code: 'Digit1', name: 'value' },
            { value: '2', code: 'Digit2', name: 'value' },
            { value: '3', code: 'Digit3', name: 'value' },
            { value: '4', code: 'Digit4', name: 'value' },
            { value: '5', code: 'Digit5', name: 'value' },
            { value: '6', code: 'Digit6', name: 'value' },
            { value: '7', code: 'Digit7', name: 'value' },
            { value: '8', code: 'Digit8', name: 'value' },
            { value: '9', code: 'Digit9', name: 'value' },
            { value: '', code: 'Space', name: 'code' },
            { value: '', code: 'Tab', name: 'code' },
            { value: '', code: 'Backspace', name: 'code' },
            { value: '', code: 'Insert', name: 'code' },
            { value: '', code: 'Delete', name: 'code' },
            { value: '', code: 'Home', name: 'code' },
            { value: '', code: 'End', name: 'code' },
            { value: '', code: 'PageUp', name: 'code' },
            { value: '', code: 'PageDown', name: 'code' },
            { value: '', code: 'Enter', name: 'code' },
            { value: '', code: 'Up', name: 'code' },
            { value: '', code: 'Down', name: 'code' },
            { value: '', code: 'Left', name: 'code' },
            { value: '', code: 'Right', name: 'code' },
            { value: 'num0', code: 'Numpad0', name: 'Numpad 0' },
            { value: 'num1', code: 'Numpad1', name: 'Numpad 1' },
            { value: 'num2', code: 'Numpad2', name: 'Numpad 2' },
            { value: 'num3', code: 'Numpad3', name: 'Numpad 3' },
            { value: 'num4', code: 'Numpad4', name: 'Numpad 4' },
            { value: 'num5', code: 'Numpad5', name: 'Numpad 5' },
            { value: 'num6', code: 'Numpad6', name: 'Numpad 6' },
            { value: 'num7', code: 'Numpad7', name: 'Numpad 7' },
            { value: 'num8', code: 'Numpad8', name: 'Numpad 8' },
            { value: 'num9', code: 'Numpad9', name: 'Numpad 9' },
            { value: 'numdec', code: 'NumpadDecimal', name: 'Numpad Decimal' },
            { value: 'numadd', code: 'NumpadAdd', name: 'Numpad Add' },
            { value: 'numsub', code: 'NumpadSubtract', name: 'Numpad Subtract' },
            { value: 'nummult', code: 'NumpadMultiply', name: 'Numpad Multiply' },
            { value: 'numdiv', code: 'NumpadDivide', name: 'Numpad Divide' },
            { value: '', code: 'F1', name: 'code' },
            { value: '', code: 'F2', name: 'code' },
            { value: '', code: 'F3', name: 'code' },
            { value: '', code: 'F4', name: 'code' },
            { value: '', code: 'F5', name: 'code' },
            { value: '', code: 'F6', name: 'code' },
            { value: '', code: 'F7', name: 'code' },
            { value: '', code: 'F8', name: 'code' },
            { value: '', code: 'F9', name: 'code' },
            { value: '', code: 'F10', name: 'code' },
            { value: '', code: 'F11', name: 'code' },
            { value: '', code: 'F12', name: 'code' },
            { value: '', code: 'F13', name: 'code' },
            { value: '', code: 'F14', name: 'code' },
            { value: '', code: 'F15', name: 'code' },
            { value: '', code: 'F16', name: 'code' },
            { value: '', code: 'F17', name: 'code' },
            { value: '', code: 'F18', name: 'code' },
            { value: '', code: 'F19', name: 'code' },
            { value: '', code: 'F20', name: 'code' },
            { value: '', code: 'F21', name: 'code' },
            { value: '', code: 'F22', name: 'code' },
            { value: '', code: 'F23', name: 'code' },
            { value: '', code: 'F24', name: 'code' },
        ];
        let id = showPopup(`Configure shortcut`, `
            <div class="flex verticalCenter">
                <div>
                    <div style="margin-bottom: 5px;">Modifiers</div>
                    <button id="keybindCtrl" class="checkbox">Ctrl</button>
                    <button id="keybindAlt" class="checkbox">Alt</button>
                    <button id="keybindShift" class="checkbox">Shift</button>
                </div>
                <div style="margin-left: 15px;">
                    <div style="margin-bottom: 5px;">Press a key</div>
                    <div class="flex">
                        <div id="keyInputCont">&nbsp;</div>
                    </div>
                    <div style="margin-top: 5px">
                        <small id="modifierWarning" class="hidden" style="color: var(--fgErr);">This key requires a modifier.</small>
                        <small id="badKeyWarning" class="hidden" style="color: var(--fgErr);">Sorry, <span id="badKeyCode"></span> isn't supported.</small>
                    </div>
                </div>
            </div>
            <div class="flex centerHorizontal">
                <button id="commitKeybind" class="btn" disabled>Done</button>
            </div>
        `, true, () => {
            window.removeEventListener('keyup', handleInput);
            _id('autoClickStart').disabled = false;
        });
        _id('autoClickStart').disabled = true;
        let selValue = '';
        let selName = '';
        let finalShortcut = [];
        const updateShownInput = () => {
            finalShortcut = [];
            let display = selName;
            if (_id('keybindShift').classList.contains('selected')) {
                display = `Shift + ${display}`;
                finalShortcut.unshift('Shift');
                // Using unshift instead of push on purpose, so we save the shortcut
                // the same way it's displayed (by prepending to the front)
            }
            if (_id('keybindAlt').classList.contains('selected')) {
                display = `Alt + ${display}`;
                finalShortcut.unshift('Alt');
            }
            if (_id('keybindCtrl').classList.contains('selected')) {
                display = `Ctrl + ${display}`;
                finalShortcut.unshift('CommandOrControl');
            }
            _id('keyInputCont').innerHTML = (display === '') ? '&nbsp;':display;
            if (selValue !== '') {
                finalShortcut.push(selValue);
                if (selValue.match(/^([A-Z0-9]|Enter|Backspace|Space)$/) && finalShortcut.length == 1) {
                    _id('modifierWarning').classList.remove('hidden');
                    _id('commitKeybind').disabled = true;
                } else {
                    _id('modifierWarning').classList.add('hidden');
                    _id('commitKeybind').disabled = false;
                }
            }
        };
        _id('keybindCtrl').addEventListener('click', updateShownInput);
        _id('keybindAlt').addEventListener('click', updateShownInput);
        _id('keybindShift').addEventListener('click', updateShownInput);
        const handleInput = (event) => {
            let pressedKey = false;
            keys.forEach((key) => {
                if (key.code == event.code) pressedKey = key;
            });
            if (pressedKey) {
                selName = pressedKey.name.replace('code', pressedKey.code).replace('value', pressedKey.value);
                selValue = ((pressedKey.value === '') ? pressedKey.code : pressedKey.value);
                _id('badKeyWarning').classList.add('hidden');
                updateShownInput();
            } else {
                _id('badKeyCode').innerText = event.code;
                _id('badKeyWarning').classList.remove('hidden');
            }
        };
        window.addEventListener('keyup', handleInput);
        _id('commitKeybind').addEventListener('click', () => {
            console.log(`Final shortcut:`, finalShortcut.join('+'));
            _id(id).click();
        });
    });

    _id('openDataFolder').addEventListener('click', () => {
        wsSend({ to: 'main', action: 'openDataFolder' });
    });
});
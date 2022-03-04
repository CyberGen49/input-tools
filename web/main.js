
const main = window.electronAPI;

// Shorthand function for *.getElementById()
function _id(id, ancestor = document) {
    return ancestor.getElementById(id);
}

// On app load
window.addEventListener('load', async () => {
    let buttons = document.getElementsByTagName('button');
    for (i = 0; i < buttons.length; i++) {
        let button = buttons[i];
        button.addEventListener('click', () => {
            button.blur();
        });
    }
    // Handle control buttons
    _id('windowClose').addEventListener('click', async () => {
        await main.invokeIpc('closeWindow');
    });
    _id('windowMax').addEventListener('click', async () => {
        await main.invokeIpc('toggleMaxWindow');
    });
    _id('windowMin').addEventListener('click', async () => {
        await main.invokeIpc('minWindow');
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
    _id('autoClickDelay').addEventListener('change', () => {
        const el = _id('autoClickDelay');
        let value = el.value;
        let valueInt = parseInt(value);
        if (value === '') el.value = 1;
        if (valueInt > 100000) el.value = 99999;
    });
    _id('autoClickStart').addEventListener('click', async () => {
        await main.invokeIpc('autoClicker', {
            status: 'start',
            button: _id('autoClickButton').value,
            double: JSON.parse(_id('autoClickType').value),
            delay: (() => {
                if (_id('autoClickUnit').value === 'ms')
                    return parseInt(_id('autoClickDelay').value);
                if (_id('autoClickUnit').value === 's')
                    return (parseInt(_id('autoClickDelay').value)*1000);
                if (_id('autoClickUnit').value === 'm')
                    return (parseInt(_id('autoClickDelay').value)*(1000*60));
                if (_id('autoClickUnit').value === 'h')
                    return (parseInt(_id('autoClickDelay').value)*(1000*60*60));
            })()
        });
        _id('autoClickStart').disabled = true;
        _id('autoClickStop').disabled = false;
    });
    _id('autoClickStop').addEventListener('click', async () => {
        await main.invokeIpc('autoClicker', { status: 'stop' });
        _id('autoClickStart').disabled = false;
        _id('autoClickStop').disabled = true;
    });
});
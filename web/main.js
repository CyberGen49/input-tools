
// Shorthand function for *.getElementById()
function _id(id, ancestor = document) {
    return ancestor.getElementById(id);
}

// On app load
window.addEventListener('load', () => {
    let buttons = document.getElementsByTagName('button');
    for (i = 0; i < buttons.length; i++) {
        let button = buttons[i];
        button.addEventListener('click', () => {
            button.blur();
        });
    }
    // Handle control buttons
    _id('windowClose').addEventListener('click', async () => {
        await window.electronAPI.closeWindow();
    });
    _id('windowMax').addEventListener('click', async () => {
        await window.electronAPI.toggleMaxWindow();
    });
    _id('windowMin').addEventListener('click', async () => {
        await window.electronAPI.minWindow();
    });
});
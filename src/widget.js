const { ipcRenderer } = require('electron');

const timeDisplay = document.getElementById('time-display');
const container = document.getElementById('widget-container');

ipcRenderer.on('update-time', (event, { time, percent }) => {
    timeDisplay.textContent = time;

    // Optional: Add urgent styling if highly urgent, though main app handles logic
    if (percent < 10) {
        container.classList.add('urgent');
    } else {
        container.classList.remove('urgent');
    }
});

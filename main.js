const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        resizable: false,
        frame: false, // Custom title bar
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // Allowing node integration for simplicity in this local tool
        },
        icon: path.join(__dirname, 'assets/Pomodoro.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();

        // Ensure ipcMain is available
        const { ipcMain } = require('electron');

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        // IPC Handlers
        ipcMain.on('timer-finished', () => {
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
                if (win.isMinimized()) win.restore();
                win.show();
                win.focus();
            }
        });

        ipcMain.on('minimize-app', () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.minimize();
        });

        ipcMain.on('close-app', () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.close();
        });
    });
}

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

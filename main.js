const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let widgetWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
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

function createWidgetWindow() {
    widgetWindow = new BrowserWindow({
        width: 150,
        height: 80,
        resizable: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false, // Don't take focus
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false // Start hidden
    });

    widgetWindow.loadFile(path.join(__dirname, 'src/widget.html'));
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
        createWidgetWindow();

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        // IPC Handlers
        ipcMain.on('timer-finished', () => {
            if (widgetWindow && widgetWindow.isVisible()) {
                widgetWindow.hide();
            }
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }
        });

        ipcMain.on('minimize-app', () => {
            if (mainWindow) mainWindow.minimize();
        });

        ipcMain.on('close-app', () => {
            // Force quit everything
            app.quit();
        });

        ipcMain.on('update-timer', (event, { time, percent, enabled }) => {
            if (!widgetWindow || !mainWindow) return;

            // Always update content
            widgetWindow.webContents.send('update-time', { time, percent });

            // Logic to show/hide
            // Show if enabled AND minimized AND percent < 25
            if (enabled && mainWindow.isMinimized() && percent < 25) {
                if (!widgetWindow.isVisible()) {
                    const primaryDisplay = screen.getPrimaryDisplay();
                    const { width } = primaryDisplay.workAreaSize;
                    // Position top right: x = width - widgetWidth - margin, y = margin
                    widgetWindow.setPosition(width - 170, 20);
                    widgetWindow.showInactive();
                }
            } else {
                if (widgetWindow.isVisible()) {
                    widgetWindow.hide();
                }
            }
        });

        ipcMain.handle('open-sound-dialog', async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] }
                ]
            });
            return result.filePaths[0]; // Returns undefined if cancelled
        });

        // Config Persistence
        const configPath = path.join(app.getPath('userData'), 'config.json');

        ipcMain.handle('get-config', async () => {
            try {
                if (fs.existsSync(configPath)) {
                    const data = fs.readFileSync(configPath, 'utf8');
                    return JSON.parse(data);
                }
            } catch (error) {
                console.error("Error reading config:", error);
            }
            // Return defaults if no config or error
            return {
                language: 'es',
                widgetEnabled: true
            };
        });

        ipcMain.handle('save-config', async (event, config) => {
            try {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                return true;
            } catch (error) {
                console.error("Error saving config:", error);
                return false;
            }
        });
    });
}

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

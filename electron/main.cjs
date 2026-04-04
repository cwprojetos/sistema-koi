const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = !app.isPackaged;

let mainWindow;
let serverProcess;

function startServer() {
    console.log('Starting backend server...');
    // Start the server using node
    serverProcess = spawn('node', [path.join(__dirname, '../server/index.js')], {
        shell: true,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' }
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        title: "Sistema Promessa - Gestão de Igreja",
        icon: path.join(__dirname, '../public/favicon.ico')
    });

    mainWindow.setMenu(null); // Remove default menu

    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:8080');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

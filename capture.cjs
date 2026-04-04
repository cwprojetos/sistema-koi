const { app, BrowserWindow } = require('electron');
const fs = require('fs');

app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false });
  
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    fs.appendFileSync('browser_logs.txt', `[${level}] ${message} at ${sourceId}:${line}\n`);
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    fs.appendFileSync('browser_logs.txt', `[Load Failed] ${errorDescription}\n`);
  });

  win.webContents.on('crashed', () => {
    fs.appendFileSync('browser_logs.txt', `[Crashed]\n`);
  });

  win.loadURL('http://localhost:8080/').then(() => {
    setTimeout(() => {
      app.quit();
    }, 5000);
  });
});

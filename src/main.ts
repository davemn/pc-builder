import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "path";

import { NativeWindow } from "./api/native-window";
import { UserDataModel } from "./api/userData";
import { connectTo, DatabaseName, disconnectFrom } from "./db";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();

  // Alt., window.maximize()
  const { width, height } = primaryDisplay.workAreaSize;

  const mainWindow = new BrowserWindow({
    width,
    height,
    /* shown before the renderer has finished running the first time */
    backgroundColor: "#3a3a3a",

    titleBarStyle: "hidden",
    trafficLightPosition: { x: 20, y: 8 },

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.webContents.openDevTools({
    mode: "bottom",
  });
}

function bindApiToIpcChannels(
  namespace: string,
  api: Record<string, (...args: any[]) => any>
) {
  for (const methodName in api) {
    ipcMain.handle(`${namespace}:${methodName}`, api[methodName]);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {
    await connectTo(DatabaseName.USER_DATA); // first connection will run any pending migrations
  } catch (e) {
    console.error("Failed to connect to database!");
    console.error(e);
    app.quit();
  }

  // *Before* loading the HTML file so that the handler is guaranteed to be ready before you send out an invoke() call from the renderer process
  NativeWindow.initMain();
  UserDataModel.initMain();

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

let cleanupIsComplete = false;

app.on("before-quit", async (e) => {
  if (!cleanupIsComplete) {
    e.preventDefault();
    await disconnectFrom(DatabaseName.USER_DATA);
    cleanupIsComplete = true;
    app.quit();
  }
});

import {
  BrowserWindow,
  ipcMain,
  app,
  contextBridge,
  ipcRenderer,
} from "electron";

const SET_TITLE_EVENT = "nativeWindow:setTitle";

export class NativeWindow {
  constructor() {
    if (ipcMain && app) {
      ipcMain.handle(SET_TITLE_EVENT, (event, title) => {
        const webContents = event.sender;
        this.setTitle(title, webContents);
      });
    }
  }

  setTitle(title: string, webContents?: Electron.WebContents) {
    if (ipcMain && app && webContents) {
      const currentWindow = BrowserWindow.fromWebContents(webContents);
      currentWindow?.setTitle(title);
    } else if (process.type === "renderer") {
      window.NativeWindow.setTitle(title);
    }
  }

  static initMain() {
    if (!ipcMain || !app) {
      throw new Error("Only call initMain in the main process.");
    }

    return new NativeWindow();
  }

  static initPreload() {
    contextBridge.exposeInMainWorld("NativeWindow", {
      setTitle: (title: string) => ipcRenderer.invoke(SET_TITLE_EVENT, title),
    });
  }
}

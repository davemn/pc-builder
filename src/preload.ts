import { contextBridge, ipcRenderer } from "electron";

import { NativeWindow } from "./api/native-window";

NativeWindow.initPreload();

// Can't do the same pattern with UserDataModel because the module
// has several privileged dependencies. Trying to import it in the
// preload script will throw a runtime error.
contextBridge.exposeInMainWorld("UserDataModel", {
  dispatch: (action: any) =>
    ipcRenderer.invoke("UserDataModel:dispatch", action),
});

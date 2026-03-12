const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("portManager", {
  listPorts: () => ipcRenderer.invoke("ports:list"),
  killProcess: (pid) => ipcRenderer.invoke("ports:kill", pid),
  runQuickKill: (presetKey) => ipcRenderer.invoke("quick-kill:run", presetKey),
  getAdminStatus: () => ipcRenderer.invoke("admin:status"),
  requestElevation: () => ipcRenderer.invoke("admin:elevate")
});
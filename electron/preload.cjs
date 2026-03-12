const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("portManager", {
  listPorts: () => ipcRenderer.invoke("ports:list"),
  killProcess: (pid) => ipcRenderer.invoke("ports:kill", pid),
  getAdminStatus: () => ipcRenderer.invoke("admin:status"),
  requestElevation: () => ipcRenderer.invoke("admin:elevate")
});

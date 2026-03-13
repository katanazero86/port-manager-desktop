const { ipcMain, dialog } = require("electron");
const { listPorts, killProcessByPid, killProcessesByPreset } = require("./port-service.cjs");

function registerIpcHandlers({ getAdminStatus, relaunchAsAdmin }) {
  ipcMain.handle("ports:list", async () => {
    const ports = await listPorts();
    return {
      ports,
      admin: await getAdminStatus()
    };
  });

  ipcMain.handle("ports:kill", async (_event, pid) => {
    try {
      await killProcessByPid(pid);
      return {
        ok: true,
        message: `PID ${pid} terminated successfully.`
      };
    } catch (error) {
      return {
        ok: false,
        message: error.stderr?.trim() || error.message || "Failed to terminate the process."
      };
    }
  });

  ipcMain.handle("admin:status", async () => getAdminStatus());

  ipcMain.handle("quick-kill:run", async (_event, presetKey) => {
    try {
      const result = await killProcessesByPreset(presetKey);
      return {
        ok: true,
        message: `${result.label}: ${result.count} process(es) terminated.`,
        result
      };
    } catch (error) {
      return {
        ok: false,
        message: error.stderr?.trim() || error.message || "Quick kill failed."
      };
    }
  });

  ipcMain.handle("admin:elevate", async () => {
    try {
      await relaunchAsAdmin();
      return {
        ok: true,
        message: "Elevation request submitted. The app will reopen if approved."
      };
    } catch (error) {
      dialog.showErrorBox(
        "Elevation failed",
        error.message || "Unable to request administrator privileges."
      );
      return {
        ok: false,
        message: error.message || "Unable to request administrator privileges."
      };
    }
  });
}

module.exports = {
  registerIpcHandlers
};

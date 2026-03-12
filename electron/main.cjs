const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { listPorts, killProcessByPid, killProcessesByPreset } = require("./port-service.cjs");

const execFileAsync = promisify(execFile);
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 1024,
    minHeight: 768,
    useContentSize: true,
    backgroundColor: "#09111d",
    title: "Port Manager Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpcHandlers() {
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

async function getAdminStatus() {
  switch (process.platform) {
    case "win32":
      return isWindowsAdmin();
    case "darwin":
      return isMacAdmin();
    default:
      return {
        isAdmin: false,
        supported: false,
        label: "Unsupported OS"
      };
  }
}

async function isWindowsAdmin() {
  const script = [
    "$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())",
    "$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"
  ].join("; ");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    script
  ]);

  const isAdmin = stdout.trim().toLowerCase() === "true";
  return {
    isAdmin,
    supported: true,
    label: isAdmin ? "Administrator" : "Standard user"
  };
}

async function isMacAdmin() {
  const { stdout } = await execFileAsync("id", ["-u"]);
  const isAdmin = stdout.trim() === "0";
  return {
    isAdmin,
    supported: true,
    label: isAdmin ? "Administrator" : "Standard user"
  };
}

async function relaunchAsAdmin() {
  switch (process.platform) {
    case "win32":
      return relaunchWindowsAsAdmin();
    case "darwin":
      return relaunchMacAsAdmin();
    default:
      throw new Error("Administrator elevation is supported only on Windows and macOS.");
  }
}

async function relaunchWindowsAsAdmin() {
  const target = process.execPath;
  const args = getRelaunchArguments();
  const script = [
    `Start-Process -Verb RunAs -FilePath '${escapePowerShell(target)}'`,
    args.length > 0 ? `-ArgumentList ${args.map((arg) => `'${escapePowerShell(arg)}'`).join(",")}` : "",
    "-WorkingDirectory",
    `'${escapePowerShell(process.cwd())}'`
  ].filter(Boolean).join(" ");

  await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script]);
  app.quit();
}

async function relaunchMacAsAdmin() {
  const command = buildMacRelaunchCommand();
  await execFileAsync("osascript", [
    "-e",
    `do shell script ${toAppleScriptString(command)} with administrator privileges`
  ]);
  app.quit();
}

function buildMacRelaunchCommand() {
  const args = getRelaunchArguments().map(quoteShellArg).join(" ");

  if (app.isPackaged) {
    const appBundlePath = getMacAppBundlePath(process.execPath);
    return `open -n -a ${quoteShellArg(appBundlePath)}${args ? ` --args ${args}` : ""}`;
  }

  return `${quoteShellArg(process.execPath)} ${getRelaunchArguments().map(quoteShellArg).join(" ")}`.trim();
}

function getMacAppBundlePath(executablePath) {
  const bundleMarker = ".app/Contents/MacOS/";
  const markerIndex = executablePath.indexOf(bundleMarker);
  if (markerIndex === -1) {
    throw new Error("Unable to resolve the macOS app bundle path for elevation.");
  }

  return executablePath.slice(0, markerIndex + 4);
}

function getRelaunchArguments() {
  const args = process.argv.slice(1);
  if (process.defaultApp) {
    return [app.getAppPath(), ...args];
  }

  return args;
}

function escapePowerShell(value) {
  return String(value).replace(/'/g, "''");
}

function quoteShellArg(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function toAppleScriptString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

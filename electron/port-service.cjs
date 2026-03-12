const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function listPorts() {
  switch (process.platform) {
    case "win32":
      return listWindowsPorts();
    case "darwin":
      return listMacPorts();
    default:
      throw new Error("This app currently supports only Windows and macOS.");
  }
}

async function killProcessByPid(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error("A valid PID is required.");
  }

  switch (process.platform) {
    case "win32":
      await execFileAsync("taskkill", ["/PID", String(pid), "/F"]);
      return;
    case "darwin":
      await execFileAsync("kill", ["-9", String(pid)]);
      return;
    default:
      throw new Error("This app currently supports only Windows and macOS.");
  }
}

async function listWindowsPorts() {
  const [tcpResult, udpResult, processMap] = await Promise.all([
    execFileAsync("netstat", ["-ano", "-p", "tcp"]),
    execFileAsync("netstat", ["-ano", "-p", "udp"]),
    getWindowsProcessMap()
  ]);

  const entries = [
    ...parseWindowsNetstat(tcpResult.stdout, "TCP", processMap),
    ...parseWindowsNetstat(udpResult.stdout, "UDP", processMap)
  ];

  return dedupeEntries(entries);
}

async function getWindowsProcessMap() {
  const script = [
    "$ErrorActionPreference='Stop'",
    "Get-Process | Select-Object Id, ProcessName | ConvertTo-Json -Compress"
  ].join("; ");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    script
  ]);

  if (!stdout.trim()) {
    return new Map();
  }

  const parsed = JSON.parse(stdout);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return new Map(rows.map((row) => [Number(row.Id), row.ProcessName]));
}

function parseWindowsNetstat(stdout, protocol, processMap) {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = [];

  for (const line of lines) {
    if (!line.startsWith(protocol)) {
      continue;
    }

    const columns = line.split(/\s+/);
    if (protocol === "TCP" && columns.length >= 5) {
      const pid = Number(columns[4]);
      rows.push(buildPortEntry({
        protocol,
        pid,
        local: columns[1],
        remote: columns[2],
        state: columns[3],
        processName: processMap.get(pid) || "Unknown"
      }));
    }

    if (protocol === "UDP" && columns.length >= 4) {
      const pid = Number(columns[3]);
      rows.push(buildPortEntry({
        protocol,
        pid,
        local: columns[1],
        remote: columns[2],
        state: "BOUND",
        processName: processMap.get(pid) || "Unknown"
      }));
    }
  }

  return rows.filter(Boolean);
}

async function listMacPorts() {
  const [tcpResult, udpResult] = await Promise.all([
    execFileAsync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]),
    execFileAsync("lsof", ["-nP", "-iUDP"])
  ]);

  const entries = [
    ...parseMacLsof(tcpResult.stdout, "TCP"),
    ...parseMacLsof(udpResult.stdout, "UDP")
  ];

  return dedupeEntries(entries);
}

function parseMacLsof(stdout, protocol) {
  const lines = stdout.split(/\r?\n/).slice(1).filter(Boolean);
  return lines
    .map((line) => {
      const columns = line.trim().split(/\s+/);
      if (columns.length < 9) {
        return null;
      }

      const processName = columns[0];
      const pid = Number(columns[1]);
      const user = columns[2];
      const nameField = columns[columns.length - 1];
      const stateMatch = line.match(/\(([^)]+)\)\s*$/);
      const state = protocol === "TCP" ? (stateMatch ? stateMatch[1] : "LISTEN") : "BOUND";

      return buildPortEntry({
        protocol,
        pid,
        local: nameField,
        remote: protocol === "UDP" ? "*:*" : "",
        state,
        processName,
        user
      });
    })
    .filter(Boolean);
}

function buildPortEntry({ protocol, pid, local, remote, state, processName, user = "" }) {
  const port = extractPort(local);
  if (!port) {
    return null;
  }

  return {
    id: `${protocol}-${port}-${pid}-${local}`,
    protocol,
    port,
    pid,
    processName,
    user,
    state,
    localAddress: local,
    remoteAddress: remote
  };
}

function extractPort(address) {
  if (!address) {
    return null;
  }

  const trimmed = address.replace(/\s+\(.+\)$/, "");
  const match = trimmed.match(/:(\d+)(?:->|$)/);
  return match ? Number(match[1]) : null;
}

function dedupeEntries(entries) {
  const seen = new Map();
  for (const entry of entries) {
    seen.set(entry.id, entry);
  }

  return Array.from(seen.values()).sort((left, right) => {
    if (left.port !== right.port) {
      return left.port - right.port;
    }

    return left.pid - right.pid;
  });
}

module.exports = {
  listPorts,
  killProcessByPid
};

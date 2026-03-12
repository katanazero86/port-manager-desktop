const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");

const execFileAsync = promisify(execFile);

const QUICK_KILL_PRESETS = {
  node: {
    label: "Kill All Node",
    matcher: (processName, command) => matchesAny(processName, command, ["node", "node.exe"])
  },
  python: {
    label: "Kill All Python",
    matcher: (processName, command) => matchesAny(processName, command, ["python", "python3", "pythonw"])
  },
  java: {
    label: "Kill All Java",
    matcher: (processName, command) => matchesAny(processName, command, ["java", "javaw"])
  },
  docker: {
    label: "Kill All Docker",
    matcher: (processName, command) => matchesAny(processName, command, ["docker", "docker desktop", "com.docker", "vpnkit"])
  }
};

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

async function killProcessesByPreset(presetKey) {
  const preset = QUICK_KILL_PRESETS[presetKey];
  if (!preset) {
    throw new Error("Unknown quick kill preset.");
  }

  const processMap = await getProcessMetadataMap();
  const targets = Array.from(processMap.values()).filter((entry) =>
    preset.matcher(entry.processName, entry.command)
  );

  const pids = Array.from(new Set(targets.map((entry) => entry.pid))).filter((pid) => Number.isInteger(pid) && pid > 0);
  for (const pid of pids) {
    await killProcessByPid(pid);
  }

  return {
    label: preset.label,
    count: pids.length,
    pids
  };
}

async function listWindowsPorts() {
  const [tcpResult, udpResult, processMap] = await Promise.all([
    execFileAsync("netstat", ["-ano", "-p", "tcp"]),
    execFileAsync("netstat", ["-ano", "-p", "udp"]),
    getWindowsProcessMetadataMap()
  ]);

  const entries = [
    ...parseWindowsNetstat(tcpResult.stdout, "TCP", processMap),
    ...parseWindowsNetstat(udpResult.stdout, "UDP", processMap)
  ];

  return dedupeEntries(entries);
}

async function getWindowsProcessMetadataMap() {
  const script = [
    "$ErrorActionPreference='Stop'",
    "$processes = Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine",
    "$processLookup = @{}",
    "foreach ($process in $processes) { $processLookup[[int]$process.ProcessId] = $process }",
    "$result = Get-Process | ForEach-Object {",
    "  $cim = $processLookup[[int]$_.Id]",
    "  [PSCustomObject]@{",
    "    Id = [int]$_.Id",
    "    ProcessName = $_.ProcessName",
    "    Command = if ($cim -and $cim.CommandLine) { $cim.CommandLine } else { '' }",
    "    CpuPercent = [Math]::Round($_.CPU, 1)",
    "    MemoryMb = [Math]::Round($_.WorkingSet64 / 1MB, 1)",
    "  }",
    "}",
    "$result | ConvertTo-Json -Compress"
  ].join("\n");
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
  return new Map(rows.map((row) => [Number(row.Id), normalizeProcessMetadata(row)]));
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
        metadata: processMap.get(pid)
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
        metadata: processMap.get(pid)
      }));
    }
  }

  return rows.filter(Boolean);
}

async function listMacPorts() {
  const [tcpResult, udpResult, processMap] = await Promise.all([
    execFileAsync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]),
    execFileAsync("lsof", ["-nP", "-iUDP"]),
    getMacProcessMetadataMap()
  ]);

  const entries = [
    ...parseMacLsof(tcpResult.stdout, "TCP", processMap),
    ...parseMacLsof(udpResult.stdout, "UDP", processMap)
  ];

  return dedupeEntries(entries);
}

async function getMacProcessMetadataMap() {
  const { stdout } = await execFileAsync("ps", ["-axo", "pid=,pcpu=,rss=,comm="]);
  const rows = stdout.split(/\r?\n/).filter(Boolean).map((line) => parseMacProcessLine(line)).filter(Boolean);
  return new Map(rows.map((row) => [row.pid, row]));
}

function parseMacLsof(stdout, protocol, processMap) {
  const lines = stdout.split(/\r?\n/).slice(1).filter(Boolean);
  return lines
    .map((line) => {
      const columns = line.trim().split(/\s+/);
      if (columns.length < 9) {
        return null;
      }

      const pid = Number(columns[1]);
      const nameField = columns[columns.length - 1];
      const stateMatch = line.match(/\(([^)]+)\)\s*$/);
      const state = protocol === "TCP" ? (stateMatch ? stateMatch[1] : "LISTEN") : "BOUND";

      return buildPortEntry({
        protocol,
        pid,
        local: nameField,
        remote: protocol === "UDP" ? "*:*" : "",
        state,
        metadata: processMap.get(pid) || {
          processName: columns[0],
          user: columns[2],
          cpuPercent: 0,
          memoryMb: 0,
          command: columns[0]
        }
      });
    })
    .filter(Boolean);
}

function buildPortEntry({ protocol, pid, local, remote, state, metadata }) {
  const port = extractPort(local);
  if (!port) {
    return null;
  }

  const normalized = normalizeProcessMetadata(metadata || { Id: pid, ProcessName: "Unknown" });

  return {
    id: `${protocol}-${port}-${pid}-${local}`,
    protocol,
    port,
    pid,
    processName: normalized.processName,
    user: normalized.user,
    state,
    localAddress: local,
    remoteAddress: remote,
    cpuPercent: normalized.cpuPercent,
    memoryMb: normalized.memoryMb,
    command: normalized.command
  };
}

function normalizeProcessMetadata(entry) {
  return {
    pid: Number(entry.Id ?? entry.pid ?? entry.ProcessId ?? 0),
    processName: entry.ProcessName || entry.processName || entry.Name || path.basename(entry.command || entry.Command || "") || "Unknown",
    user: entry.user || entry.User || "",
    cpuPercent: Number(entry.CpuPercent ?? entry.cpuPercent ?? 0),
    memoryMb: Number(entry.MemoryMb ?? entry.memoryMb ?? 0),
    command: entry.Command || entry.command || entry.CommandLine || ""
  };
}

function parseMacProcessLine(line) {
  const match = line.trim().match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/);
  if (!match) {
    return null;
  }

  const pid = Number(match[1]);
  const command = match[4].trim();
  return {
    pid,
    processName: path.basename(command.split(/\s+/)[0]),
    cpuPercent: Number(match[2]),
    memoryMb: Number((Number(match[3]) / 1024).toFixed(1)),
    command,
    user: ""
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

async function getProcessMetadataMap() {
  switch (process.platform) {
    case "win32":
      return getWindowsProcessMetadataMap();
    case "darwin":
      return getMacProcessMetadataMap();
    default:
      throw new Error("This app currently supports only Windows and macOS.");
  }
}

function matchesAny(processName, command, patterns) {
  const haystack = `${processName || ""} ${command || ""}`.toLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
}

module.exports = {
  listPorts,
  killProcessByPid,
  killProcessesByPreset,
  QUICK_KILL_PRESETS
};
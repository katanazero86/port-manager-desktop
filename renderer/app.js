const state = {
  ports: [],
  admin: null,
  query: ""
};

const elements = {
  body: document.getElementById("ports-body"),
  template: document.getElementById("row-template"),
  searchInput: document.getElementById("search-input"),
  refreshButton: document.getElementById("refresh-button"),
  elevateButton: document.getElementById("elevate-button"),
  adminCard: document.getElementById("admin-card"),
  adminLabel: document.getElementById("admin-label"),
  statusMessage: document.getElementById("status-message"),
  summaryTotal: document.getElementById("summary-total"),
  summaryTcp: document.getElementById("summary-tcp"),
  summaryUdp: document.getElementById("summary-udp"),
  lastUpdated: document.getElementById("last-updated")
};

async function refreshPorts() {
  setBusy(true, "포트 목록을 새로 불러오는 중입니다.");

  try {
    const response = await window.portManager.listPorts();
    state.ports = response.ports;
    state.admin = response.admin;
    render();
    setStatus(`총 ${state.ports.length}개의 포트를 찾았습니다.`);
    elements.lastUpdated.textContent = `마지막 갱신 ${new Date().toLocaleString("ko-KR")}`;
  } catch (error) {
    setStatus(error.message || "포트 목록을 불러오지 못했습니다.", true);
  } finally {
    setBusy(false);
  }
}

async function requestElevation() {
  setBusy(true, "관리자 권한 요청을 전송했습니다.");

  try {
    const response = await window.portManager.requestElevation();
    setStatus(response.message, !response.ok);
  } catch (error) {
    setStatus(error.message || "관리자 권한 요청에 실패했습니다.", true);
  } finally {
    setBusy(false);
  }
}

async function killPort(pid, port) {
  const confirmed = window.confirm(`포트 ${port}를 점유한 PID ${pid}를 종료하시겠습니까?`);
  if (!confirmed) {
    return;
  }

  setBusy(true, `PID ${pid} 종료를 시도하는 중입니다.`);

  try {
    const response = await window.portManager.killProcess(pid);
    setStatus(response.message, !response.ok);
    if (response.ok) {
      await refreshPorts();
    }
  } catch (error) {
    setStatus(error.message || "프로세스 종료에 실패했습니다.", true);
  } finally {
    setBusy(false);
  }
}

function render() {
  renderAdminStatus();
  renderSummary();
  renderTable();
}

function renderAdminStatus() {
  const admin = state.admin;
  if (!admin) {
    elements.adminLabel.textContent = "확인 중...";
    return;
  }

  elements.adminLabel.textContent = admin.label;
  elements.adminCard.dataset.admin = String(admin.isAdmin);
  elements.elevateButton.hidden = admin.isAdmin || !admin.supported;
}

function renderSummary() {
  const tcp = state.ports.filter((entry) => entry.protocol === "TCP").length;
  const udp = state.ports.filter((entry) => entry.protocol === "UDP").length;
  elements.summaryTotal.textContent = String(state.ports.length);
  elements.summaryTcp.textContent = String(tcp);
  elements.summaryUdp.textContent = String(udp);
}

function renderTable() {
  const fragment = document.createDocumentFragment();
  const query = state.query.trim().toLowerCase();
  const rows = state.ports.filter((entry) => {
    if (!query) {
      return true;
    }

    return [
      String(entry.port),
      entry.protocol,
      entry.processName,
      String(entry.pid),
      entry.state,
      entry.localAddress,
      entry.remoteAddress
    ].some((value) => String(value).toLowerCase().includes(query));
  });

  elements.body.innerHTML = "";

  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="8" class="empty-state">검색 결과가 없습니다.</td>`;
    elements.body.appendChild(emptyRow);
    return;
  }

  for (const entry of rows) {
    const clone = elements.template.content.firstElementChild.cloneNode(true);
    for (const field of [
      "port",
      "protocol",
      "processName",
      "pid",
      "state",
      "localAddress",
      "remoteAddress"
    ]) {
      clone.querySelector(`[data-field="${field}"]`).textContent = entry[field];
    }

    clone.querySelector(".kill-button").addEventListener("click", () => killPort(entry.pid, entry.port));
    fragment.appendChild(clone);
  }

  elements.body.appendChild(fragment);
}

function setBusy(isBusy, message) {
  elements.refreshButton.disabled = isBusy;
  elements.elevateButton.disabled = isBusy;
  if (message) {
    setStatus(message);
  }
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.dataset.error = String(isError);
}

elements.refreshButton.addEventListener("click", refreshPorts);
elements.elevateButton.addEventListener("click", requestElevation);
elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderTable();
});

refreshPorts();

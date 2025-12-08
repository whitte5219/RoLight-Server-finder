(function () {
  if (window.__rbxRegionWidgetInjected) return;
  window.__rbxRegionWidgetInjected = true;

  // Global styles (scrollbars etc.)
  const style = document.createElement("style");
  style.textContent = `
    #rbx-region-widget ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    #rbx-region-widget ::-webkit-scrollbar-track {
      background: #020617;
    }
    #rbx-region-widget ::-webkit-scrollbar-thumb {
      background: #4b5563;
      border-radius: 999px;
    }
    #rbx-region-widget ::-webkit-scrollbar-thumb:hover {
      background: #6b7280;
    }
  `;
  if (document.head) document.head.appendChild(style);

  const LOG_STORAGE_KEY = "rbx_region_log";
  const DEVICE_REGION_KEY = "rbx_device_region";
  const WORKER_URL =
    "https://roblox-region-worker.mishka-bilyi.workers.dev/?jobId=";

  // ----- Regions / ping helpers -----

  const CLIENT_REGION_OPTIONS = [
    { code: "us-west", label: "US West" },
    { code: "us-east", label: "US East" },
    { code: "us-south", label: "US South" },
    { code: "us-central", label: "US Central" },
    { code: "us-southeast", label: "US Southeast" },
    { code: "eu-central", label: "EU Central" },
    { code: "eu-west", label: "EU West" },
    { code: "eu-central-east", label: "EU Central-East" },
    { code: "asia-southeast", label: "Asia South-East" },
    { code: "asia-east", label: "Asia East" },
    { code: "asia-south", label: "Asia South" }
  ];

  function macroFromRegionCode(code) {
    if (!code) return "OTHER";
    if (code.startsWith("us-")) return "NA";
    if (code.startsWith("eu-")) return "EU";
    if (code.startsWith("asia-")) return "AS";
    return "OTHER";
  }

  function estimatePingMs(clientCode, serverCode) {
    if (!clientCode || !serverCode) return null;
    const macroClient = macroFromRegionCode(clientCode);
    const macroServer = macroFromRegionCode(serverCode);

    if (clientCode === serverCode) return 30;
    if (macroClient === macroServer) return 60;

    const pair = [macroClient, macroServer].sort().join("-");
    switch (pair) {
      case "EU-NA":
        return 110;
      case "EU-AS":
        return 170;
      case "AS-NA":
        return 190;
      default:
        return 150;
    }
  }

  // ----- Log helpers -----

  function loadLog() {
    try {
      const raw = localStorage.getItem(LOG_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLog(entries) {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }

  function addLogEntry(entry, logContainer, logVisible) {
    const entries = loadLog();
    entries.push(entry);
    while (entries.length > 3) entries.shift();
    saveLog(entries);
    if (logVisible) renderLog(logContainer);
  }

  function renderLog(logContainer) {
    const entries = loadLog();
    logContainer.innerHTML = "";

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.textContent = "No searches yet.";
      empty.style.fontSize = "10px";
      empty.style.opacity = "0.7";
      empty.style.padding = "4px 8px";
      logContainer.appendChild(empty);
      return;
    }

    const reversed = entries.slice().reverse(); // newest first

    reversed.forEach((e, idx) => {
      const item = document.createElement("div");
      item.style.padding = "4px 8px";
      item.style.borderTop = idx === 0 ? "none" : "1px solid #111827";

      const job = document.createElement("div");
      job.style.fontSize = "10px";
      job.style.fontWeight = "600";

      const jobText = document.createElement("span");
      jobText.textContent = "JobId: " + e.jobId;
      job.appendChild(jobText);

      if (idx === 0) {
        const tag = document.createElement("span");
        tag.textContent = "  Last searched server";
        tag.style.color = "#22c55e";
        tag.style.marginLeft = "6px";
        tag.style.fontWeight = "700";
        job.appendChild(tag);
      }

      const region = document.createElement("div");
      region.textContent = "Region: " + (e.regionName || "Unknown");
      region.style.fontSize = "9px";

      const country = document.createElement("div");
      country.textContent = "Country: " + (e.countryRegion || "Unknown");
      country.style.fontSize = "9px";

      const subregion = document.createElement("div");
      subregion.textContent = "Subregion: " + (e.subregion || "Unknown");
      subregion.style.fontSize = "9px";

      const ping = document.createElement("div");
      ping.textContent = "Ping: " + (e.pingText || "Unknown");
      ping.style.fontSize = "9px";

      item.appendChild(job);
      item.appendChild(region);
      item.appendChild(country);
      item.appendChild(subregion);
      item.appendChild(ping);

      logContainer.appendChild(item);
    });
  }

  // ========== WIDGET SHELL ==========

  const widget = document.createElement("div");
  widget.id = "rbx-region-widget";
  Object.assign(widget.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "360px",
    background: "transparent",
    color: "#f9fafb",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "13px",
    zIndex: "999999",
    borderRadius: "10px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.55)",
    overflow: "visible",
    border: "1px solid #1f2933",
    transition: "transform 0.15s ease, box-shadow 0.15s ease"
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    cursor: "grab",
    padding: "8px 10px",
    background: "linear-gradient(90deg, #111827, #1f2937)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    userSelect: "none",
    borderTopLeftRadius: "10px",
    borderTopRightRadius: "10px"
  });

  const title = document.createElement("span");
  title.textContent = "Roblox Server Region Finder";
  Object.assign(title.style, {
    fontWeight: "600",
    fontSize: "13px",
    letterSpacing: "0.02em"
  });

  const buttonsWrap = document.createElement("div");
  Object.assign(buttonsWrap.style, {
    display: "flex",
    gap: "6px",
    alignItems: "center"
  });

  const minimizeBtn = document.createElement("button");
  minimizeBtn.textContent = "–";
  Object.assign(minimizeBtn.style, {
    background: "transparent",
    border: "none",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0 4px",
    lineHeight: "1"
  });

  buttonsWrap.appendChild(minimizeBtn);
  header.appendChild(title);
  header.appendChild(buttonsWrap);

  const body = document.createElement("div");
  Object.assign(body.style, {
    padding: "10px 12px 14px 12px",
    background: "#050609",
    overflow: "hidden",
    maxHeight: "0px",
    opacity: "0",
    transition: "max-height 0.2s ease, opacity 0.2s ease",
    borderBottomLeftRadius: "10px",
    borderBottomRightRadius: "10px"
  });

  // ----- Tabs bar -----

  const tabBar = document.createElement("div");
  Object.assign(tabBar.style, {
    display: "flex",
    gap: "6px",
    marginBottom: "4px"
  });

  function makeTabButton(label) {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: "1",
      padding: "4px 6px",
      borderRadius: "999px",
      border: "1px solid #374151",
      background: "#020617",
      color: "#9ca3af",
      cursor: "pointer",
      fontSize: "11px",
      fontWeight: "500",
      transition:
        "background 0.15s ease, border-color 0.15s ease, color 0.15s ease"
    });
    return btn;
  }

  const regionTabBtn = makeTabButton("Region search");
  const serverTabBtn = makeTabButton("Server search");
  const joinTabBtn = makeTabButton("Server joining");

  tabBar.appendChild(regionTabBtn);
  tabBar.appendChild(serverTabBtn);
  tabBar.appendChild(joinTabBtn);

  const tabDivider = document.createElement("div");
  Object.assign(tabDivider.style, {
    height: "1px",
    background: "#111827",
    margin: "8px 0 8px 0",
    borderRadius: "999px"
  });

  const regionTab = document.createElement("div");
  const serverTab = document.createElement("div");
  const joinTab = document.createElement("div");
  regionTab.style.display = "block";
  serverTab.style.display = "none";
  joinTab.style.display = "none";

  function setActiveTab(which) {
    function setStyles(btn, active) {
      if (active) {
        btn.style.background = "#1d4ed8";
        btn.style.borderColor = "#2563eb";
        btn.style.color = "#e5e7eb";
      } else {
        btn.style.background = "#020617";
        btn.style.borderColor = "#374151";
        btn.style.color = "#9ca3af";
      }
    }

    regionTab.style.display = which === "region" ? "block" : "none";
    serverTab.style.display = which === "server" ? "block" : "none";
    joinTab.style.display = which === "join" ? "block" : "none";

    setStyles(regionTabBtn, which === "region");
    setStyles(serverTabBtn, which === "server");
    setStyles(joinTabBtn, which === "join");
  }

  regionTabBtn.addEventListener("click", () => setActiveTab("region"));
  serverTabBtn.addEventListener("click", () => setActiveTab("server"));
  joinTabBtn.addEventListener("click", () => setActiveTab("join"));
  setActiveTab("region");

  // ========== REGION TAB UI ==========

  const regionLabel = document.createElement("div");
  regionLabel.textContent = "Enter server JobId:";
  Object.assign(regionLabel.style, {
    marginBottom: "4px",
    fontSize: "12px",
    color: "#f9fafb"
  });

  const jobInput = document.createElement("input");
  Object.assign(jobInput.style, {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid #374151",
    background: "#020617",
    color: "#f9fafb",
    boxSizing: "border-box",
    marginBottom: "8px",
    fontSize: "12px",
    outline: "none"
  });
  jobInput.placeholder = "e.g. 12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
  jobInput.addEventListener("focus", () => {
    jobInput.style.borderColor = "#3b82f6";
  });
  jobInput.addEventListener("blur", () => {
    jobInput.style.borderColor = "#374151";
  });

  const deviceLabel = document.createElement("div");
  deviceLabel.textContent = "Select your device region:";
  Object.assign(deviceLabel.style, {
    marginBottom: "4px",
    fontSize: "12px",
    color: "#e5e7eb",
    marginTop: "4px"
  });

  const regionSelect = document.createElement("select");
  Object.assign(regionSelect.style, {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid #374151",
    background: "#020617",
    color: "#f9fafb",
    boxSizing: "border-box",
    marginBottom: "8px",
    fontSize: "12px",
    outline: "none",
    transition: "border-color 0.15s ease, background 0.15s ease"
  });
  regionSelect.addEventListener("mouseover", () => {
    regionSelect.style.borderColor = "#3b82f6";
  });
  regionSelect.addEventListener("mouseout", () => {
    regionSelect.style.borderColor = "#374151";
  });

  const placeholderOpt = document.createElement("option");
  placeholderOpt.value = "";
  placeholderOpt.textContent = "Select your approximate region";
  placeholderOpt.disabled = true;
  placeholderOpt.selected = true;
  regionSelect.appendChild(placeholderOpt);

  CLIENT_REGION_OPTIONS.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.code;
    o.textContent = opt.label;
    regionSelect.appendChild(o);
  });

  try {
    const savedRegion = localStorage.getItem(DEVICE_REGION_KEY);
    if (
      savedRegion &&
      CLIENT_REGION_OPTIONS.some((o) => o.code === savedRegion)
    ) {
      regionSelect.value = savedRegion;
      placeholderOpt.selected = false;
    }
  } catch {
    // ignore
  }

  regionSelect.addEventListener("change", () => {
    if (regionSelect.value) {
      try {
        localStorage.setItem(DEVICE_REGION_KEY, regionSelect.value);
      } catch {
        // ignore
      }
    }
  });

  const regionFetchBtn = document.createElement("button");
  regionFetchBtn.textContent = "Fetch region";
  Object.assign(regionFetchBtn.style, {
    width: "100%",
    padding: "7px",
    borderRadius: "6px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    marginBottom: "6px",
    transition: "background 0.15s ease, transform 0.05s ease"
  });
  regionFetchBtn.addEventListener("mousedown", () => {
    regionFetchBtn.style.transform = "scale(0.98)";
  });
  regionFetchBtn.addEventListener("mouseup", () => {
    regionFetchBtn.style.transform = "scale(1)";
  });
  regionFetchBtn.addEventListener("mouseleave", () => {
    regionFetchBtn.style.transform = "scale(1)";
  });
  regionFetchBtn.addEventListener("mouseover", () => {
    regionFetchBtn.style.background = "#1d4ed8";
  });
  regionFetchBtn.addEventListener("mouseout", () => {
    regionFetchBtn.style.background = "#2563eb";
  });

  const regionStatus = document.createElement("div");
  Object.assign(regionStatus.style, {
    minHeight: "18px",
    fontSize: "11px",
    marginBottom: "4px"
  });

  const resultRegion = document.createElement("div");
  const resultCountry = document.createElement("div");
  const resultSubregion = document.createElement("div");
  const resultPing = document.createElement("div");
  [resultRegion, resultCountry, resultSubregion, resultPing].forEach((el) =>
    Object.assign(el.style, { fontSize: "12px", marginTop: "2px" })
  );

  function setResultPlaceholders() {
    resultRegion.textContent = "Continental region: —";
    resultCountry.textContent = "Country region: —";
    resultSubregion.textContent = "Subregion: —";
    resultPing.textContent = "Estimated ping: —";
  }
  setResultPlaceholders();

  const viewLogBtn = document.createElement("button");
  viewLogBtn.textContent = "View search log";
  Object.assign(viewLogBtn.style, {
    width: "110px",
    padding: "4px 6px",
    borderRadius: "6px",
    border: "1px solid #374151",
    background: "#020617",
    color: "#9ca3af",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "10px",
    marginTop: "8px",
    alignSelf: "flex-start",
    transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease"
  });
  viewLogBtn.addEventListener("mouseover", () => {
    viewLogBtn.style.background = "#111827";
    viewLogBtn.style.borderColor = "#4b5563";
    viewLogBtn.style.color = "#e5e7eb";
  });
  viewLogBtn.addEventListener("mouseout", () => {
    viewLogBtn.style.background = "#020617";
    viewLogBtn.style.borderColor = "#374151";
    viewLogBtn.style.color = "#9ca3af";
  });

  const logContainer = document.createElement("div");
  Object.assign(logContainer.style, {
    position: "absolute",
    left: "0",
    top: "100%",
    marginTop: "6px",
    width: "100%",
    background: "#050609",
    borderRadius: "10px",
    border: "1px solid #1f2933",
    boxShadow: "0 8px 16px rgba(0,0,0,0.7)",
    maxHeight: "0px",
    overflowY: "auto",
    opacity: "0",
    display: "none",
    zIndex: "1000000",
    transition: "max-height 0.2s ease, opacity 0.2s ease"
  });

  let logVisible = false;
  viewLogBtn.addEventListener("click", () => {
    logVisible = !logVisible;
    if (logVisible) {
      viewLogBtn.textContent = "Hide search log";
      logContainer.style.display = "block";
      renderLog(logContainer);
      requestAnimationFrame(() => {
        logContainer.style.maxHeight = "130px";
        logContainer.style.opacity = "1";
      });
    } else {
      viewLogBtn.textContent = "View search log";
      logContainer.style.maxHeight = "0px";
      logContainer.style.opacity = "0";
      setTimeout(() => {
        if (!logVisible) logContainer.style.display = "none";
      }, 200);
    }
  });

  function setRegionStatus(text, color) {
    regionStatus.textContent = text;
    regionStatus.style.color = color;
  }
  setRegionStatus("Enter a server ID", "#f9fafb");

  regionTab.appendChild(regionLabel);
  regionTab.appendChild(jobInput);
  regionTab.appendChild(deviceLabel);
  regionTab.appendChild(regionSelect);
  regionTab.appendChild(regionFetchBtn);
  regionTab.appendChild(regionStatus);
  regionTab.appendChild(resultRegion);
  regionTab.appendChild(resultCountry);
  regionTab.appendChild(resultSubregion);
  regionTab.appendChild(resultPing);
  regionTab.appendChild(viewLogBtn);

  // ========== SERVER TAB UI ==========

  const gameIdLabel = document.createElement("div");
  gameIdLabel.textContent = "Enter game/place ID:";
  Object.assign(gameIdLabel.style, {
    marginBottom: "4px",
    fontSize: "12px",
    color: "#f9fafb"
  });

  const gameIdInput = document.createElement("input");
  Object.assign(gameIdInput.style, {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid #374151",
    background: "#020617",
    color: "#f9fafb",
    boxSizing: "border-box",
    marginBottom: "6px",
    fontSize: "12px",
    outline: "none"
  });
  gameIdInput.placeholder = "e.g. 1234567890 (from game URL)";
  gameIdInput.addEventListener("focus", () => {
    gameIdInput.style.borderColor = "#3b82f6";
  });
  gameIdInput.addEventListener("blur", () => {
    gameIdInput.style.borderColor = "#374151";
  });

  const goServersBtn = document.createElement("button");
  goServersBtn.textContent = "Go to servers page";
  Object.assign(goServersBtn.style, {
    width: "100%",
    padding: "6px",
    borderRadius: "6px",
    border: "none",
    background: "#374151",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "12px",
    marginBottom: "6px",
    transition: "background 0.15s ease, transform 0.05s ease"
  });
  goServersBtn.addEventListener("mouseover", () => {
    goServersBtn.style.background = "#4b5563";
  });
  goServersBtn.addEventListener("mouseout", () => {
    goServersBtn.style.background = "#374151";
  });

  const scanBtn = document.createElement("button");
  scanBtn.textContent = "Scan servers on this page";
  Object.assign(scanBtn.style, {
    width: "100%",
    padding: "6px",
    borderRadius: "6px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "12px",
    marginBottom: "6px",
    transition: "background 0.15s ease, transform 0.05s ease"
  });
  scanBtn.addEventListener("mouseover", () => {
    scanBtn.style.background = "#1d4ed8";
  });
  scanBtn.addEventListener("mouseout", () => {
    scanBtn.style.background = "#2563eb";
  });

  const serverStatus = document.createElement("div");
  Object.assign(serverStatus.style, {
    minHeight: "18px",
    fontSize: "11px",
    marginBottom: "4px"
  });

  const serverList = document.createElement("div");
  Object.assign(serverList.style, {
    maxHeight: "170px",
    overflowY: "auto",
    borderTop: "1px solid #111827",
    marginTop: "4px",
    paddingTop: "4px",
    fontSize: "11px"
  });

  function setServerStatus(text, color) {
    serverStatus.textContent = text;
    serverStatus.style.color = color;
  }
  setServerStatus("Enter a game ID or scan this page.", "#f9fafb");

  serverTab.appendChild(gameIdLabel);
  serverTab.appendChild(gameIdInput);
  serverTab.appendChild(goServersBtn);
  serverTab.appendChild(scanBtn);
  serverTab.appendChild(serverStatus);
  serverTab.appendChild(serverList);

  // ========== SERVER JOINING TAB UI ==========

  const joinLabel = document.createElement("div");
  joinLabel.textContent = "Enter server JobId to join:";
  Object.assign(joinLabel.style, {
    marginBottom: "4px",
    fontSize: "12px",
    color: "#f9fafb"
  });

  const joinJobInput = document.createElement("input");
  Object.assign(joinJobInput.style, {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid #374151",
    background: "#020617",
    color: "#f9fafb",
    boxSizing: "border-box",
    marginBottom: "6px",
    fontSize: "12px",
    outline: "none"
  });
  joinJobInput.placeholder = "e.g. 12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
  joinJobInput.addEventListener("focus", () => {
    joinJobInput.style.borderColor = "#3b82f6";
  });
  joinJobInput.addEventListener("blur", () => {
    joinJobInput.style.borderColor = "#374151";
  });

  const checkServerBtn = document.createElement("button");
  checkServerBtn.textContent = "Check server";
  Object.assign(checkServerBtn.style, {
    width: "100%",
    padding: "6px",
    borderRadius: "6px",
    border: "none",
    background: "#4b5563",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "12px",
    marginBottom: "6px",
    transition: "background 0.15s ease"
  });
  checkServerBtn.addEventListener("mouseover", () => {
    checkServerBtn.style.background = "#6b7280";
  });
  checkServerBtn.addEventListener("mouseout", () => {
    checkServerBtn.style.background = "#4b5563";
  });

  const joinServerBtn = document.createElement("button");
  joinServerBtn.textContent = "Join server";
  Object.assign(joinServerBtn.style, {
    width: "100%",
    padding: "6px",
    borderRadius: "6px",
    border: "none",
    background: "#22c55e",
    color: "#022c22",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "12px",
    marginBottom: "6px",
    transition: "background 0.15s ease"
  });
  joinServerBtn.addEventListener("mouseover", () => {
    joinServerBtn.style.background = "#16a34a";
  });
  joinServerBtn.addEventListener("mouseout", () => {
    joinServerBtn.style.background = "#22c55e";
  });

  const joinStatus = document.createElement("div");
  Object.assign(joinStatus.style, {
    minHeight: "18px",
    fontSize: "11px",
    marginBottom: "4px"
  });
  joinStatus.textContent = "Enter a JobId and choose an action.";
  joinStatus.style.color = "#f9fafb";

  joinTab.appendChild(joinLabel);
  joinTab.appendChild(joinJobInput);
  joinTab.appendChild(checkServerBtn);
  joinTab.appendChild(joinServerBtn);
  joinTab.appendChild(joinStatus);

  // ----- assemble body -----

  body.appendChild(tabBar);
  body.appendChild(tabDivider);
  body.appendChild(regionTab);
  body.appendChild(serverTab);
  body.appendChild(joinTab);

  widget.appendChild(header);
  widget.appendChild(body);
  widget.appendChild(logContainer);
  document.body.appendChild(widget);

  // ----- open animation -----

  requestAnimationFrame(() => {
    const fullHeight = body.scrollHeight;
    body.style.maxHeight = fullHeight + "px";
    body.style.opacity = "1";
  });

  // ----- minimize -----

  let minimized = false;
  function expandBody() {
    const fullHeight = body.scrollHeight;
    body.style.display = "block";
    void body.offsetHeight;
    body.style.maxHeight = fullHeight + "px";
    body.style.opacity = "1";
  }
  function collapseBody() {
    body.style.maxHeight = "0px";
    body.style.opacity = "0";
  }

  minimizeBtn.addEventListener("click", () => {
    minimized = !minimized;
    if (minimized) {
      minimizeBtn.textContent = "+";
      collapseBody();
      logVisible = false;
      viewLogBtn.textContent = "View search log";
      logContainer.style.maxHeight = "0px";
      logContainer.style.opacity = "0";
      setTimeout(() => {
        if (!logVisible) logContainer.style.display = "none";
      }, 200);
    } else {
      minimizeBtn.textContent = "–";
      expandBody();
    }
  });

  // ----- dragging -----

  let isDragging = false;
  let startX, startY, startLeft, startTop;

  header.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target === minimizeBtn) return;
    e.preventDefault();

    isDragging = true;
    header.setPointerCapture(e.pointerId);

    const rect = widget.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    widget.style.left = `${startLeft}px`;
    widget.style.top = `${startTop}px`;
    widget.style.bottom = "auto";
    widget.style.right = "auto";

    header.style.cursor = "grabbing";
    widget.style.transform = "scale(1.01)";
    widget.style.boxShadow = "0 12px 26px rgba(0,0,0,0.7)";
  });

  header.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    widget.style.left = `${startLeft + dx}px`;
    widget.style.top = `${startTop + dy}px`;
  });

  header.addEventListener("pointerup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    header.releasePointerCapture(e.pointerId);
    header.style.cursor = "grab";
    widget.style.transform = "scale(1)";
    widget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.55)";
  });

  // ========== REGION TAB LOGIC (API CALL) ==========

  async function fetchRegionForJobId(jobId) {
    jobId = jobId.trim();
    if (!jobId) {
      setRegionStatus("Enter a server ID", "#f9fafb");
      setResultPlaceholders();
      return;
    }

    setRegionStatus("Fetching server ID", "#facc15");
    regionFetchBtn.disabled = true;
    regionFetchBtn.textContent = "Fetching…";
    resultRegion.textContent = "Continental region: …";
    resultCountry.textContent = "Country region: …";
    resultSubregion.textContent = "Subregion: …";
    resultPing.textContent = "Estimated ping: …";

    try {
      const response = await fetch(WORKER_URL + encodeURIComponent(jobId));
      if (!response.ok) throw new Error("HTTP " + response.status);

      const data = await response.json();
      const regionCode = data.regionCode || null;
      const regionName = data.regionName || regionCode || "Unknown";
      const continent = data.continent || "Unknown";
      const country = data.country || "Unknown";
      const subregion = data.subregion || "Unknown";

      setRegionStatus("Server found", "#22c55e");
      resultRegion.textContent = "Continental region: " + regionName;
      const countryRegion =
        continent === "Unknown" ? country : `${continent} - ${country}`;
      resultCountry.textContent = "Country region: " + countryRegion;
      resultSubregion.textContent = "Subregion: " + subregion;

      const clientRegionCode = regionSelect.value || null;
      let pingText = "unavailable";

      if (!clientRegionCode) {
        pingText = "select your device region above.";
        resultPing.textContent = "Estimated ping: " + pingText;
      } else if (!regionCode) {
        pingText = "unknown (no region code).";
        resultPing.textContent = "Estimated ping: " + pingText;
      } else {
        const pingMs = estimatePingMs(clientRegionCode, regionCode);
        if (pingMs == null) {
          pingText = "unavailable.";
          resultPing.textContent = "Estimated ping: " + pingText;
        } else {
          pingText = "~" + pingMs + " ms";
          resultPing.textContent = "Estimated ping: " + pingText;
        }
      }

      addLogEntry(
        {
          timestamp: Date.now(),
          jobId,
          regionName,
          countryRegion,
          subregion,
          pingText
        },
        logContainer,
        logVisible
      );
    } catch (err) {
      console.error("Region lookup error:", err);
      setRegionStatus("An error has occurred", "#f97373");
      setResultPlaceholders();
    } finally {
      regionFetchBtn.disabled = false;
      regionFetchBtn.textContent = "Fetch region";
    }
  }

  regionFetchBtn.addEventListener("click", () => {
    fetchRegionForJobId(jobInput.value);
  });
  jobInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchRegionForJobId(jobInput.value);
  });

  // ========== SERVER TAB LOGIC (DOM SCAN) ==========

  goServersBtn.addEventListener("click", () => {
    const id = gameIdInput.value.trim();
    if (!id) {
      setServerStatus("Enter a game/place ID first.", "#f97373");
      return;
    }
    const url = `https://www.roblox.com/games/${encodeURIComponent(
      id
    )}/#!/game-instances`;
    window.location.href = url;
  });

  function findServerCardsOnPage() {
    const items = Array.from(
      document.querySelectorAll("li.rbx-public-game-server-item")
    );
    const cards = [];

    for (const item of items) {
      const idDiv = item.querySelector(".server-id-text");
      if (!idDiv) continue;
      const m = idDiv.textContent.match(/ID:\s*(.+)$/i);
      if (!m) continue;
      const jobId = m[1].trim();
      if (!jobId) continue;

      let robloxPing = null;
      const allDivs = Array.from(item.querySelectorAll("div"));
      const pingDiv = allDivs.find((d) =>
        /Avg\. Ping:/i.test(d.textContent || "")
      );
      if (pingDiv) {
        const pm = pingDiv.textContent.match(/Avg\. Ping:\s*([0-9]+)\s*ms/i);
        if (pm) robloxPing = pm[1] + " ms";
      }

      const joinBtn =
        Array.from(item.querySelectorAll("button")).find(
          (b) => b.textContent.trim().toLowerCase() === "join"
        ) || null;

      cards.push({ element: item, joinBtn, jobId, robloxPing });
    }

    return cards;
  }

  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function clickLoadMore(times = 4, delayMs = 500) {
    const selector =
      "#rbx-public-running-games > div.rbx-public-running-games-footer > button";
    for (let i = 0; i < times; i++) {
      const btn = document.querySelector(selector);
      if (!btn) break;
      btn.click();
      await sleep(delayMs);
    }
    await sleep(300);
  }

  async function scanServers() {
    serverList.innerHTML = "";
    setServerStatus("Loading more servers…", "#facc15");
    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning…";

    try {
      await clickLoadMore(4, 500);

      setServerStatus("Scanning page for servers…", "#facc15");

      const cards = findServerCardsOnPage();
      if (!cards.length) {
        setServerStatus(
          "No server cards found. Make sure you are on the servers tab.",
          "#f97373"
        );
        return;
      }

      const uniqueMap = new Map();
      for (const c of cards) {
        if (!uniqueMap.has(c.jobId)) uniqueMap.set(c.jobId, c);
      }
      const uniqueCards = Array.from(uniqueMap.values());
      const topCards = uniqueCards.slice(0, 32);

      setServerStatus(
        `Found ${uniqueCards.length} unique servers. Showing top ${topCards.length}.`,
        "#22c55e"
      );

      const clientRegionCode = regionSelect.value || null;

      const promises = topCards.map(async (card) => {
        try {
          const res = await fetch(WORKER_URL + encodeURIComponent(card.jobId));
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          return { card, data };
        } catch (e) {
          console.error("Worker error for", card.jobId, e);
          return { card, data: null, error: true };
        }
      });

      const results = await Promise.all(promises);
      serverList.innerHTML = "";

      results.forEach(({ card, data }) => {
        const row = document.createElement("div");
        Object.assign(row.style, {
          border: "1px solid #111827",
          borderRadius: "6px",
          padding: "7px 9px",
          marginBottom: "6px",
          background: "#020617"
        });

        const titleLine = document.createElement("div");
        titleLine.textContent = "JobId: " + card.jobId;
        titleLine.style.fontSize = "12px";
        titleLine.style.fontWeight = "600";
        row.appendChild(titleLine);

        if (!data) {
          const err = document.createElement("div");
          err.textContent = "Failed to fetch region info.";
          err.style.fontSize = "12px";
          err.style.color = "#f97373";
          row.appendChild(err);
        } else {
          const regionCode = data.regionCode || null;
          const regionName = data.regionName || regionCode || "Unknown";
          const continent = data.continent || "Unknown";
          const country = data.country || "Unknown";
          const subregion = data.subregion || "Unknown";

          const regionLine = document.createElement("div");
          regionLine.textContent = "Region: " + regionName;
          regionLine.style.fontSize = "12px";
          row.appendChild(regionLine);

          const countryRegion =
            continent === "Unknown" ? country : `${continent} - ${country}`;
          const countryLine = document.createElement("div");
          countryLine.textContent = "Country: " + countryRegion;
          countryLine.style.fontSize = "12px";
          row.appendChild(countryLine);

          const subLine = document.createElement("div");
          subLine.textContent = "Subregion: " + subregion;
          subLine.style.fontSize = "12px";
          row.appendChild(subLine);

          if (card.robloxPing) {
            const robloxPingLine = document.createElement("div");
            robloxPingLine.textContent =
              "Roblox listed ping: " + card.robloxPing;
            robloxPingLine.style.fontSize = "12px";
            row.appendChild(robloxPingLine);
          }

          const est = document.createElement("div");
          let pingText = "select device region in Region tab.";
          if (clientRegionCode && regionCode) {
            const ms = estimatePingMs(clientRegionCode, regionCode);
            pingText = ms == null ? "unavailable" : "~" + ms + " ms";
          }
          est.textContent = "Estimated ping for you: " + pingText;
          est.style.fontSize = "12px";
          row.appendChild(est);
        }

        const actions = document.createElement("div");
        Object.assign(actions.style, {
          display: "flex",
          justifyContent: "flex-start",
          marginTop: "4px",
          gap: "6px"
        });

        const joinBtn = document.createElement("button");
        joinBtn.textContent = "Join";
        Object.assign(joinBtn.style, {
          padding: "4px 14px",
          borderRadius: "999px",
          border: "none",
          background: "#22c55e",
          color: "#022c22",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "600"
        });
        joinBtn.addEventListener("click", () => {
          try {
            if (card.joinBtn) {
              card.joinBtn.click();
            } else {
              console.warn("No join button found for this card.");
            }
          } catch (e) {
            console.error("Failed to trigger join", e);
          }
        });

        actions.appendChild(joinBtn);
        row.appendChild(actions);

        serverList.appendChild(row);
      });
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = "Scan servers on this page";
    }
  }

  scanBtn.addEventListener("click", scanServers);

  if (window.location.href.includes("game-instances")) {
    setServerStatus(
      "On servers page. Click 'Scan servers on this page'.",
      "#22c55e"
    );
  }

  // ========== SERVER JOINING TAB LOGIC ==========

  function getCurrentPlaceId() {
    const urlMatch = window.location.href.match(/\/games\/(\d+)\//);
    if (urlMatch) return urlMatch[1];
    const el = document.querySelector("[data-placeid]");
    if (el) return el.getAttribute("data-placeid");
    return null;
  }

  checkServerBtn.addEventListener("click", async () => {
    const jobId = joinJobInput.value.trim();
    if (!jobId) {
      joinStatus.textContent = "Enter a JobId first.";
      joinStatus.style.color = "#f97373";
      return;
    }

    joinStatus.textContent = "Checking server status…";
    joinStatus.style.color = "#facc15";

    try {
      const res = await fetch(WORKER_URL + encodeURIComponent(jobId));
      if (!res.ok) {
        joinStatus.textContent = "Server appears inactive or unreachable.";
        joinStatus.style.color = "#f97373";
        return;
      }
      await res.json();
      joinStatus.textContent = "Server appears active and reachable.";
      joinStatus.style.color = "#22c55e";
    } catch (e) {
      console.error("Check server error:", e);
      joinStatus.textContent = "Error while checking server.";
      joinStatus.style.color = "#f97373";
    }
  });

  joinServerBtn.addEventListener("click", () => {
    const jobId = joinJobInput.value.trim();
    if (!jobId) {
      joinStatus.textContent = "Enter a JobId first.";
      joinStatus.style.color = "#f97373";
      return;
    }
    const placeId = getCurrentPlaceId();
    if (!placeId) {
      joinStatus.textContent =
        "Could not detect place ID. Open the game page first.";
      joinStatus.style.color = "#f97373";
      return;
    }
    const uri = `roblox://placeId=${placeId}&gameInstanceId=${jobId}`;
    joinStatus.textContent = "Attempting to join via Roblox client…";
    joinStatus.style.color = "#22c55e";
    window.location.href = uri;
  });
})();

// code written with all fixes and adjustments

(function () {
  // Avoid injecting twice
  if (window.__rbxRegionWidgetInjected) return;
  window.__rbxRegionWidgetInjected = true;

  const LOG_STORAGE_KEY = "rbx_region_log";
  const DEVICE_REGION_KEY = "rbx_device_region";

  // ----- Helper: ping estimation -----

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

    if (clientCode === serverCode) {
      return 30;
    }

    if (macroClient === macroServer) {
      return 60;
    }

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

  // ----- Helpers: log storage -----

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
    while (entries.length > 3) {
      entries.shift(); // keep last 3
    }
    saveLog(entries);
    if (logVisible) {
      renderLog(logContainer);
    }
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

      // JobId text
      const jobText = document.createElement("span");
      jobText.textContent = "JobId: " + e.jobId;
      job.appendChild(jobText);

      // NEW: mark newest entry as "Last searched server"
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

  // ========== WIDGET UI SETUP ==========

  const widget = document.createElement("div");
  widget.id = "rbx-region-widget";
  Object.assign(widget.style, {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "340px",
  background: "transparent", // let header/body define visible background
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

  // Header (drag + minimize)
  const header = document.createElement("div");
Object.assign(header.style, {
  cursor: "grab",
  padding: "8px 10px",
  background: "linear-gradient(90deg, #111827, #1f2937)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  userSelect: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
  msUserSelect: "none",
  touchAction: "none",
  borderTopLeftRadius: "10px",
  borderTopRightRadius: "10px"
});

  const title = document.createElement("span");
  // 4) Rename GUI
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

  // Body
  const body = document.createElement("div");
Object.assign(body.style, {
  padding: "12px 12px 16px 12px",
  background: "#050609",
  overflow: "hidden",
  maxHeight: "0px",
  opacity: "0",
  transition: "max-height 0.2s ease, opacity 0.2s ease",
  borderBottomLeftRadius: "10px",
  borderBottomRightRadius: "10px"
});

  // JobId label + input
  const label = document.createElement("div");
  label.textContent = "Enter server JobId:";
  Object.assign(label.style, {
    marginBottom: "4px",
    fontSize: "12px",
    color: "#f9fafb"
  });

  const input = document.createElement("input");
  Object.assign(input.style, {
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
  input.placeholder = "e.g. 12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx";

  input.addEventListener("focus", () => {
    input.style.borderColor = "#3b82f6";
  });
  input.addEventListener("blur", () => {
    input.style.borderColor = "#374151";
  });

  // Device region selector
  const regionLabel = document.createElement("div");
  regionLabel.textContent = "Select your device region:";
  Object.assign(regionLabel.style, {
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

  // small animation on hover/focus
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

  CLIENT_REGION_OPTIONS.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.code;
    o.textContent = opt.label;
    regionSelect.appendChild(o);
  });

  // Remember saved device region
  try {
    const savedRegion = localStorage.getItem(DEVICE_REGION_KEY);
    if (savedRegion && CLIENT_REGION_OPTIONS.some(o => o.code === savedRegion)) {
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

  const button = document.createElement("button");
  button.textContent = "Fetch region";
  Object.assign(button.style, {
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

  button.addEventListener("mousedown", () => {
    button.style.transform = "scale(0.98)";
  });
  button.addEventListener("mouseup", () => {
    button.style.transform = "scale(1)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "scale(1)";
  });
  button.addEventListener("mouseover", () => {
    button.style.background = "#1d4ed8";
  });
  button.addEventListener("mouseout", () => {
    button.style.background = "#2563eb";
  });

  const status = document.createElement("div");
  Object.assign(status.style, {
    minHeight: "18px",
    fontSize: "11px",
    marginBottom: "4px"
  });

  // Result lines
  const resultRegion = document.createElement("div");
  const resultCountry = document.createElement("div");
  const resultSubregion = document.createElement("div");
  const resultPing = document.createElement("div");

  [resultRegion, resultCountry, resultSubregion, resultPing].forEach(el => {
    Object.assign(el.style, {
      fontSize: "12px",
      marginTop: "2px"
    });
  });

  function setResultPlaceholders() {
    resultRegion.textContent = "Continental region: —";
    resultCountry.textContent = "Country region: —";
    resultSubregion.textContent = "Subregion: —";
    resultPing.textContent = "Estimated ping: —";
  }

  setResultPlaceholders();

  // View log button (bottom, smaller)
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

  // Log dropdown container (pop-out below card, animated)
  const logContainer = document.createElement("div");
  Object.assign(logContainer.style, {
    position: "absolute",
    left: "0",
    top: "100%",         // attach below the card, not inside
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
      // animate open
      requestAnimationFrame(() => {
        logContainer.style.maxHeight = "130px";
        logContainer.style.opacity = "1";
      });
    } else {
      viewLogBtn.textContent = "View search log";
      // animate close
      logContainer.style.maxHeight = "0px";
      logContainer.style.opacity = "0";
      setTimeout(() => {
        if (!logVisible) logContainer.style.display = "none";
      }, 200);
    }
  });

  body.appendChild(label);
  body.appendChild(input);
  body.appendChild(regionLabel);
  body.appendChild(regionSelect);
  body.appendChild(button);
  body.appendChild(status);
  body.appendChild(resultRegion);
  body.appendChild(resultCountry);
  body.appendChild(resultSubregion);
  body.appendChild(resultPing);
  body.appendChild(viewLogBtn);

  widget.appendChild(header);
  widget.appendChild(body);
  widget.appendChild(logContainer);
  document.body.appendChild(widget);

  // helper to set status text + color
  function setStatus(text, color) {
    status.textContent = text;
    status.style.color = color;
  }

  // initial status
  setStatus("Enter a server ID", "#f9fafb");

  // Start opened with animation
  requestAnimationFrame(() => {
    const fullHeight = body.scrollHeight;
    body.style.maxHeight = fullHeight + "px";
    body.style.opacity = "1";
  });

  // ========== MINIMIZE WITH ANIMATION ==========

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

      // also hide log nicely
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

  // ========== DRAGGING (POINTER EVENTS) ==========

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

  // ========== FETCH FUNCTION (CALLS CLOUDFLARE WORKER) ==========

  async function fetchRegionForJobId(jobId) {
    jobId = jobId.trim();

    if (!jobId) {
      setStatus("Enter a server ID", "#f9fafb");
      setResultPlaceholders();
      return;
    }

    setStatus("Fetching server ID", "#facc15");
    button.disabled = true;
    button.textContent = "Fetching…";
    resultRegion.textContent = "Continental region: …";
    resultCountry.textContent = "Country region: …";
    resultSubregion.textContent = "Subregion: …";
    resultPing.textContent = "Estimated ping: …";

    try {
      const response = await fetch(
        "https://roblox-region-worker.mishka-bilyi.workers.dev/?jobId=" +
        encodeURIComponent(jobId)
      );

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();

      if (!data) {
        throw new Error("Empty response");
      }

      const regionCode = data.regionCode || null;
      const regionName = data.regionName || regionCode || "Unknown";
      const continent = data.continent || "Unknown";
      const country = data.country || "Unknown";
      const subregion = data.subregion || "Unknown";

      setStatus("Server found", "#22c55e");

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
      setStatus("An error has occurred", "#f97373");
      setResultPlaceholders();
    } finally {
      button.disabled = false;
      button.textContent = "Fetch region";
    }
  }

  button.addEventListener("click", () => {
    fetchRegionForJobId(input.value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      fetchRegionForJobId(input.value);
    }
  });
})();

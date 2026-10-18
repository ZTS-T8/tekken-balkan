let currentPage = 1;
let currentTab = "T8";
let currentDisplayedList = [];
let currentDisplayedTournaments = [];

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSafeUrl(rawUrl) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function trackEvent(eventName, eventData) {
  if (typeof window.umami !== "undefined" && typeof window.umami.track === "function") {
    window.umami.track(eventName, eventData);
  }
}

function renderCountryFlagHtml(country, countryIso) {
  if (!country) return "";
  const safeCountry = escapeHTML(country);
  if (countryIso) {
    const safeIso = escapeHTML(countryIso.toLowerCase());
    return `<span class="country-tag"><img src="https://flagcdn.com/${safeIso}.svg" alt="${safeCountry}" class="flag-icon" loading="lazy">${safeCountry}</span>`;
  }
  return `<span class="country-tag">${safeCountry}</span>`;
}

function renderTrendHtml(trend) {
  if (!trend) return "";
  const safeLabel = escapeHTML(trend.label);
  if (trend.type === "up") return `<span class="trend-badge trend-up" title="Moved up ${trend.delta} spots">${safeLabel}</span>`;
  if (trend.type === "down") return `<span class="trend-badge trend-down" title="Moved down ${trend.delta} spots">${safeLabel}</span>`;
  if (trend.type === "new") return `<span class="trend-badge trend-new" title="New entry">${safeLabel}</span>`;
  return `<span class="trend-same" title="No rank change">—</span>`;
}

function switchTab(tabKey) {
  if (currentTab === tabKey) return;
  currentTab = tabKey;
  currentPage = 1;

  trackEvent("Switch Tab", { tab: tabKey });
  
  const meta = CONFIG.TAB_META[tabKey];
  document.body.className = meta.bodyClass;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabKey);
  });

  document.getElementById("era-badge").innerText = meta.badge;
  document.getElementById("header-subtitle").innerHTML = meta.subtitle;
  document.getElementById("search-input").placeholder = meta.searchPlaceholder;

  const isTournaments = tabKey === "TOURNAMENTS";
  document.getElementById("leaderboard-section").classList.toggle("hidden", isTournaments);
  document.getElementById("tournaments-section").classList.toggle("hidden", !isTournaments);

  if (DATA_STORE[tabKey]) {
    renderCurrentView();
  } else {
    fetchTabData(tabKey, false, () => {
      if (currentTab === tabKey) renderCurrentView();
    });
  }
}

function renderCurrentView() {
  if (currentTab === "TOURNAMENTS") {
    renderTournaments();
  } else {
    renderTable();
  }
}

function forceRefresh() {
  DATA_STORE[currentTab] = null;
  if (currentTab === "TOURNAMENTS") {
    document.getElementById("roadmap-list").innerHTML =
      '<div class="empty-cell">Refreshing tournaments...</div>';
  } else {
    document.getElementById("leaderboard-body").innerHTML =
      '<tr><td colspan="6" class="empty-cell">Refreshing...</td></tr>';
  }

  const activeTab = currentTab;
  fetchTabData(activeTab, true, () => {
    if (currentTab === activeTab) renderCurrentView();
  });
}

function changePage(newPage) {
  currentPage = newPage;
  renderTable();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderTable() {
  const allData = DATA_STORE[currentTab] || [];
  const query = document.getElementById("search-input").value.toLowerCase().trim();

  const filtered = query
    ? allData.filter(item => item.searchKey.includes(query))
    : allData;

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / CONFIG.PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * CONFIG.PAGE_SIZE;
  const endIndex = Math.min(startIndex + CONFIG.PAGE_SIZE, totalItems);
  currentDisplayedList = filtered.slice(startIndex, endIndex);

  let html = "";
  for (let i = 0; i < currentDisplayedList.length; i++) {
    const p = currentDisplayedList[i];
    const isUnlocked = p.rank <= CONFIG.UNLOCKED_LIMIT;

    const safeRank = escapeHTML(p.rank);
    const safePlayer = escapeHTML(p.player);
    const safeMain = escapeHTML(p.main);
    const safeWins = escapeHTML(p.wins);
    const safeMatches = escapeHTML(p.matches);
    const safeWinRate = escapeHTML(p.winRate);
    const safeElo = escapeHTML(p.elo);

    let rankHtml = `<span class="tekken-font font-bold text-muted">#${safeRank}</span>`;
    if (p.rank === 1) rankHtml = `<span class="tekken-font rank-badge rank-1">🥇 #1</span>`;
    else if (p.rank === 2) rankHtml = `<span class="tekken-font rank-badge rank-2">🥈 #2</span>`;
    else if (p.rank === 3) rankHtml = `<span class="tekken-font rank-badge rank-3">🥉 #3</span>`;

    const trendHtml = renderTrendHtml(p.trend);
    const flagBadgeHtml = renderCountryFlagHtml(p.country, p.countryIso);

    html += `
      <tr class="${isUnlocked ? "top50-row" : "locked-row"}" data-idx="${i}">
        <td class="text-center">
          <div class="rank-cell-wrap">
            ${rankHtml}
            ${trendHtml}
          </div>
        </td>
        <td>
          <div class="player-name-row">
            <strong class="text-white">${safePlayer}</strong>
            ${flagBadgeHtml}
          </div>
          ${safeMain ? `<div class="char-sub">${safeMain}</div>` : ""}
        </td>
        <td class="hide-sm text-center">${safeWins}W / ${safeMatches}M</td>
        <td class="hide-sm text-center font-bold text-green">${safeWinRate}</td>
        <td class="tekken-font elo-cell">${safeElo}</td>
        <td class="text-center">
          ${
            isUnlocked
              ? `<span class="btn-card">Card ↗</span>`
              : `<span class="locked-label">🔒 ${CONFIG.UNLOCKED_LIMIT + 1}+</span>`
          }
        </td>
      </tr>
    `;
  }

  document.getElementById("leaderboard-body").innerHTML =
    html || '<tr><td colspan="6" class="empty-cell">No players found</td></tr>';

  const infoEl = document.getElementById("pagination-info");
  const indicatorEl = document.getElementById("page-indicator");
  document.getElementById("btn-prev-page").disabled = currentPage <= 1;
  document.getElementById("btn-next-page").disabled = currentPage >= totalPages;

  if (totalItems === 0) {
    infoEl.innerText = "No players found";
    indicatorEl.innerText = "0 / 0";
  } else {
    infoEl.innerText = `Showing ${startIndex + 1}–${endIndex} of ${totalItems} players`;
    indicatorEl.innerText = `Page ${currentPage} / ${totalPages}`;
  }
}

function renderTournaments() {
  const allTournaments = DATA_STORE["TOURNAMENTS"] || [];
  const query = document.getElementById("search-input").value.toLowerCase().trim();

  currentDisplayedTournaments = query
    ? allTournaments.filter(t => t.searchKey.includes(query))
    : allTournaments;

  const container = document.getElementById("roadmap-list");
  if (currentDisplayedTournaments.length === 0) {
    container.innerHTML = '<div class="empty-cell">No tournaments found.</div>';
    return;
  }

  let html = "";
  for (let i = 0; i < currentDisplayedTournaments.length; i++) {
    const t = currentDisplayedTournaments[i];
    let statusLabel = "Upcoming";
    if (t.statusType === "completed") statusLabel = "Completed";
    else if (t.statusType === "live") statusLabel = "Live Now";

    const safeStatusType = escapeHTML(t.statusType);
    const safeTierClass = escapeHTML(t.tierClass);
    const safeTierLabel = escapeHTML(t.tierLabel);
    const safeName = escapeHTML(t.name);
    const safeDate = escapeHTML(t.date);
    const safeTime = escapeHTML(t.time);
    const safeLocation = escapeHTML(t.location);

    html += `
      <div class="roadmap-item" data-tidx="${i}">
        <div class="roadmap-dot ${safeStatusType}"></div>
        <div>
          <div class="t-badge-group">
            <span class="t-status ${safeStatusType}">${statusLabel}</span>
            <span class="tier-badge ${safeTierClass}">${safeTierLabel}</span>
          </div>
          <h3 class="tekken-font t-title">${safeName}</h3>
          <div class="t-meta">
            <span>📅 ${safeDate}</span>
            <span>⏰ ${safeTime}</span>
            <span>📍 ${safeLocation}</span>
          </div>
        </div>
        <div>
          <span class="btn-card">Details & Start.gg ↗</span>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// Draws the SVG ELO Progression Graph (Y = ELO, X = Event Number)
function renderEloChart(history) {
  const svg = document.getElementById("elo-chart-svg");
  const tooltip = document.getElementById("chart-tooltip");
  tooltip.classList.add("hidden");

  const n = history.length;
  const minVal = Math.min(...history);
  const maxVal = Math.max(...history);
  const netDiff = history[n - 1] - history[0];

  // Update summary pills
  document.getElementById("chart-peak-elo").innerText = `Peak: ${Math.round(maxVal * 10) / 10}`;
  const netEl = document.getElementById("chart-net-change");
  const sign = netDiff >= 0 ? "+" : "";
  netEl.innerText = `${sign}${Math.round(netDiff * 10) / 10} ELO`;
  netEl.style.color = netDiff >= 0 ? "var(--green)" : "#fb7185";

  // SVG dimensions & padding
  const width = 430;
  const height = 230;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Calculate nice Y-axis bounds
  const rawRange = maxVal - minVal;
  const buffer = rawRange === 0 ? 25 : rawRange * 0.12;
  const yMin = Math.floor((minVal - buffer) / 10) * 10;
  const yMax = Math.ceil((maxVal + buffer) / 10) * 10;
  const ySpan = yMax - yMin || 1;

  const getX = idx => (n === 1 ? padLeft + plotW / 2 : padLeft + (idx / (n - 1)) * plotW);
  const getY = val => padTop + plotH - ((val - yMin) / ySpan) * plotH;

  let svgHtml = `
    <defs>
      <linearGradient id="eloAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
  `;

  // Y-Axis Gridlines & Labels (4 steps)
  const ySteps = 4;
  for (let s = 0; s <= ySteps; s++) {
    const val = yMin + (s / ySteps) * ySpan;
    const y = getY(val).toFixed(1);
    svgHtml += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
      <text x="${padLeft - 7}" y="${Number(y) + 3}" text-anchor="end" class="chart-axis-label">${Math.round(val)}</text>
    `;
  }

  // X-Axis Ticks & Event Number Labels
  const maxTicks = Math.min(n, 6);
  const tickIndices = new Set([0, n - 1]);
  for (let t = 1; t < maxTicks - 1; t++) {
    tickIndices.add(Math.round((t / (maxTicks - 1)) * (n - 1)));
  }

  Array.from(tickIndices)
    .sort((a, b) => a - b)
    .forEach(idx => {
      const x = getX(idx).toFixed(1);
      svgHtml += `
        <line x1="${x}" y1="${padTop + plotH}" x2="${x}" y2="${padTop + plotH + 4}" class="chart-axis-line" />
        <text x="${x}" y="${padTop + plotH + 15}" text-anchor="middle" class="chart-axis-label">#${idx + 1}</text>
      `;
    });

  // Axis Titles
  svgHtml += `
    <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" class="chart-axis-line" />
    <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" class="chart-axis-line" />
    <text x="${padLeft + plotW / 2}" y="${height - 4}" text-anchor="middle" class="chart-axis-title">Event Number</text>
    <text x="12" y="${padTop + plotH / 2}" text-anchor="middle" transform="rotate(-90 12 ${padTop + plotH / 2})" class="chart-axis-title">ELO</text>
  `;

  // Line & Area Polygon
  const coords = history.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`);
  if (n > 1) {
    const areaPoints = `${getX(0).toFixed(1)},${(padTop + plotH).toFixed(1)} ${coords.join(" ")} ${getX(n - 1).toFixed(1)},${(padTop + plotH).toFixed(1)}`;
    svgHtml += `<polygon points="${areaPoints}" fill="url(#eloAreaGrad)" />`;
    svgHtml += `<polyline points="${coords.join(" ")}" class="chart-line" />`;
  }

  // Data Points (with hover data attributes)
  const pointRadius = n > 20 ? 3 : 4;
  history.forEach((v, i) => {
    const cx = getX(i).toFixed(1);
    const cy = getY(v).toFixed(1);
    svgHtml += `<circle cx="${cx}" cy="${cy}" r="${pointRadius}" class="chart-point" data-event="${i + 1}" data-elo="${v}" />`;
  });

  svg.innerHTML = svgHtml;
}

function openPlayerModal(p) {
  trackEvent("View Player Card", { player: p.player, era: currentTab, country: p.country || "Unknown" });
  
  document.getElementById("modal-rank").innerText = `#${p.rank}`;
  document.getElementById("modal-player").innerText = p.player;
  document.getElementById("modal-trend").innerHTML = renderTrendHtml(p.trend);

  const modalCountryEl = document.getElementById("modal-country");
  const modalCountryDetailEl = document.getElementById("modal-country-detail");

  if (p.country) {
    const safeCountry = escapeHTML(p.country);
    if (p.countryIso) {
      const safeIso = escapeHTML(p.countryIso.toLowerCase());
      const flagImg = `<img src="https://flagcdn.com/${safeIso}.svg" alt="${safeCountry}" class="flag-icon">`;
      modalCountryEl.innerHTML = `${flagImg} ${safeCountry}`;
      modalCountryDetailEl.innerHTML = `${flagImg} ${safeCountry}`;
    } else {
      modalCountryEl.innerText = `📍 ${p.country}`;
      modalCountryDetailEl.innerText = p.country;
    }
  } else {
    modalCountryEl.innerText = "";
    modalCountryDetailEl.innerText = "Not specified";
  }

  document.getElementById("modal-main-detail").innerText = p.main || "Not specified";
  document.getElementById("modal-elo").innerText = p.elo;
  document.getElementById("modal-matches").innerText = `${p.wins} / ${p.matches}`;

  const numericWinRate = parseFloat(String(p.winRate).replace("%", "").replace(",", ".")) || 0;
  document.getElementById("modal-winrate").innerText = `${numericWinRate}%`;
  document.getElementById("modal-winrate-text").innerText = `${numericWinRate}%`;
  document.getElementById("modal-winrate-bar").style.width = `${Math.min(numericWinRate, 100)}%`;

  // Show or hide the ELO History chart column
  const modalBox = document.getElementById("player-modal-box");
  const chartCol = document.getElementById("elo-chart-col");

  if (p.eloHistory && p.eloHistory.length > 0) {
    modalBox.classList.add("has-chart");
    chartCol.classList.remove("hidden");
    renderEloChart(p.eloHistory);
  } else {
    modalBox.classList.remove("has-chart");
    chartCol.classList.add("hidden");
  }

  document.getElementById("player-modal").classList.add("open");
}

function openTournamentModal(t) {
  trackEvent("View Tournament", { tournament: t.name, tier: t.tierLabel });
  
  const statusEl = document.getElementById("t-modal-status");
  statusEl.className = `t-status ${t.statusType}`;
  statusEl.innerText =
    t.statusType === "completed"
      ? "Completed"
      : t.statusType === "live"
      ? "Live Now"
      : "Upcoming";

  const tierBadgeEl = document.getElementById("t-modal-tier-badge");
  tierBadgeEl.className = `tier-badge ${t.tierClass}`;
  tierBadgeEl.innerText = t.tierLabel;

  document.getElementById("t-modal-name").innerText = t.name;
  document.getElementById("t-modal-date").innerText = t.date;
  document.getElementById("t-modal-time").innerText = t.time;
  document.getElementById("t-modal-location").innerText = t.location;

  const descBox = document.getElementById("t-modal-desc-box");
  if (t.desc) {
    descBox.style.display = "flex";
    document.getElementById("t-modal-desc").innerText = t.desc;
  } else {
    descBox.style.display = "none";
  }

  const linkBtn = document.getElementById("t-modal-link");
  const safeHref = getSafeUrl(t.link);
  if (safeHref) {
    linkBtn.style.display = "block";
    linkBtn.href = safeHref;
  } else {
    linkBtn.style.display = "none";
  }

  document.getElementById("tournament-modal").classList.add("open");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
  });

  document.getElementById("search-input").addEventListener("input", () => {
    currentPage = 1;
    renderCurrentView();
  });
  document.getElementById("btn-refresh").addEventListener("click", forceRefresh);

  document.getElementById("btn-prev-page").addEventListener("click", () => changePage(currentPage - 1));
  document.getElementById("btn-next-page").addEventListener("click", () => changePage(currentPage + 1));

  document.getElementById("leaderboard-body").addEventListener("click", event => {
    const tr = event.target.closest("tr.top50-row");
    if (!tr) return;
    const idx = parseInt(tr.getAttribute("data-idx"), 10);
    const p = currentDisplayedList[idx];
    if (p && p.rank <= CONFIG.UNLOCKED_LIMIT) openPlayerModal(p);
  });

  document.getElementById("roadmap-list").addEventListener("click", event => {
    const item = event.target.closest(".roadmap-item");
    if (!item) return;
    const idx = parseInt(item.getAttribute("data-tidx"), 10);
    const t = currentDisplayedTournaments[idx];
    if (t) openTournamentModal(t);
  });

  // Hover tooltip on ELO chart data points
  const chartSvg = document.getElementById("elo-chart-svg");
  const chartTooltip = document.getElementById("chart-tooltip");
  chartSvg.addEventListener("mouseover", event => {
    const pt = event.target.closest(".chart-point");
    if (!pt) return;
    const evNum = pt.getAttribute("data-event");
    const eloVal = pt.getAttribute("data-elo");
    chartTooltip.innerText = `Event #${evNum}: ${eloVal} ELO`;
    chartTooltip.classList.remove("hidden");
  });
  chartSvg.addEventListener("mouseout", event => {
    if (event.target.closest(".chart-point")) {
      chartTooltip.classList.add("hidden");
    }
  });

  const playerModal = document.getElementById("player-modal");
  const tournamentModal = document.getElementById("tournament-modal");

  document.getElementById("close-player-modal").addEventListener("click", () => playerModal.classList.remove("open"));
  playerModal.addEventListener("click", e => {
    if (e.target === playerModal) playerModal.classList.remove("open");
  });

  document.getElementById("close-tournament-modal").addEventListener("click", () => tournamentModal.classList.remove("open"));
  tournamentModal.addEventListener("click", e => {
    if (e.target === tournamentModal) tournamentModal.classList.remove("open");
  });

  fetchTabData("T8", false, () => {
    if (currentTab === "T8") renderCurrentView();
  });
  fetchTabData("T7");
  fetchTabData("TOURNAMENTS");
});

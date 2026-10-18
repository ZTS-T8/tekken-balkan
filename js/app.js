let currentPage = 1;
let currentTab = "T8";
let currentDisplayedList = [];
let currentDisplayedTournaments = [];

// Regional Map State
let selectedRegionId = "ALL";
let regionStatsEra = "T8";
let currentRegionalList = [];

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

function getRegionMetaById(regionId) {
  for (const country of CONFIG.REGIONS_CONFIG) {
    for (const sub of country.subRegions) {
      if (sub.id === regionId) {
        return { countryName: country.countryName, countryCode: country.countryCode, subName: sub.name };
      }
    }
  }
  return null;
}

function switchTab(tabKey) {
  if (currentTab === tabKey) return;
  currentTab = tabKey;
  currentPage = 1;

  const meta = CONFIG.TAB_META[tabKey];
  document.body.className = meta.bodyClass;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabKey);
  });

  document.getElementById("era-badge").innerText = meta.badge;
  document.getElementById("header-subtitle").innerHTML = meta.subtitle;
  document.getElementById("search-input").placeholder = meta.searchPlaceholder;

  document.getElementById("leaderboard-section").classList.toggle("hidden", tabKey !== "T8" && tabKey !== "T7");
  document.getElementById("tournaments-section").classList.toggle("hidden", tabKey !== "TOURNAMENTS");
  document.getElementById("regions-section").classList.toggle("hidden", tabKey !== "REGIONS");

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
  } else if (currentTab === "REGIONS") {
    renderRegions();
  } else {
    renderTable();
  }
}

function forceRefresh() {
  DATA_STORE[currentTab] = null;
  if (currentTab === "TOURNAMENTS") {
    document.getElementById("roadmap-list").innerHTML =
      '<div class="empty-cell">Refreshing tournaments...</div>';
  } else if (currentTab === "REGIONS") {
    document.getElementById("region-players-list").innerHTML =
      '<div class="empty-cell">Refreshing regional data...</div>';
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
    const safeTierMultiplier = escapeHTML(t.tierMultiplier);
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
            <span class="tier-weight-pill tekken-font">⚖️ ${safeTierMultiplier}</span>
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

function selectRegion(regionId) {
  selectedRegionId = regionId;
  renderRegions();
}

function renderRegions() {
  const allLinked = getLinkedRegionalPlayers(regionStatsEra);
  const query = document.getElementById("search-input").value.toLowerCase().trim();

  // Count players per sub-region
  const countsByRegion = {};
  CONFIG.REGIONS_CONFIG.forEach(c => {
    c.subRegions.forEach(sub => {
      countsByRegion[sub.id] = 0;
    });
  });

  allLinked.forEach(item => {
    if (countsByRegion[item.regionId] !== undefined) {
      countsByRegion[item.regionId]++;
    }
  });

  // Update SVG map counts & active highlights
  document.querySelectorAll(".map-zone").forEach(zoneEl => {
    const rId = zoneEl.getAttribute("data-region");
    const count = countsByRegion[rId] || 0;
    const countText = document.getElementById(`svg-count-${rId}`);
    if (countText) countText.textContent = `${count}p`;
    zoneEl.classList.toggle("active", selectedRegionId === rId);
  });

  // Filter for right-hand inspector
  const filtered = allLinked.filter(item => {
    const matchesRegion = selectedRegionId === "ALL" || item.regionId === selectedRegionId;
    const regionMeta = getRegionMetaById(item.regionId);
    const regionName = regionMeta ? `${regionMeta.countryName} ${regionMeta.subName}`.toLowerCase() : "";
    const matchesQuery =
      !query ||
      item.player.toLowerCase().includes(query) ||
      item.main.toLowerCase().includes(query) ||
      regionName.includes(query);
    return matchesRegion && matchesQuery;
  });

  currentRegionalList = filtered;

  // Update Inspector Header
  const badgeEl = document.getElementById("inspector-country-badge");
  const titleEl = document.getElementById("inspector-title");

  if (selectedRegionId === "ALL") {
    badgeEl.innerText = "All 5 Countries";
    titleEl.innerText = "All Balkan Regions (13)";
  } else {
    const meta = getRegionMetaById(selectedRegionId);
    badgeEl.innerText = meta ? meta.countryName : selectedRegionId;
    titleEl.innerText = meta ? meta.subName : selectedRegionId;
  }

  // Update Inspector Summary Stats
  const rankedPlayers = filtered.filter(p => p.eloNum > 0);
  const avgElo =
    rankedPlayers.length > 0
      ? Math.round(rankedPlayers.reduce((sum, p) => sum + p.eloNum, 0) / rankedPlayers.length)
      : 0;

  document.getElementById("inspector-player-count").innerText = filtered.length;
  document.getElementById("inspector-avg-elo").innerText = avgElo || "—";
  document.getElementById("inspector-top-player").innerText =
    rankedPlayers.length > 0 ? rankedPlayers[0].player : "—";

  // Render Inspector Player List
  const listEl = document.getElementById("region-players-list");
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-cell">No players found in this region.</div>`;
  } else {
    let listHtml = "";
    filtered.forEach((item, idx) => {
      const stats = item.activeStats;
      const isUnlocked = stats && stats.rank <= CONFIG.UNLOCKED_LIMIT;
      const rMeta = getRegionMetaById(item.regionId);
      const safePlayer = escapeHTML(item.player);
      const safeMain = escapeHTML(item.main);
      const safeSubName = escapeHTML(rMeta ? rMeta.subName : item.regionId);
      const flagHtml = renderCountryFlagHtml(item.country, item.countryIso);

      const rankLabel = stats ? `#${escapeHTML(stats.rank)}` : "Unranked";
      const eloLabel = stats ? `${escapeHTML(stats.elo)} ELO` : `No ${regionStatsEra} Data`;

      listHtml += `
        <div class="region-player-item ${isUnlocked ? "" : "locked"}" data-ridx="${idx}">
          <div>
            <div class="player-name-row">
              <span class="tekken-font font-bold text-muted">${rankLabel}</span>
              <strong class="text-white">${safePlayer}</strong>
              ${flagHtml}
            </div>
            <div class="char-sub">📍 ${safeSubName} ${safeMain ? `• ${safeMain}` : ""}</div>
          </div>
          <div class="text-right">
            <div class="tekken-font font-bold text-white">${eloLabel}</div>
            <div style="font-size:11px; color:var(--accent-light)">
              ${isUnlocked ? "View Card ↗" : stats ? `🔒 #${stats.rank}` : ""}
            </div>
          </div>
        </div>
      `;
    });
    listEl.innerHTML = listHtml;
  }

  // Render Bottom Country & Sub-Region Breakdown Cards
  const gridEl = document.getElementById("country-breakdown-grid");
  let cardsHtml = "";

  CONFIG.REGIONS_CONFIG.forEach(country => {
    const totalCountryPlayers = country.subRegions.reduce(
      (sum, sub) => sum + (countsByRegion[sub.id] || 0),
      0
    );
    const flagImg = `<img src="https://flagcdn.com/${country.countryCode}.svg" alt="${escapeHTML(country.countryName)}" class="flag-icon">`;

    let subRowsHtml = "";
    country.subRegions.forEach(sub => {
      const c = countsByRegion[sub.id] || 0;
      const isActive = selectedRegionId === sub.id;
      subRowsHtml += `
        <div class="subregion-row ${isActive ? "active" : ""}" data-region-select="${sub.id}">
          <span>📍 <strong>${escapeHTML(sub.name)}</strong></span>
          <span class="tekken-font font-bold text-white">${c} ${c === 1 ? "player" : "players"}</span>
        </div>
      `;
    });

    cardsHtml += `
      <div class="country-card">
        <div class="country-card-header">
          <div class="player-name-row">
            ${flagImg}
            <h4 class="tekken-font" style="font-size:18px; text-transform:uppercase">${escapeHTML(country.countryName)}</h4>
          </div>
          <span class="era-badge">${totalCountryPlayers} Players</span>
        </div>
        <div class="subregion-list">
          ${subRowsHtml}
        </div>
      </div>
    `;
  });

  gridEl.innerHTML = cardsHtml;
}

function openPlayerModal(p) {
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

  document.getElementById("player-modal").classList.add("open");
}

function openTournamentModal(t) {
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

  document.getElementById("t-modal-weight").innerText = t.tierMultiplier;
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

  // Table row click (Top 50)
  document.getElementById("leaderboard-body").addEventListener("click", event => {
    const tr = event.target.closest("tr.top50-row");
    if (!tr) return;
    const idx = parseInt(tr.getAttribute("data-idx"), 10);
    const p = currentDisplayedList[idx];
    if (p && p.rank <= CONFIG.UNLOCKED_LIMIT) openPlayerModal(p);
  });

  // Tournament item click
  document.getElementById("roadmap-list").addEventListener("click", event => {
    const item = event.target.closest(".roadmap-item");
    if (!item) return;
    const idx = parseInt(item.getAttribute("data-tidx"), 10);
    const t = currentDisplayedTournaments[idx];
    if (t) openTournamentModal(t);
  });

  // SVG Map Zone Click
  document.getElementById("balkan-svg-map").addEventListener("click", event => {
    const zone = event.target.closest(".map-zone");
    if (!zone) return;
    const rId = zone.getAttribute("data-region");
    selectRegion(selectedRegionId === rId ? "ALL" : rId);
  });

  // Reset Region Filter Button
  document.getElementById("btn-reset-region").addEventListener("click", () => selectRegion("ALL"));

  // Regional Era Toggle (T8 vs T7 stats inside Regional Map)
  document.querySelectorAll(".mini-era-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      regionStatsEra = btn.getAttribute("data-regera");
      document.querySelectorAll(".mini-era-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-regera") === regionStatsEra);
      });
      renderRegions();
    });
  });

  // Click on Subregion Row in Country Cards
  document.getElementById("country-breakdown-grid").addEventListener("click", event => {
    const row = event.target.closest("[data-region-select]");
    if (!row) return;
    const rId = row.getAttribute("data-region-select");
    selectRegion(selectedRegionId === rId ? "ALL" : rId);
    document.getElementById("regions-section").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Click on Player inside Regional Inspector to open their Top 50 Card
  document.getElementById("region-players-list").addEventListener("click", event => {
    const itemEl = event.target.closest(".region-player-item");
    if (!itemEl) return;
    const idx = parseInt(itemEl.getAttribute("data-ridx"), 10);
    const entry = currentRegionalList[idx];
    if (entry && entry.activeStats && entry.activeStats.rank <= CONFIG.UNLOCKED_LIMIT) {
      openPlayerModal(entry.activeStats);
    }
  });

  // Close Modals
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

  // Preload all 4 tabs
  fetchTabData("T8", false, () => {
    if (currentTab === "T8") renderCurrentView();
  });
  fetchTabData("T7");
  fetchTabData("TOURNAMENTS");
  fetchTabData("REGIONS");
});

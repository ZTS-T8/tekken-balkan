let currentPage = 1;
let currentTab = "T8";
let currentDisplayedList = [];
let currentDisplayedTournaments = [];

// Head-to-Head State
let h2hActiveEra = "T8";
let currentModalPlayerName = "";
let currentModalPlayerMatchups = [];

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

  const searchInput = document.getElementById("search-input");
  searchInput.placeholder = meta.searchPlaceholder;
  searchInput.classList.toggle("hidden", tabKey === "H2H");

  const isLeaderboard = tabKey === "T8" || tabKey === "T7";
  document.getElementById("leaderboard-section").classList.toggle("hidden", !isLeaderboard);
  document.getElementById("h2h-section").classList.toggle("hidden", tabKey !== "H2H");
  document.getElementById("tournaments-section").classList.toggle("hidden", tabKey !== "TOURNAMENTS");

  if (tabKey === "H2H") {
    fetchTabData(h2hActiveEra, false, () => {
      fetchH2HData(h2hActiveEra, false, () => {
        populateH2HDropdowns();
        renderH2HComparison();
      });
    });
  } else if (DATA_STORE[tabKey]) {
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
  } else if (currentTab === "H2H") {
    populateH2HDropdowns();
    renderH2HComparison();
  } else {
    renderTable();
  }
}

function forceRefresh() {
  if (currentTab === "H2H") {
    document.getElementById("h2h-result-container").innerHTML =
      '<div class="empty-cell">Refreshing Head-to-Head records...</div>';
    DATA_STORE[`H2H_${h2hActiveEra}`] = null;
    fetchH2HData(h2hActiveEra, true, () => {
      populateH2HDropdowns();
      renderH2HComparison();
    });
    return;
  }

  DATA_STORE[currentTab] = null;
  if (currentTab === "TOURNAMENTS") {
    document.getElementById("roadmap-list").innerHTML =
      '<div class="empty-cell">Refreshing tournaments...</div>';
  } else {
    document.getElementById("leaderboard-body").innerHTML =
      '<tr><td colspan="6" class="empty-cell">Refreshing...</td></tr>';
    DATA_STORE[`H2H_${currentTab}`] = null;
    fetchH2HData(currentTab, true);
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

// Populates the Player 1 and Player 2 <select> dropdowns once per era
function populateH2HDropdowns() {
  const store = DATA_STORE[`H2H_${h2hActiveEra}`] || { recordsByPlayer: {}, players: [] };

  const nameMap = new Map();
  Object.keys(store.recordsByPlayer || {}).forEach(key => {
    const matchups = store.recordsByPlayer[key];
    if (matchups && Object.keys(matchups).length > 0) {
      // Find canonical display name from store.players or leaderboard
      const display =
        (store.players || []).find(n => n.toLowerCase() === key) || key;
      nameMap.set(key, display);
    }
  });

  const sortedNames = Array.from(nameMap.values()).sort((a, b) => a.localeCompare(b));

  const p1Select = document.getElementById("h2h-p1-select");
  const p2Select = document.getElementById("h2h-p2-select");
  const prevP1 = p1Select.value;
  const prevP2 = p2Select.value;

  const optionsHtml = sortedNames
    .map(n => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`)
    .join("");

  p1Select.innerHTML = `<option value="">— Select Player 1 (${sortedNames.length}) —</option>${optionsHtml}`;
  p2Select.innerHTML = `<option value="">— Select Player 2 (${sortedNames.length}) —</option>${optionsHtml}`;

  if (prevP1 && nameMap.has(prevP1.toLowerCase())) {
    p1Select.value = nameMap.get(prevP1.toLowerCase());
  } else {
    p1Select.value = "";
  }

  if (prevP2 && nameMap.has(prevP2.toLowerCase())) {
    p2Select.value = nameMap.get(prevP2.toLowerCase());
  } else {
    p2Select.value = "";
  }
}

function updatePlayer2OptionsForPlayer1() {
  const store = DATA_STORE[`H2H_${h2hActiveEra}`] || { recordsByPlayer: {}, players: [] };
  const p1Raw = document.getElementById("h2h-p1-select").value.trim();
  const p2Select = document.getElementById("h2h-p2-select");
  const prevP2 = p2Select.value;

  if (!p1Raw) {
    populateH2HDropdowns();
    return;
  }

  const p1Matchups = (store.recordsByPlayer || {})[p1Raw.toLowerCase()] || {};
  const opponents = Object.values(p1Matchups)
    .map(m => m.opponent)
    .sort((a, b) => a.localeCompare(b));

  const optionsHtml = opponents
    .map(n => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`)
    .join("");

  p2Select.innerHTML = `<option value="">— Select Opponent (${opponents.length} played) —</option>${optionsHtml}`;

  if (prevP2 && opponents.some(o => o.toLowerCase() === prevP2.toLowerCase())) {
    p2Select.value = opponents.find(o => o.toLowerCase() === prevP2.toLowerCase());
  } else {
    p2Select.value = "";
  }
}

// Renders the Head-to-Head VS result banner
function renderH2HComparison() {
  const store = DATA_STORE[`H2H_${h2hActiveEra}`] || { recordsByPlayer: {}, players: [] };
  const leaderboardList = DATA_STORE[h2hActiveEra] || [];

  const p1Raw = document.getElementById("h2h-p1-select").value.trim();
  const p2Raw = document.getElementById("h2h-p2-select").value.trim();
  const resultBox = document.getElementById("h2h-result-container");

  if (!p1Raw || !p2Raw) {
    resultBox.innerHTML = `<div class="empty-cell">Select Player 1 and Player 2 from the dropdowns above to view their ${h2hActiveEra} Head-to-Head record.</div>`;
    return;
  }

  const k1 = p1Raw.toLowerCase();
  const k2 = p2Raw.toLowerCase();

  if (k1 === k2) {
    resultBox.innerHTML = `<div class="empty-cell">Please select two different players to compare.</div>`;
    return;
  }

  const p1Profile = leaderboardList.find(p => p.player.toLowerCase() === k1);
  const p2Profile = leaderboardList.find(p => p.player.toLowerCase() === k2);

  const p1Matchups = store.recordsByPlayer[k1] || {};
  const directRecord = p1Matchups[k2] || { wins: 0, losses: 0, total: 0, winRate: 50 };

  const p1Wins = directRecord.wins;
  const p2Wins = directRecord.losses;
  const totalSets = p1Wins + p2Wins;
  const p1Pct = totalSets > 0 ? Math.round((p1Wins / totalSets) * 100) : 50;
  const p2Pct = totalSets > 0 ? 100 - p1Pct : 50;

  const p1Display = escapeHTML(p1Profile ? p1Profile.player : p1Raw);
  const p2Display = escapeHTML(p2Profile ? p2Profile.player : p2Raw);

  trackEvent("Compare H2H", { p1: p1Display, p2: p2Display, era: h2hActiveEra });

  resultBox.innerHTML = `
    <div class="h2h-versus-banner">
      <div class="h2h-score-row">
        <div class="h2h-fighter-col">
          <div class="tekken-font h2h-fighter-name">${p1Display}</div>
          <div class="char-sub">
            ${p1Profile ? `#${escapeHTML(p1Profile.rank)} • ${escapeHTML(p1Profile.elo)} ELO${p1Profile.main ? ` • ${escapeHTML(p1Profile.main)}` : ""}` : "Unranked"}
          </div>
        </div>

        <div class="tekken-font h2h-score-center">
          <span style="color:var(--accent-light)">${p1Wins}</span>
          <span class="text-muted" style="font-size:24px">–</span>
          <span class="text-green">${p2Wins}</span>
        </div>

        <div class="h2h-fighter-col">
          <div class="tekken-font h2h-fighter-name">${p2Display}</div>
          <div class="char-sub">
            ${p2Profile ? `#${escapeHTML(p2Profile.rank)} • ${escapeHTML(p2Profile.elo)} ELO${p2Profile.main ? ` • ${escapeHTML(p2Profile.main)}` : ""}` : "Unranked"}
          </div>
        </div>
      </div>

      <div class="h2h-tug-bar">
        <div class="h2h-tug-p1" style="width:${p1Pct}%"></div>
        <div class="h2h-tug-p2" style="width:${p2Pct}%"></div>
      </div>

      <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--muted); font-weight:700">
        <span>${totalSets > 0 ? `${p1Pct}% Win Rate` : "No recorded sets"}</span>
        <span>${totalSets} Total ${totalSets === 1 ? "Match" : "Matches"}</span>
        <span>${totalSets > 0 ? `${p2Pct}% Win Rate` : "No recorded sets"}</span>
      </div>
    </div>
  `;
}

// Renders the Head-to-Head matchup list inside the Player Modal
function renderPlayerModalH2H(playerName, eraKey) {
  const sectionEl = document.getElementById("modal-h2h-section");
  const badgesEl = document.getElementById("modal-h2h-badges");
  const filterInput = document.getElementById("modal-h2h-filter");
  filterInput.value = "";
  currentModalPlayerName = playerName;

  const store = DATA_STORE[`H2H_${eraKey}`];
  if (!store) {
    // If H2H CSV hasn't finished downloading yet, fetch it and then render
    fetchH2HData(eraKey, false, () => {
      if (document.getElementById("player-modal").classList.contains("open") && currentModalPlayerName === playerName) {
        renderPlayerModalH2H(playerName, eraKey);
      }
    });
    return;
  }

  const playerMap = (store.recordsByPlayer || {})[playerName.toLowerCase()];
  if (!playerMap) {
    sectionEl.classList.add("hidden");
    return;
  }

  const matchups = Object.values(playerMap).sort((a, b) => b.total - a.total || b.wins - a.wins);
  if (matchups.length === 0) {
    sectionEl.classList.add("hidden");
    return;
  }

  currentModalPlayerMatchups = matchups;
  sectionEl.classList.remove("hidden");
  document.getElementById("player-modal-box").classList.add("has-chart");

  const mostPlayed = matchups[0];
  const nemesis = [...matchups].sort((a, b) => b.losses - a.losses)[0];

  let badgesHtml = "";
  if (mostPlayed && mostPlayed.total > 0) {
    badgesHtml += `<span class="chart-pill">🔥 Most Played: <strong>${escapeHTML(mostPlayed.opponent)}</strong> (${mostPlayed.wins}-${mostPlayed.losses})</span>`;
  }
  if (nemesis && nemesis.losses > 0) {
    badgesHtml += `<span class="chart-pill">💀 Nemesis: <strong>${escapeHTML(nemesis.opponent)}</strong> (${nemesis.wins}-${nemesis.losses})</span>`;
  }
  badgesEl.innerHTML = badgesHtml;

  filterModalH2HList();
}

function filterModalH2HList() {
  const listEl = document.getElementById("modal-h2h-list");
  const q = document.getElementById("modal-h2h-filter").value.toLowerCase().trim();

  const filtered = q
    ? currentModalPlayerMatchups.filter(m => m.opponent.toLowerCase().includes(q))
    : currentModalPlayerMatchups;

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="text-muted" style="font-size:12px; padding:8px 0">No matching opponents found.</div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map(m => {
      const scoreColor = m.wins > m.losses ? "var(--green)" : m.wins < m.losses ? "#fb7185" : "var(--text)";
      return `
        <div class="h2h-matchup-pill" data-opp="${escapeHTML(m.opponent)}" title="Click to open full VS comparison">
          <span class="font-bold text-white">vs ${escapeHTML(m.opponent)}</span>
          <span class="tekken-font font-bold" style="color:${scoreColor}">
            ${m.wins} – ${m.losses} <small class="text-muted">(${m.winRate}%)</small>
          </span>
        </div>
      `;
    })
    .join("");
}

function renderEloChart(history) {
  const svg = document.getElementById("elo-chart-svg");
  const tooltip = document.getElementById("chart-tooltip");
  tooltip.classList.add("hidden");

  const n = history.length;
  const minVal = Math.min(...history);
  const maxVal = Math.max(...history);
  const netDiff = history[n - 1] - history[0];

  document.getElementById("chart-peak-elo").innerText = `Peak: ${Math.round(maxVal * 10) / 10}`;
  const netEl = document.getElementById("chart-net-change");
  const sign = netDiff >= 0 ? "+" : "";
  netEl.innerText = `${sign}${Math.round(netDiff * 10) / 10} ELO`;
  netEl.style.color = netDiff >= 0 ? "var(--green)" : "#fb7185";

  const width = 430;
  const height = 230;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

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

  const ySteps = 4;
  for (let s = 0; s <= ySteps; s++) {
    const val = yMin + (s / ySteps) * ySpan;
    const y = getY(val).toFixed(1);
    svgHtml += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
      <text x="${padLeft - 7}" y="${Number(y) + 3}" text-anchor="end" class="chart-axis-label">${Math.round(val)}</text>
    `;
  }

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

  svgHtml += `
    <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" class="chart-axis-line" />
    <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" class="chart-axis-line" />
    <text x="${padLeft + plotW / 2}" y="${height - 4}" text-anchor="middle" class="chart-axis-title">Event Number</text>
    <text x="12" y="${padTop + plotH / 2}" text-anchor="middle" transform="rotate(-90 12 ${padTop + plotH / 2})" class="chart-axis-title">ELO</text>
  `;

  const coords = history.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`);
  if (n > 1) {
    const areaPoints = `${getX(0).toFixed(1)},${(padTop + plotH).toFixed(1)} ${coords.join(" ")} ${getX(n - 1).toFixed(1)},${(padTop + plotH).toFixed(1)}`;
    svgHtml += `<polygon points="${areaPoints}" fill="url(#eloAreaGrad)" />`;
    svgHtml += `<polyline points="${coords.join(" ")}" class="chart-line" />`;
  }

  const pointRadius = n > 20 ? 3 : 4;
  history.forEach((v, i) => {
    const cx = getX(i).toFixed(1);
    const cy = getY(v).toFixed(1);
    svgHtml += `<circle cx="${cx}" cy="${cy}" r="${pointRadius}" class="chart-point" data-event="${i + 1}" data-elo="${v}" />`;
  });

  svg.innerHTML = svgHtml;
}

function openPlayerModal(p) {
  const activeEra = currentTab === "T7" ? "T7" : "T8";
  trackEvent("View Player Card", { player: p.player, era: activeEra, country: p.country || "Unknown" });

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

  renderPlayerModalH2H(p.player, activeEra);
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

  // H2H Tab Era Switcher (T8 vs T7)
  document.querySelectorAll("[data-h2hera]").forEach(btn => {
    btn.addEventListener("click", () => {
      h2hActiveEra = btn.getAttribute("data-h2hera");
      document.querySelectorAll("[data-h2hera]").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-h2hera") === h2hActiveEra);
      });
      fetchTabData(h2hActiveEra, false, () => {
        fetchH2HData(h2hActiveEra, false, () => {
          populateH2HDropdowns();
          renderH2HComparison();
        });
      });
    });
  });

  // H2H Dropdown Selection & Swap Button
  document.getElementById("h2h-p1-select").addEventListener("change", () => {
    updatePlayer2OptionsForPlayer1();
    renderH2HComparison();
  });
  document.getElementById("h2h-p2-select").addEventListener("change", renderH2HComparison);

  document.getElementById("btn-h2h-swap").addEventListener("click", () => {
    const p1Select = document.getElementById("h2h-p1-select");
    const p2Select = document.getElementById("h2h-p2-select");
    const temp = p1Select.value;
    p1Select.value = p2Select.value;
    p2Select.value = temp;
    renderH2HComparison();
  });

  // Filter opponents inside Player Modal H2H list
  document.getElementById("modal-h2h-filter").addEventListener("input", filterModalH2HList);

  // Clicking an opponent pill inside the Player Modal jumps to the full H2H VS view
  document.getElementById("modal-h2h-list").addEventListener("click", event => {
    const pill = event.target.closest(".h2h-matchup-pill");
    if (!pill) return;
    const oppName = pill.getAttribute("data-opp");
    if (!oppName || !currentModalPlayerName) return;

    const targetEra = currentTab === "T7" ? "T7" : "T8";
    h2hActiveEra = targetEra;
    document.querySelectorAll("[data-h2hera]").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-h2hera") === h2hActiveEra);
    });

    document.getElementById("player-modal").classList.remove("open");
    switchTab("H2H");

    fetchH2HData(h2hActiveEra, false, () => {
      populateH2HDropdowns();
      document.getElementById("h2h-p1-select").value = currentModalPlayerName;
      document.getElementById("h2h-p2-select").value = oppName;
      renderH2HComparison();
    });
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

  // Preload leaderboards, tournaments, and H2H matrices
  fetchTabData("T8", false, () => {
    if (currentTab === "T8") renderCurrentView();
  });
  fetchTabData("T7");
  fetchTabData("TOURNAMENTS");
  fetchH2HData("T8");
  fetchH2HData("T7");
});

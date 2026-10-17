let currentPage = 1;
let currentTab = "T8";
let currentDisplayedList = [];
let currentDisplayedTournaments = [];

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

    let rankHtml = `<span class="tekken-font font-bold text-muted">#${p.rank}</span>`;
    if (p.rank === 1) rankHtml = `<span class="tekken-font rank-badge rank-1">🥇 #1</span>`;
    else if (p.rank === 2) rankHtml = `<span class="tekken-font rank-badge rank-2">🥈 #2</span>`;
    else if (p.rank === 3) rankHtml = `<span class="tekken-font rank-badge rank-3">🥉 #3</span>`;

    html += `
      <tr class="${isUnlocked ? "top50-row" : "locked-row"}" data-idx="${i}">
        <td class="text-center">${rankHtml}</td>
        <td>
          <div>
            <strong class="text-white">${p.player}</strong>
            ${p.country ? `<span class="country-tag">${p.country}</span>` : ""}
          </div>
          ${p.main ? `<div class="char-sub">${p.main}</div>` : ""}
        </td>
        <td class="hide-sm text-center">${p.wins}W / ${p.matches}M</td>
        <td class="hide-sm text-center font-bold text-green">${p.winRate}</td>
        <td class="tekken-font elo-cell">${p.elo}</td>
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

    html += `
      <div class="roadmap-item" data-tidx="${i}">
        <div class="roadmap-dot ${t.statusType}"></div>
        <div>
          <span class="t-status ${t.statusType}">${statusLabel}</span>
          <h3 class="tekken-font t-title">${t.name}</h3>
          <div class="t-meta">
            <span>📅 ${t.date}</span>
            <span>⏰ ${t.time}</span>
            <span>📍 ${t.location}</span>
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

function openPlayerModal(p) {
  document.getElementById("modal-rank").innerText = `#${p.rank}`;
  document.getElementById("modal-player").innerText = p.player;
  document.getElementById("modal-country").innerText = p.country ? `📍 ${p.country}` : "";

  document.getElementById("modal-main-detail").innerText = p.main || "Not specified";
  document.getElementById("modal-country-detail").innerText = p.country || "Not specified";

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
  if (t.link) {
    linkBtn.style.display = "block";
    linkBtn.href = t.link.startsWith("http") ? t.link : `https://${t.link}`;
  } else {
    linkBtn.style.display = "none";
  }

  document.getElementById("tournament-modal").classList.add("open");
}

// Initialize Event Listeners & Preload Data
document.addEventListener("DOMContentLoaded", () => {
  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
  });

  // Search & Refresh
  document.getElementById("search-input").addEventListener("input", () => {
    currentPage = 1;
    renderCurrentView();
  });
  document.getElementById("btn-refresh").addEventListener("click", forceRefresh);

  // Pagination
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

  // Preload all 3 tabs
  fetchTabData("T8", false, () => {
    if (currentTab === "T8") renderCurrentView();
  });
  fetchTabData("T7");
  fetchTabData("TOURNAMENTS");
});
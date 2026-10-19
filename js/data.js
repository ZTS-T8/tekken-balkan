const DATA_STORE = {
  T8: null,
  T7: null,
  TOURNAMENTS: null,
  H2H_T8: null,
  H2H_T7: null
};

function isValidCsvUrl(url) {
  return typeof url === "string" && url.length > 65 && url.includes("output=csv");
}

function getCol(row, possibleNames) {
  if (!row) return "";
  const rowKeys = Object.keys(row);
  for (let i = 0; i < possibleNames.length; i++) {
    const target = possibleNames[i].toLowerCase().trim();
    for (let j = 0; j < rowKeys.length; j++) {
      const cleanKey = rowKeys[j].replace(/[\r\n]+/g, "").trim().toLowerCase();
      if (cleanKey === target && row[rowKeys[j]] != null) {
        return String(row[rowKeys[j]]).replace(/[\r\n]+/g, "").trim();
      }
    }
  }
  return "";
}

function resolveCountryIso(rawCountry) {
  if (!rawCountry) return "";

  const normalized = rawCountry
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (CONFIG.COUNTRY_CODES[normalized]) {
    return CONFIG.COUNTRY_CODES[normalized];
  }

  if (/^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }

  const parts = normalized.split(/[\s,/-]+/).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    if (CONFIG.COUNTRY_CODES[parts[i]]) {
      return CONFIG.COUNTRY_CODES[parts[i]];
    }
  }

  for (const [key, iso] of Object.entries(CONFIG.COUNTRY_CODES)) {
    if (key.length > 3 && normalized.includes(key)) {
      return iso;
    }
  }

  return "";
}

function parsePlayerTrend(row, currentRank) {
  const rawTrend = getCol(row, ["Trend", "Change", "Rank Change", "Promjena"]);

  if (rawTrend) {
    const upper = rawTrend.toUpperCase();
    if (upper === "NEW" || upper === "NOVO") {
      return { type: "new", delta: 0, label: "NEW" };
    }
    const parsedDelta = parseInt(rawTrend.replace("+", ""), 10);
    if (!isNaN(parsedDelta)) {
      if (parsedDelta > 0) return { type: "up", delta: parsedDelta, label: `▲ ${parsedDelta}` };
      if (parsedDelta < 0) return { type: "down", delta: Math.abs(parsedDelta), label: `▼ ${Math.abs(parsedDelta)}` };
      return { type: "same", delta: 0, label: "—" };
    }
  }

  const prevRankRaw = getCol(row, ["Previous Rank", "Prev Rank", "Old Rank", "Prosli Rank"]);
  if (prevRankRaw) {
    const prevRank = parseInt(prevRankRaw, 10);
    if (!isNaN(prevRank) && prevRank > 0) {
      const diff = prevRank - currentRank;
      if (diff > 0) return { type: "up", delta: diff, label: `▲ ${diff}` };
      if (diff < 0) return { type: "down", delta: Math.abs(diff), label: `▼ ${Math.abs(diff)}` };
      return { type: "same", delta: 0, label: "—" };
    }
  }

  return null;
}

function parseEloHistory(row) {
  const rawHistory = getCol(row, ["Elo History", "ELO History", "Elo_History", "History"]);
  if (!rawHistory) return [];

  const matches = rawHistory.match(/-?\d+(\.\d+)?/g);
  if (!matches) return [];

  return matches
    .map(val => parseFloat(val))
    .filter(num => !isNaN(num) && isFinite(num));
}

function parseTournamentTier(row) {
  const rawTier = (getCol(row, ["Tier", "Rank", "Category", "Kategorija", "Class"]) || "B").toUpperCase();
  const cleaned = rawTier.replace(/TIER/g, "").replace(/[^A-Z]/g, "").trim();

  let tierKey = "B";
  if (
    cleaned === "S" ||
    rawTier.startsWith("S") ||
    rawTier.includes("MAJOR") ||
    rawTier.includes("PREMIER") ||
    rawTier.includes("MASTER")
  ) {
    tierKey = "S";
  } else if (
    cleaned === "A" ||
    rawTier.startsWith("A") ||
    rawTier.includes("REGIONAL") ||
    rawTier.includes("MONTHLY") ||
    rawTier.includes("CHALLENGER")
  ) {
    tierKey = "A";
  } else if (
    cleaned === "B" ||
    rawTier.startsWith("B") ||
    rawTier.includes("WEEKLY") ||
    rawTier.includes("COMMUNITY") ||
    rawTier.includes("LOCAL")
  ) {
    tierKey = "B";
  }

  const tierInfo = CONFIG.TOURNAMENT_TIERS[tierKey] || CONFIG.TOURNAMENT_TIERS.B;
  return {
    tierKey,
    tierLabel: tierInfo.label,
    tierClass: tierInfo.cssClass
  };
}

function normalizePlayerRows(rawRows) {
  const clean = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const player = getCol(r, ["Player", "Igrac", "Name", "Nick"]);
    if (!player) continue;

    const rankRaw = getCol(r, ["Ranking", "Rank", "#"]);
    const rankNum = parseInt(rankRaw || (clean.length + 1), 10);
    const finalRank = isNaN(rankNum) ? (clean.length + 1) : rankNum;

    const main = getCol(r, ["Main", "Character", "Lik", "Main Character"]);
    const country = getCol(r, ["Country", "Drzava", "Država", "Nation", "Region"]);
    const countryIso = resolveCountryIso(country);
    const trend = parsePlayerTrend(r, finalRank);
    const eloHistory = parseEloHistory(r);

    clean.push({
      rank: finalRank,
      player: player,
      elo: getCol(r, ["Elo", "ELO Rating", "Rating", "Points"]) || "0",
      matches: getCol(r, ["Total Matches", "Matches", "Mecevi"]) || "0",
      wins: getCol(r, ["Total Wins", "Wins", "Pobjede"]) || "0",
      winRate: getCol(r, ["Win Rate", "Winrate", "Win %", "WR"]) || "0%",
      main: main,
      country: country,
      countryIso: countryIso,
      trend: trend,
      eloHistory: eloHistory,
      searchKey: `${player} ${main} ${country}`.toLowerCase()
    });
  }
  return clean;
}

function normalizeTournamentRows(rawRows) {
  const clean = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const name = getCol(r, ["Tournament", "Turnir", "Naziv", "Name", "Event"]);
    if (!name) continue;

    const date = getCol(r, ["Date", "Datum"]) || "TBA";
    const time = getCol(r, ["Time", "Vrijeme", "Start Time"]) || "TBA";
    const location = getCol(r, ["Location", "Lokacija", "City", "Grad", "Venue"]) || "TBA";
    const link = getCol(r, ["Link", "StartGG", "Start.gg", "URL", "Registration"]);
    const statusRaw = getCol(r, ["Status", "State", "Stanje"]) || "Upcoming";
    const desc = getCol(r, ["Description", "Opis", "Info", "Details"]);

    let statusType = "upcoming";
    const sLower = statusRaw.toLowerCase();
    if (
      sLower.includes("comp") ||
      sLower.includes("zavr") ||
      sLower.includes("past") ||
      sLower.includes("done") ||
      sLower.includes("finish")
    ) {
      statusType = "completed";
    } else if (
      sLower.includes("live") ||
      sLower.includes("danas") ||
      sLower.includes("u tijeku") ||
      sLower.includes("ongoing")
    ) {
      statusType = "live";
    }

    const tierData = parseTournamentTier(r);

    clean.push({
      name,
      date,
      time,
      location,
      link,
      statusRaw,
      statusType,
      desc,
      tierKey: tierData.tierKey,
      tierLabel: tierData.tierLabel,
      tierClass: tierData.tierClass,
      searchKey: `${name} ${location} ${date} ${tierData.tierLabel}`.toLowerCase()
    });
  }
  return clean;
}

// Helper: Parses "6-1", or recovers Google Sheets auto-formatted dates like "4-Jan" / "Jan-4"
function parseScoreCell(cellStr) {
  if (!cellStr || cellStr === "-" || cellStr === "—" || cellStr === "–") return null;

  const stdMatch = cellStr.match(/^(\d+)\s*[-–:/]\s*(\d+)$/);
  if (stdMatch) {
    return [parseInt(stdMatch[1], 10), parseInt(stdMatch[2], 10)];
  }

  const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const m1 = cellStr.toLowerCase().match(/^(\d+)\s*[-/.\s]\s*([a-z]{3})/);
  if (m1 && months[m1[2]]) {
    return [parseInt(m1[1], 10), months[m1[2]]];
  }
  const m2 = cellStr.toLowerCase().match(/^([a-z]{3})\s*[-/.\s]\s*(\d+)/);
  if (m2 && months[m2[1]]) {
    return [months[m2[1]], parseInt(m2[2], 10)];
  }

  return null;
}

// Parses a 2D Row-vs-Column H2H Matrix ("6-1", "-", or "—")
function parseH2HMatrix(matrixRows) {
  const recordsByPlayer = {};
  const playerNamesMap = {};

  if (!matrixRows || matrixRows.length < 2) {
    return { recordsByPlayer, players: [] };
  }

  // Find the header row (first row with at least 2 non-empty player names)
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(matrixRows.length, 5); r++) {
    const nonEmptyCount = (matrixRows[r] || []).filter(c => String(c || "").trim() !== "").length;
    if (nonEmptyCount >= 2) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = matrixRows[headerRowIdx];
  const colPlayers = [];
  for (let c = 1; c < headerRow.length; c++) {
    const colName = String(headerRow[c] || "").replace(/[\r\n]+/g, "").trim();
    colPlayers[c] = colName;
    if (colName) {
      playerNamesMap[colName.toLowerCase()] = colName;
    }
  }

  const addRecord = (p1, p2, w, l) => {
    const k1 = p1.toLowerCase();
    const k2 = p2.toLowerCase();
    if (k1 === k2) return;

    if (!recordsByPlayer[k1]) recordsByPlayer[k1] = {};
    if (!recordsByPlayer[k1][k2]) {
      recordsByPlayer[k1][k2] = {
        opponent: playerNamesMap[k2] || p2,
        wins: w,
        losses: l,
        total: w + l,
        winRate: w + l > 0 ? Math.round((w / (w + l)) * 100) : 0
      };
    }
  };

  for (let r = headerRowIdx + 1; r < matrixRows.length; r++) {
    const row = matrixRows[r];
    if (!row || row.length === 0) continue;

    const rowPlayer = String(row[0] || "").replace(/[\r\n]+/g, "").trim();
    if (!rowPlayer) continue;
    playerNamesMap[rowPlayer.toLowerCase()] = rowPlayer;

    for (let c = 1; c < row.length; c++) {
      const colPlayer = colPlayers[c];
      if (!colPlayer) continue;

      const cell = String(row[c] || "").replace(/[\r\n]+/g, "").trim();
      const parsed = parseScoreCell(cell);
      if (!parsed) continue;

      const [rowWins, colWins] = parsed;
      if (isNaN(rowWins) || isNaN(colWins) || (rowWins === 0 && colWins === 0)) continue;

      addRecord(rowPlayer, colPlayer, rowWins, colWins);
      addRecord(colPlayer, rowPlayer, colWins, rowWins);
    }
  }

  return {
    recordsByPlayer,
    players: Object.values(playerNamesMap).sort((a, b) => a.localeCompare(b))
  };
}

function fetchH2HData(eraKey, force = false, onComplete) {
  const storeKey = `H2H_${eraKey}`;
  if (DATA_STORE[storeKey] && !force) {
    if (onComplete) onComplete(DATA_STORE[storeKey]);
    return;
  }

  const baseUrl = CONFIG.SHEET_URLS[storeKey];
  if (!isValidCsvUrl(baseUrl)) {
    DATA_STORE[storeKey] = { recordsByPlayer: {}, players: [] };
    if (onComplete) onComplete(DATA_STORE[storeKey]);
    return;
  }

  const fetchUrl = force ? `${baseUrl}&_cb=${Date.now()}` : baseUrl;

  Papa.parse(fetchUrl, {
    download: true,
    header: false,
    skipEmptyLines: false, // Prevents PapaParse from dropping or shifting cells in 2D matrices
    complete: function (results) {
      DATA_STORE[storeKey] = parseH2HMatrix(results.data || []);
      if (onComplete) onComplete(DATA_STORE[storeKey]);
    },
    error: function () {
      DATA_STORE[storeKey] = { recordsByPlayer: {}, players: [] };
      if (onComplete) onComplete(DATA_STORE[storeKey]);
    }
  });
}

function fetchTabData(tabKey, force = false, onComplete) {
  if (DATA_STORE[tabKey] && !force) {
    if (onComplete) onComplete(DATA_STORE[tabKey]);
    return;
  }

  const baseUrl = CONFIG.SHEET_URLS[tabKey];
  if (!isValidCsvUrl(baseUrl)) {
    DATA_STORE[tabKey] = [];
    if (onComplete) onComplete(DATA_STORE[tabKey]);
    return;
  }

  const fetchUrl = force ? `${baseUrl}&_cb=${Date.now()}` : baseUrl;

  Papa.parse(fetchUrl, {
    download: true,
    header: true,
    skipEmptyLines: "greedy",
    complete: function (results) {
      const raw = results.data || [];
      DATA_STORE[tabKey] =
        tabKey === "TOURNAMENTS"
          ? normalizeTournamentRows(raw)
          : normalizePlayerRows(raw);
      if (onComplete) onComplete(DATA_STORE[tabKey]);
    },
    error: function () {
      DATA_STORE[tabKey] = [];
      if (onComplete) onComplete(DATA_STORE[tabKey]);
    }
  });
}

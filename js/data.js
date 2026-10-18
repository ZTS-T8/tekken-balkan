const DATA_STORE = {
  T8: null,
  T7: null,
  TOURNAMENTS: null
};

function isValidCsvUrl(url) {
  return typeof url === "string" && url.length > 65 && url.includes("output=csv");
}

// Helper: Reads a column from a CSV row regardless of spaces, \r, or capitalization
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

// Helper: Resolves country text (even with diacritics or slashes) to a 2-letter ISO code
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

// Helper: Parses "[1500, 1520.6, 1540.0, ...]" into an array of numbers
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

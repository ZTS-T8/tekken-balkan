const DATA_STORE = {
  T8: null,
  T7: null,
  TOURNAMENTS: null,
  REGIONS: null
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

function stripDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveCountryIso(rawCountry) {
  if (!rawCountry) return "";
  const normalized = stripDiacritics(rawCountry);

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

function resolveSubRegionId(rawCountry, rawRegion) {
  const cIso = resolveCountryIso(rawCountry);
  const rNorm = stripDiacritics(rawRegion);

  // Single-region countries: Slovenia & Montenegro
  if (cIso === "si" || rNorm.includes("sloven")) {
    return "SI-ALL";
  }
  if (cIso === "me" || rNorm.includes("montenegro") || rNorm.includes("crna gora")) {
    return "ME-ALL";
  }

  // Match within the specified country first
  if (cIso) {
    const countryGroup = CONFIG.REGIONS_CONFIG.find(c => c.countryCode === cIso);
    if (countryGroup) {
      for (const sub of countryGroup.subRegions) {
        if (sub.id.toLowerCase() === rNorm) return sub.id;
        if (sub.keywords.some(k => rNorm.includes(k))) return sub.id;
      }
      return countryGroup.subRegions[0].id;
    }
  }

  // Fallback: Match by region keywords across all 5 countries if Country column was left empty
  for (const countryGroup of CONFIG.REGIONS_CONFIG) {
    for (const sub of countryGroup.subRegions) {
      if (sub.id.toLowerCase() === rNorm) return sub.id;
      if (sub.keywords.some(k => rNorm.includes(k))) return sub.id;
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

function parseTournamentTier(row) {
  const rawTier = (getCol(row, ["Tier", "Rank", "Category", "Kategorija", "Class"]) || "B").toUpperCase();
  const customWeight = getCol(row, ["Multiplier", "Weight", "Points", "Bodovi", "ELO Weight"]);
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
  }

  const tierInfo = CONFIG.TOURNAMENT_TIERS[tierKey] || CONFIG.TOURNAMENT_TIERS.B;
  return {
    tierKey,
    tierLabel: tierInfo.label,
    tierClass: tierInfo.cssClass,
    tierMultiplier: customWeight || tierInfo.multiplier
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
      tierMultiplier: tierData.tierMultiplier,
      searchKey: `${name} ${location} ${date} ${tierData.tierLabel}`.toLowerCase()
    });
  }
  return clean;
}

function normalizeRegionRows(rawRows) {
  const clean = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const player = getCol(r, ["Player", "Igrac", "Name", "Nick"]);
    if (!player) continue;

    const rawCountry = getCol(r, ["Country", "Drzava", "Država"]);
    const rawRegion = getCol(r, ["Region", "Regija", "Subregion", "Area", "City", "Grad"]);
    const regionId = resolveSubRegionId(rawCountry, rawRegion);
    if (!regionId) continue;

    clean.push({
      player,
      regionId,
      rawRegion
    });
  }
  return clean;
}

// Links players from Sheet 4 (REGIONS) with their live stats in T8 and T7
function getLinkedRegionalPlayers(activeEra = "T8") {
  const t8Map = new Map();
  const t7Map = new Map();

  (DATA_STORE.T8 || []).forEach(p => t8Map.set(p.player.toLowerCase(), p));
  (DATA_STORE.T7 || []).forEach(p => t7Map.set(p.player.toLowerCase(), p));

  let regionEntries = DATA_STORE.REGIONS || [];

  // Fallback preview: If 4th sheet URL isn't configured yet, auto-distribute existing players with countries
  if (regionEntries.length === 0) {
    const sourceList = DATA_STORE[activeEra] || DATA_STORE.T8 || [];
    sourceList.forEach((p, idx) => {
      if (p.countryIso === "si") {
        regionEntries.push({ player: p.player, regionId: "SI-ALL" });
      } else if (p.countryIso === "me") {
        regionEntries.push({ player: p.player, regionId: "ME-ALL" });
      } else if (p.countryIso === "hr") {
        const zones = ["HR-ZG", "HR-SL", "HR-CO"];
        regionEntries.push({ player: p.player, regionId: zones[idx % 3] });
      } else if (p.countryIso === "ba") {
        const zones = ["BA-NO", "BA-CE", "BA-SO"];
        regionEntries.push({ player: p.player, regionId: zones[idx % 3] });
      } else if (p.countryIso === "rs") {
        const zones = ["RS-VO", "RS-BG", "RS-WE", "RS-EA", "RS-SO"];
        regionEntries.push({ player: p.player, regionId: zones[idx % 5] });
      }
    });
  }

  const linked = [];
  for (let i = 0; i < regionEntries.length; i++) {
    const entry = regionEntries[i];
    const key = entry.player.toLowerCase();
    const pT8 = t8Map.get(key) || null;
    const pT7 = t7Map.get(key) || null;
    const activeProfile = activeEra === "T7" ? pT7 : pT8;
    const fallbackProfile = pT8 || pT7;

    const countryCode = entry.regionId.split("-")[0].toLowerCase();

    linked.push({
      player: entry.player,
      regionId: entry.regionId,
      countryIso: countryCode,
      country: (fallbackProfile && fallbackProfile.country) || countryCode.toUpperCase(),
      activeStats: activeProfile,
      t8Stats: pT8,
      t7Stats: pT7,
      eloNum: activeProfile ? parseFloat(activeProfile.elo) || 0 : 0,
      main: (activeProfile && activeProfile.main) || (fallbackProfile && fallbackProfile.main) || ""
    });
  }

  linked.sort((a, b) => b.eloNum - a.eloNum);
  return linked;
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
      if (tabKey === "TOURNAMENTS") {
        DATA_STORE[tabKey] = normalizeTournamentRows(raw);
      } else if (tabKey === "REGIONS") {
        DATA_STORE[tabKey] = normalizeRegionRows(raw);
      } else {
        DATA_STORE[tabKey] = normalizePlayerRows(raw);
      }
      if (onComplete) onComplete(DATA_STORE[tabKey]);
    },
    error: function () {
      DATA_STORE[tabKey] = [];
      if (onComplete) onComplete(DATA_STORE[tabKey]);
    }
  });
}

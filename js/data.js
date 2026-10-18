const DATA_STORE = {
  T8: null,
  T7: null,
  TOURNAMENTS: null
};

function isValidCsvUrl(url) {
  return typeof url === "string" && url.length > 65 && url.includes("output=csv");
}

function resolveCountryIso(rawCountry) {
  if (!rawCountry) return "";
  const key = rawCountry.trim().toLowerCase();
  if (CONFIG.COUNTRY_CODES[key]) return CONFIG.COUNTRY_CODES[key];
  if (/^[a-z]{2}$/.test(key)) return key;
  return "";
}

function parsePlayerTrend(row, currentRank) {
  const rawTrend = (
    row["Trend"] ||
    row["Change"] ||
    row["Rank Change"] ||
    row["Promjena"] ||
    ""
  ).trim();

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

  // Fallback: Automatically calculate if a "Previous Rank" column exists
  const prevRankRaw = (row["Previous Rank"] || row["Prev Rank"] || row["Old Rank"] || "").trim();
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
  const rawTier = (row["Tier"] || row["Rank"] || row["Category"] || row["Kategorija"] || "B").trim().toUpperCase();
  const customWeight = (row["Multiplier"] || row["Weight"] || row["Points"] || row["Bodovi"] || "").trim();

  let tierKey = "B";
  if (rawTier.startsWith("S") || rawTier.includes("MAJOR") || rawTier.includes("PREMIER")) {
    tierKey = "S";
  } else if (rawTier.startsWith("A") || rawTier.includes("REGIONAL") || rawTier.includes("MONTHLY")) {
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
    const player = (r["Player"] || "").trim();
    if (!player) continue;

    const rankNum = parseInt(r["Ranking"] || r["Rank"] || (clean.length + 1), 10);
    const finalRank = isNaN(rankNum) ? (clean.length + 1) : rankNum;
    const main = (r["Main"] || "").trim();
    const country = (r["Country"] || r["Drzava"] || "").trim();
    const countryIso = resolveCountryIso(country);
    const trend = parsePlayerTrend(r, finalRank);

    clean.push({
      rank: finalRank,
      player: player,
      elo: (r["Elo"] || "0").trim(),
      matches: (r["Total Matches"] || "0").trim(),
      wins: (r["Total Wins"] || "0").trim(),
      winRate: (r["Win Rate"] || "0%").trim(),
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
    const name = (r["Tournament"] || r["Turnir"] || r["Naziv"] || r["Name"] || "").trim();
    if (!name) continue;

    const date = (r["Date"] || r["Datum"] || "TBA").trim();
    const time = (r["Time"] || r["Vrijeme"] || "TBA").trim();
    const location = (r["Location"] || r["Lokacija"] || "TBA").trim();
    const link = (r["Link"] || r["StartGG"] || r["Start.gg"] || r["URL"] || "").trim();
    const statusRaw = (r["Status"] || "Upcoming").trim();
    const desc = (r["Description"] || r["Opis"] || r["Info"] || "").trim();

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

function fetchTabData(tabKey, force = false, onComplete) {
  if (DATA_STORE[tabKey] && !force) {
    if (onComplete) onComplete(DATA_STORE[tabKey]);
    return;
  }

  const url = CONFIG.SHEET_URLS[tabKey];
  if (!isValidCsvUrl(url)) {
    DATA_STORE[tabKey] = [];
    if (onComplete) onComplete(DATA_STORE[tabKey]);
    return;
  }

  Papa.parse(url, {
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

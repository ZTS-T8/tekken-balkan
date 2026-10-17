const DATA_STORE = {
  T8: null,
  T7: null,
  TOURNAMENTS: null
};

function isValidCsvUrl(url) {
  return typeof url === "string" && url.length > 65 && url.includes("output=csv");
}

function normalizePlayerRows(rawRows) {
  const clean = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const player = (r["Player"] || "").trim();
    if (!player) continue;

    const rank = parseInt(r["Ranking"] || r["Rank"] || (clean.length + 1), 10);
    const main = (r["Main"] || "").trim();
    const country = (r["Country"] || r["Drzava"] || "").trim();

    clean.push({
      rank: isNaN(rank) ? (clean.length + 1) : rank,
      player: player,
      elo: (r["Elo"] || "0").trim(),
      matches: (r["Total Matches"] || "0").trim(),
      wins: (r["Total Wins"] || "0").trim(),
      winRate: (r["Win Rate"] || "0%").trim(),
      main: main,
      country: country,
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

    clean.push({
      name,
      date,
      time,
      location,
      link,
      statusRaw,
      statusType,
      desc,
      searchKey: `${name} ${location} ${date}`.toLowerCase()
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
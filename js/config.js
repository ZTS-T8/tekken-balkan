const CONFIG = {
  PAGE_SIZE: 50,
  UNLOCKED_LIMIT: 50,

  SHEET_URLS: {
    T8: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=1897594659&single=true&output=csv",
    T7: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=1230236970&single=true&output=csv",
    TOURNAMENTS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=975571095&single=true&output=csv"
  },

  // Maps common country inputs in Google Sheets to ISO 2-letter flag codes
  COUNTRY_CODES: {
    hr: "hr", croatia: "hr", hrvatska: "hr", cro: "hr",
    rs: "rs", serbia: "rs", srbija: "rs", srb: "rs",
    ba: "ba", bosnia: "ba", bih: "ba", "bosnia and herzegovina": "ba",
    si: "si", slovenia: "si", slovenija: "si", slo: "si",
    mk: "mk", macedonia: "mk", "north macedonia": "mk", makedonija: "mk", mkd: "mk",
    me: "me", montenegro: "me", "crna gora": "me", mne: "me",
    al: "al", albania: "al", alb: "al",
    xk: "xk", kosovo: "xk", kos: "xk",
    bg: "bg", bulgaria: "bg", bul: "bg",
    ro: "ro", romania: "ro", rou: "ro",
    gr: "gr", greece: "gr", gre: "gr",
    hu: "hu", hungary: "hu", hun: "hu",
    at: "at", austria: "at", aut: "at",
    de: "de", germany: "de", ger: "de",
    it: "it", italy: "it", ita: "it",
    tr: "tr", turkey: "tr", tur: "tr",
    eu: "eu", europe: "eu"
  },

  // Tournament Tier Classification & Points Weighting
  TOURNAMENT_TIERS: {
    S: {
      label: "🏆 S-Tier Major",
      multiplier: "2.0× ELO",
      cssClass: "tier-s"
    },
    A: {
      label: "⚔️ A-Tier Regional",
      multiplier: "1.5× ELO",
      cssClass: "tier-a"
    },
    B: {
      label: "🎮 B-Tier Community",
      multiplier: "1.0× ELO",
      cssClass: "tier-b"
    }
  },

  TAB_META: {
    T8: {
      badge: "Current Season",
      subtitle: 'Official Tekken Balkan community leaderboard. Click on any <strong class="text-white">Top 50</strong> player for detailed stats.',
      searchPlaceholder: "Search player...",
      bodyClass: ""
    },
    T7: {
      badge: "Hall of Fame Archive",
      subtitle: 'Final all-time standings from the Tekken 7 era. Click on any <strong class="text-white">Top 50</strong> player for detailed stats.',
      searchPlaceholder: "Search player...",
      bodyClass: "era-t7"
    },
    TOURNAMENTS: {
      badge: "Calendar & Roadmap",
      subtitle: 'Overview of upcoming and completed community tournaments. Click on any event for tier weighting, schedule, and <strong class="text-white">Start.gg registration</strong>.',
      searchPlaceholder: "Search tournament, tier, or city...",
      bodyClass: "era-tournaments"
    }
  }
};

const CONFIG = {
  PAGE_SIZE: 50,
  UNLOCKED_LIMIT: 50,

  SHEET_URLS: {
    T8: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=1897594659&single=true&output=csv",
    T7: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=1230236970&single=true&output=csv",
    TOURNAMENTS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=975571095&single=true&output=csv"
  },

  // Maps country names/codes to 2-letter ISO codes for flagcdn.com
  COUNTRY_CODES: {
    hr: "hr", cro: "hr", croatia: "hr", hrvatska: "hr",
    rs: "rs", srb: "rs", serbia: "rs", srbija: "rs",
    ba: "ba", bih: "ba", bosnia: "ba", "bosna i hercegovina": "ba", "bosnia and herzegovina": "ba", "bosnia & herzegovina": "ba",
    si: "si", slo: "si", svn: "si", slovenia: "si", slovenija: "si",
    mk: "mk", mkd: "mk", macedonia: "mk", "north macedonia": "mk", makedonija: "mk", "severna makedonija": "mk", "sjeverna makedonija": "mk",
    me: "me", mne: "me", montenegro: "me", "crna gora": "me",
    al: "al", alb: "al", albania: "al", albanija: "al", shqiperia: "al",
    xk: "xk", kos: "xk", rks: "xk", kosovo: "xk",
    bg: "bg", bul: "bg", bgr: "bg", bulgaria: "bg", bugarska: "bg",
    ro: "ro", rou: "ro", rom: "ro", romania: "ro", rumunija: "ro", rumunjska: "ro",
    gr: "gr", gre: "gr", grc: "gr", greece: "gr", grcka: "gr",
    hu: "hu", hun: "hu", hungary: "hu", madarska: "hu", madjarska: "hu",
    at: "at", aut: "at", austria: "at", austrija: "at",
    de: "de", ger: "de", deu: "de", germany: "de", njemacka: "de", nemacka: "de",
    it: "it", ita: "it", italy: "it", italija: "it",
    tr: "tr", tur: "tr", turkey: "tr", turkiye: "tr", turska: "tr",
    gb: "gb", uk: "gb", eng: "gb", "united kingdom": "gb", england: "gb",
    fr: "fr", fra: "fr", france: "fr",
    es: "es", esp: "es", spain: "es",
    pl: "pl", pol: "pl", poland: "pl",
    se: "se", swe: "se", sweden: "se",
    no: "no", nor: "no", norway: "no",
    ch: "ch", sui: "ch", switzerland: "ch",
    nl: "nl", ned: "nl", netherlands: "nl",
    us: "us", usa: "us",
    eu: "eu", europe: "eu"
  },

  // Tournament Tier Classification & Points Weighting
  TOURNAMENT_TIERS: {
    S: {
      label: "🏆 Major",
      //multiplier: "2.0× ELO",
      cssClass: "tier-s"
    },
    A: {
      label: "⚔️ Regional",
      //multiplier: "1.5× ELO",
      cssClass: "tier-a"
    },
    B: {
      label: "🎮 Local",
      //multiplier: "1.0× ELO",
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

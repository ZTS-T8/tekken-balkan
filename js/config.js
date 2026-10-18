const CONFIG = {
  PAGE_SIZE: 50,
  UNLOCKED_LIMIT: 50,

  SHEET_URLS: {
    T8: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=1897594659&single=true&output=csv",
    T7: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=1230236970&single=true&output=csv",
    TOURNAMENTS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=975571095&single=true&output=csv",
    REGIONS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=985306843&single=true&output=csv" 
  },

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

  // 4 Countries & 10 Sub-Regions Configuration
  REGIONS_CONFIG: [
    {
      countryCode: "hr",
      countryName: "Croatia",
      subRegions: [
        { id: "HR-ZG", name: "Zagreb & Central", keywords: ["zagreb", "central", "sredisnja", "sjever", "north", "varazdin", "karlovac"] },
        { id: "HR-SL", name: "Slavonia", keywords: ["slavonia", "slavonija", "osijek", "brod", "vukovar", "vinkovci", "east", "istok"] },
        { id: "HR-CO", name: "Coastal (Dalmatia & Istria)", keywords: ["coastal", "obala", "dalmatia", "dalmacija", "istria", "istra", "primorje", "split", "rijeka", "zadar", "sibenik", "dubrovnik", "pula", "south", "jug"] }
      ]
    },
    {
      countryCode: "si",
      countryName: "Slovenia",
      subRegions: [
        { id: "SI-ALL", name: "Slovenia", keywords: ["slovenia", "slovenija", "ljubljana", "maribor", "celje", "koper", "kranj", "all"] }
      ]
    },
    {
      countryCode: "ba",
      countryName: "Bosnia & Herzegovina",
      subRegions: [
        { id: "BA-NO", name: "North (Krajina & Tuzla)", keywords: ["north", "sjever", "krajina", "banja luka", "tuzla", "posavina", "bihac", "bijeljina", "doboj", "brcko"] },
        { id: "BA-CE", name: "Central (Sarajevo)", keywords: ["central", "srednja", "sarajevo", "zenica", "travnik", "visoko"] },
        { id: "BA-SO", name: "South (Herzegovina)", keywords: ["south", "jug", "herzegovina", "hercegovina", "mostar", "trebinje", "capljina"] }
      ]
    },
    {
      countryCode: "rs",
      countryName: "Serbia",
      subRegions: [
        { id: "RS-VO", name: "Vojvodina (North)", keywords: ["vojvodina", "north", "sever", "sjever", "novi sad", "subotica", "zrenjanin", "pancevo", "sombor"] },
        { id: "RS-BG", name: "Belgrade & Central", keywords: ["belgrade", "beograd", "central", "sumadija", "kragujevac", "valjevo", "cacak", "kraljevo"] },
        { id: "RS-SO", name: "Southern Serbia", keywords: ["south", "jug", "juzna", "southern", "nis", "leskovac", "vranje", "pirot", "krusevac"] }
      ]
    }
  ],

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
    },
    REGIONS: {
      badge: "Regional Distribution",
      subtitle: 'Interactive breakdown of players across <strong class="text-white">Croatia, Slovenia, Bosnia & Herzegovina, and Serbia</strong> linked to Tekken 8 & Tekken 7 stats.',
      searchPlaceholder: "Search player or region...",
      bodyClass: "era-regions"
    }
  }
};

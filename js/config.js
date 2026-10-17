const CONFIG = {
  PAGE_SIZE: 50,
  UNLOCKED_LIMIT: 50,

  SHEET_URLS: {
    T8: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=1897594659&single=true&output=csv",
    T7: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=1230236970&single=true&output=csv",
    TOURNAMENTS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT1Ny7bDXAZCYd_x433zEHdBiFk4VoMAWRLuXBrGZIn3D8-8QNSrwD7W-JD8a1jeA/pub?gid=975571095&single=true&output=csv"
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
      subtitle: 'Overview of upcoming and completed community tournaments. Click on any event for location, schedule, and <strong class="text-white">Start.gg registration</strong>.',
      searchPlaceholder: "Search tournament or city...",
      bodyClass: "era-tournaments"
    }
  }
};
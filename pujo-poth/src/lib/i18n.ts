import type { Lang } from "./types";

type Dict = {
  searchPH: string; nearest: string; min: string; pandals: string;
  plannerCTA: string; plannerTitle: string; startTime: string; duration: string;
  wrapUp: string; openFullTrip: string; findTitle: string; queue: string;
  byCar: string; openTill: string; routeCTA: string; seeOutlet: string;
  theStop: string; tableWait: string; minutes: string; crowdNow: string;
  peopleOrder: string; handingOver: string; kmBiryani: string; distance: string;
  drive: string; openMaps: string; cancel: string; groupTitle: string;
  groupSub: string; shareDot: string; shareSub: string; tonight: string;
  homeTitle: string; countLine: string; openMap: string;
  crowd: readonly [string, string, string, string, string];
  zones: Record<string, string>;
  tabs: { map: string; plan: string; find: string; crew: string };
};
export const TXT: { en: Dict; bn: Dict } = {
  en: {
    searchPH: "Search pandals or themes…",
    nearest: "Nearest Arsalan",
    min: "min",
    pandals: "pandals",
    plannerCTA: "Plan tonight",
    plannerTitle: "Plan tonight",
    startTime: "Start",
    duration: "For",
    wrapUp: "Ends at",
    openFullTrip: "Open full trip in Maps",
    findTitle: "Find pandals",
    queue: "Queue",
    byCar: "by car",
    openTill: "Open till 2 AM",
    routeCTA: "Route via Arsalan",
    seeOutlet: "See outlet & menu",
    theStop: "The Stop",
    tableWait: "Table wait",
    minutes: "minutes",
    crowdNow: "Right now",
    peopleOrder: "People order",
    handingOver: "Handing you off",
    kmBiryani: "KM to biryani",
    distance: "Distance",
    drive: "Drive",
    openMaps: "Open in Google Maps",
    cancel: "Back",
    groupTitle: "Your crew",
    groupSub: "See where friends are, share where you are.",
    shareDot: "Share my dot",
    shareSub: "Friends see your live location.",
    tonight: "Tonight",
    homeTitle: "Kolkata Pujo, plotted.",
    countLine: "Live crowd from your friends and the app.",
    openMap: "Open map",
    crowd: ["Empty", "Chill", "Busy", "Packed", "Insane"],
    zones: { north: "North", south: "South", behala: "Behala" },
    tabs: { map: "Map", plan: "Plan", find: "Find", crew: "Crew" },
  },
  bn: {
    searchPH: "প্যান্ডেল বা থিম খুঁজুন…",
    nearest: "নিকটতম আরসালান",
    min: "মিনিট",
    pandals: "প্যান্ডেল",
    plannerCTA: "আজ রাত পরিকল্পনা",
    plannerTitle: "আজ রাত",
    startTime: "শুরু",
    duration: "সময়",
    wrapUp: "শেষ",
    openFullTrip: "পুরো রুট Maps-এ খুলুন",
    findTitle: "প্যান্ডেল খুঁজুন",
    queue: "লাইন",
    byCar: "গাড়িতে",
    openTill: "রাত ২টা পর্যন্ত",
    routeCTA: "আরসালান হয়ে যান",
    seeOutlet: "মেনু দেখুন",
    theStop: "থামা",
    tableWait: "টেবিল অপেক্ষা",
    minutes: "মিনিট",
    crowdNow: "এখন",
    peopleOrder: "লোকে অর্ডার করে",
    handingOver: "হ্যান্ডঅফ",
    kmBiryani: "কিমি বিরিয়ানির দূরত্ব",
    distance: "দূরত্ব",
    drive: "ড্রাইভ",
    openMaps: "Google Maps খুলুন",
    cancel: "ফিরে যান",
    groupTitle: "বন্ধুরা",
    groupSub: "বন্ধুরা কোথায় দেখুন, নিজের জায়গা শেয়ার করুন।",
    shareDot: "আমার ডট শেয়ার",
    shareSub: "বন্ধুরা আপনার লাইভ অবস্থান দেখবে।",
    tonight: "আজ রাত",
    homeTitle: "কলকাতা পুজো, ম্যাপে।",
    countLine: "লাইভ ভিড় বন্ধুদের ও অ্যাপ থেকে।",
    openMap: "ম্যাপ খুলুন",
    crowd: ["ফাঁকা", "শান্ত", "ব্যস্ত", "ভীড়", "উন্মাদ"],
    zones: { north: "উত্তর", south: "দক্ষিণ", behala: "বেহালা" },
    tabs: { map: "ম্যাপ", plan: "প্ল্যান", find: "খুঁজুন", crew: "বন্ধু" },
  },
};

export type Strings = Dict;
export const t = (lang: Lang): Strings => TXT[lang];

import starterPackData from "../../../packs/chinese/pack.json";

export interface ChinesePhraseItem {
  id: string;
  english: string;
  pinyin: string;
  category: "banter" | "dining" | "plans" | "opinions" | "clarifications" | "partings";
  colloquialNote?: string;
  targetContour: number[]; // Array of Chao levels (1.0 - 5.0) sampled at 50ms intervals
  audioRefs?: {
    female?: string;
    male?: string;
  };
}

const VALID_CATEGORIES = new Set([
  "banter",
  "dining",
  "plans",
  "opinions",
  "clarifications",
  "partings",
]);

export function validateChinesePack(items: ChinesePhraseItem[] | unknown): boolean {
  let itemList: unknown;

  if (Array.isArray(items)) {
    itemList = items;
  } else if (items && typeof items === "object" && "items" in items && Array.isArray((items as any).items)) {
    itemList = (items as any).items;
  } else {
    return false;
  }

  const list = itemList as unknown[];
  if (list.length === 0) {
    return false;
  }

  const seenIds = new Set<string>();

  for (const item of list) {
    if (!item || typeof item !== "object") {
      return false;
    }

    const phrase = item as Partial<ChinesePhraseItem>;

    if (typeof phrase.id !== "string" || phrase.id.trim().length === 0) {
      return false;
    }
    if (seenIds.has(phrase.id)) {
      return false;
    }
    seenIds.add(phrase.id);

    if (typeof phrase.english !== "string" || phrase.english.trim().length === 0) {
      return false;
    }

    if (typeof phrase.pinyin !== "string" || phrase.pinyin.trim().length === 0) {
      return false;
    }

    if (!phrase.category || !VALID_CATEGORIES.has(phrase.category)) {
      return false;
    }

    if (!Array.isArray(phrase.targetContour) || phrase.targetContour.length === 0) {
      return false;
    }

    for (const pt of phrase.targetContour) {
      if (typeof pt !== "number" || !Number.isFinite(pt) || pt < 1.0 || pt > 5.0) {
        return false;
      }
    }

    if (phrase.colloquialNote !== undefined && typeof phrase.colloquialNote !== "string") {
      return false;
    }

    if (phrase.audioRefs !== undefined) {
      if (typeof phrase.audioRefs !== "object" || phrase.audioRefs === null) {
        return false;
      }
      if (
        phrase.audioRefs.female !== undefined &&
        typeof phrase.audioRefs.female !== "string"
      ) {
        return false;
      }
      if (
        phrase.audioRefs.male !== undefined &&
        typeof phrase.audioRefs.male !== "string"
      ) {
        return false;
      }
    }
  }

  return true;
}

export function getChineseStarterPack(): ChinesePhraseItem[] {
  if (Array.isArray(starterPackData)) {
    return starterPackData as ChinesePhraseItem[];
  }
  if (
    starterPackData &&
    typeof starterPackData === "object" &&
    Array.isArray((starterPackData as any).items)
  ) {
    return (starterPackData as any).items as ChinesePhraseItem[];
  }
  return [];
}

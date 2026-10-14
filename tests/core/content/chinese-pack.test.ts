import { describe, it, expect } from "vitest";
import {
  getChineseStarterPack,
  validateChinesePack,
  type ChinesePhraseItem,
} from "@/core/content/chinese-pack";

describe("Chinese Starter Pack Content & Schema", () => {
  it("loads at least 25 high-yield conversational phrases", () => {
    const pack = getChineseStarterPack();
    expect(pack.length).toBeGreaterThanOrEqual(25);
  });

  it("ensures all items have valid Pinyin, English, and target pitch contours", () => {
    const pack = getChineseStarterPack();
    expect(validateChinesePack(pack)).toBe(true);
    for (const item of pack) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.english.length).toBeGreaterThan(0);
      expect(item.pinyin.length).toBeGreaterThan(0);
      expect(item.targetContour.length).toBeGreaterThan(0);
      for (const pt of item.targetContour) {
        expect(pt).toBeGreaterThanOrEqual(1.0);
        expect(pt).toBeLessThanOrEqual(5.0);
      }
    }
  });

  it("covers all 6 required categories", () => {
    const pack = getChineseStarterPack();
    const categories = new Set(pack.map((item) => item.category));
    const requiredCategories = [
      "banter",
      "dining",
      "plans",
      "opinions",
      "clarifications",
      "partings",
    ];
    for (const cat of requiredCategories) {
      expect(categories.has(cat as any)).toBe(true);
    }
  });

  it("has unique IDs for every item", () => {
    const pack = getChineseStarterPack();
    const ids = new Set<string>();
    for (const item of pack) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
  });

  it("validates valid custom phrase items", () => {
    const sample: ChinesePhraseItem[] = [
      {
        id: "test-1",
        english: "Hello",
        pinyin: "Nǐ hǎo",
        category: "banter",
        targetContour: [2.0, 1.5, 3.5, 4.0],
      },
    ];
    expect(validateChinesePack(sample)).toBe(true);
  });

  it("rejects invalid items (missing fields, bad category, invalid contour, duplicates)", () => {
    expect(validateChinesePack([] as any)).toBe(false);
    expect(validateChinesePack(null as any)).toBe(false);
    expect(validateChinesePack("invalid" as any)).toBe(false);

    // Missing id
    expect(
      validateChinesePack([
        {
          id: "",
          english: "Hi",
          pinyin: "Nǐ hǎo",
          category: "banter",
          targetContour: [3.0],
        } as any,
      ])
    ).toBe(false);

    // Invalid category
    expect(
      validateChinesePack([
        {
          id: "item-bad-cat",
          english: "Hi",
          pinyin: "Nǐ hǎo",
          category: "unknown-cat" as any,
          targetContour: [3.0],
        },
      ])
    ).toBe(false);

    // Contour out of Chao range (below 1.0 or above 5.0)
    expect(
      validateChinesePack([
        {
          id: "item-low",
          english: "Hi",
          pinyin: "Nǐ hǎo",
          category: "banter",
          targetContour: [0.5],
        },
      ])
    ).toBe(false);

    expect(
      validateChinesePack([
        {
          id: "item-high",
          english: "Hi",
          pinyin: "Nǐ hǎo",
          category: "banter",
          targetContour: [5.5],
        },
      ])
    ).toBe(false);

    // Duplicate IDs
    expect(
      validateChinesePack([
        {
          id: "dup",
          english: "Hi",
          pinyin: "Nǐ hǎo",
          category: "banter",
          targetContour: [3.0],
        },
        {
          id: "dup",
          english: "Bye",
          pinyin: "Zàijiàn",
          category: "partings",
          targetContour: [5.0, 1.0],
        },
      ])
    ).toBe(false);
  });
});

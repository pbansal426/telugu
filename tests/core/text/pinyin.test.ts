import { describe, it, expect } from "vitest";
import { parsePinyinText, applyToneSandhi, getToneColor, PinyinSyllable } from "@/core/text/pinyin";

describe("Pinyin Parser & Tone Sandhi Engine", () => {
  it("correctly identifies base tones from diacritics", () => {
    const words = parsePinyinText("mā má mǎ mà ma");
    expect(words).toHaveLength(5);
    expect(words[0].syllables[0].baseTone).toBe(1);
    expect(words[1].syllables[0].baseTone).toBe(2);
    expect(words[2].syllables[0].baseTone).toBe(3);
    expect(words[3].syllables[0].baseTone).toBe(4);
    expect(words[4].syllables[0].baseTone).toBe(0);
  });

  it("identifies tones on ü and uppercase vowels", () => {
    const words = parsePinyinText("lǘ nǚ lǜ Ā É Ǒ Ù");
    expect(words).toHaveLength(7);
    expect(words[0].syllables[0].baseTone).toBe(2);
    expect(words[1].syllables[0].baseTone).toBe(3);
    expect(words[2].syllables[0].baseTone).toBe(4);
    expect(words[3].syllables[0].baseTone).toBe(1);
    expect(words[4].syllables[0].baseTone).toBe(2);
    expect(words[5].syllables[0].baseTone).toBe(3);
    expect(words[6].syllables[0].baseTone).toBe(4);
  });

  it("applies 3rd + 3rd tone sandhi (3+3 -> 2+3)", () => {
    const words = parsePinyinText("Nǐ hǎo");
    const syllables = words.flatMap(w => w.syllables);
    expect(syllables[0].baseTone).toBe(3);
    expect(syllables[0].surfaceTone).toBe(2);
    expect(syllables[0].hasSandhi).toBe(true);
    expect(syllables[0].color).toBe("#34D399"); // Tone 2 color
    expect(syllables[1].surfaceTone).toBe(3);
    expect(syllables[1].hasSandhi).toBe(false);
    expect(syllables[1].color).toBe("#FBBF24"); // Tone 3 color
  });

  it("applies Bù tone sandhi (bù before 4th tone -> 2nd tone)", () => {
    const words = parsePinyinText("bù shì");
    const syllables = words.flatMap(w => w.syllables);
    expect(syllables[0].baseTone).toBe(4);
    expect(syllables[0].surfaceTone).toBe(2);
    expect(syllables[0].hasSandhi).toBe(true);
    expect(syllables[0].color).toBe("#34D399"); // Tone 2 color
    expect(syllables[1].surfaceTone).toBe(4);
    expect(syllables[1].hasSandhi).toBe(false);
  });

  it("preserves Bù tone before 1st, 2nd, and 3rd tones", () => {
    const words1 = parsePinyinText("bù gāo");
    expect(words1[0].syllables[0].surfaceTone).toBe(4);
    expect(words1[0].syllables[0].hasSandhi).toBe(false);

    const words2 = parsePinyinText("bù lái");
    expect(words2[0].syllables[0].surfaceTone).toBe(4);
    expect(words2[0].syllables[0].hasSandhi).toBe(false);

    const words3 = parsePinyinText("bù hǎo");
    expect(words3[0].syllables[0].surfaceTone).toBe(4);
    expect(words3[0].syllables[0].hasSandhi).toBe(false);
  });

  it("returns correct tone colors", () => {
    expect(getToneColor(1)).toBe("#F87171");
    expect(getToneColor(2)).toBe("#34D399");
    expect(getToneColor(3)).toBe("#FBBF24");
    expect(getToneColor(4)).toBe("#60A5FA");
    expect(getToneColor(0)).toBe("#94A3B8");
  });

  it("handles empty or whitespace-only strings gracefully", () => {
    expect(parsePinyinText("")).toEqual([]);
    expect(parsePinyinText("   ")).toEqual([]);
  });

  it("applies Yī tone sandhi (yī before 4th tone -> 2nd tone, before 1/2/3 -> 4th tone)", () => {
    // yī before 4th tone -> 2nd tone
    const words1 = parsePinyinText("yī dìng");
    expect(words1[0].syllables[0].baseTone).toBe(1);
    expect(words1[0].syllables[0].surfaceTone).toBe(2);
    expect(words1[0].syllables[0].hasSandhi).toBe(true);
    expect(words1[0].syllables[0].color).toBe("#34D399"); // Tone 2
    expect(words1[1].syllables[0].surfaceTone).toBe(4);

    const words2 = parsePinyinText("yī yàng");
    expect(words2[0].syllables[0].surfaceTone).toBe(2);
    expect(words2[0].syllables[0].hasSandhi).toBe(true);

    // yī before 1st tone -> 4th tone
    const words3 = parsePinyinText("yī tiān");
    expect(words3[0].syllables[0].baseTone).toBe(1);
    expect(words3[0].syllables[0].surfaceTone).toBe(4);
    expect(words3[0].syllables[0].hasSandhi).toBe(true);
    expect(words3[0].syllables[0].color).toBe("#60A5FA"); // Tone 4
    expect(words3[1].syllables[0].surfaceTone).toBe(1);

    // yī before 2nd tone -> 4th tone
    const words4 = parsePinyinText("yī nián");
    expect(words4[0].syllables[0].surfaceTone).toBe(4);
    expect(words4[0].syllables[0].hasSandhi).toBe(true);
    expect(words4[0].syllables[0].color).toBe("#60A5FA"); // Tone 4

    // yī before 3rd tone -> 4th tone
    const words5 = parsePinyinText("yī qǐ");
    expect(words5[0].syllables[0].surfaceTone).toBe(4);
    expect(words5[0].syllables[0].hasSandhi).toBe(true);
    expect(words5[0].syllables[0].color).toBe("#60A5FA"); // Tone 4
  });

  it("preserves Yī base tone 1 when isolated or at phrase end", () => {
    const single = parsePinyinText("yī");
    expect(single[0].syllables[0].baseTone).toBe(1);
    expect(single[0].syllables[0].surfaceTone).toBe(1);
    expect(single[0].syllables[0].hasSandhi).toBe(false);

    const endOfPhrase = parsePinyinText("dì yī");
    expect(endOfPhrase[1].syllables[0].baseTone).toBe(1);
    expect(endOfPhrase[1].syllables[0].surfaceTone).toBe(1);
    expect(endOfPhrase[1].syllables[0].hasSandhi).toBe(false);
  });

  it("does not apply tone sandhi across punctuation boundaries", () => {
    const words1 = parsePinyinText("Nǐ, hǎo");
    expect(words1[0].syllables[0].surfaceTone).toBe(3);
    expect(words1[0].syllables[0].hasSandhi).toBe(false);

    const words2 = parsePinyinText("bù, shì");
    expect(words2[0].syllables[0].surfaceTone).toBe(4);
    expect(words2[0].syllables[0].hasSandhi).toBe(false);

    const words3 = parsePinyinText("yī, èr, sān");
    expect(words3[0].syllables[0].surfaceTone).toBe(1);
    expect(words3[0].syllables[0].hasSandhi).toBe(false);
  });

  it("applyToneSandhi functions as a pure function without mutating input", () => {
    const input: PinyinSyllable[] = [
      { raw: "nǐ", clean: "ni", baseTone: 3, surfaceTone: 3, hasSandhi: false, color: "#FBBF24" },
      { raw: "hǎo", clean: "hao", baseTone: 3, surfaceTone: 3, hasSandhi: false, color: "#FBBF24" },
    ];
    const result = applyToneSandhi(input);
    expect(result[0].surfaceTone).toBe(2);
    expect(result[0].hasSandhi).toBe(true);
    // Original input should not be mutated
    expect(input[0].surfaceTone).toBe(3);
    expect(input[0].hasSandhi).toBe(false);
  });
});

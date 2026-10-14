export type ToneNumber = 0 | 1 | 2 | 3 | 4;

export interface PinyinSyllable {
  raw: string;          // e.g. "nǐ"
  clean: string;        // e.g. "ni"
  baseTone: ToneNumber; // e.g. 3
  surfaceTone: ToneNumber; // e.g. 2 (after sandhi)
  hasSandhi: boolean;   // true if surfaceTone !== baseTone
  color: string;        // Hex color for surfaceTone
}

export interface PinyinWord {
  text: string;
  syllables: PinyinSyllable[];
}

const TONE_COLORS: Record<ToneNumber, string> = {
  1: "#F87171",
  2: "#34D399",
  3: "#FBBF24",
  4: "#60A5FA",
  0: "#94A3B8",
};

export function getToneColor(tone: ToneNumber): string {
  return TONE_COLORS[tone] || TONE_COLORS[0];
}

const DIACRITIC_MAP: Record<string, { base: string; tone: ToneNumber }> = {
  'ā': { base: 'a', tone: 1 }, 'á': { base: 'a', tone: 2 }, 'ǎ': { base: 'a', tone: 3 }, 'à': { base: 'a', tone: 4 },
  'ē': { base: 'e', tone: 1 }, 'é': { base: 'e', tone: 2 }, 'ě': { base: 'e', tone: 3 }, 'è': { base: 'e', tone: 4 },
  'ī': { base: 'i', tone: 1 }, 'í': { base: 'i', tone: 2 }, 'ǐ': { base: 'i', tone: 3 }, 'ì': { base: 'i', tone: 4 },
  'ō': { base: 'o', tone: 1 }, 'ó': { base: 'o', tone: 2 }, 'ǒ': { base: 'o', tone: 3 }, 'ò': { base: 'o', tone: 4 },
  'ū': { base: 'u', tone: 1 }, 'ú': { base: 'u', tone: 2 }, 'ǔ': { base: 'u', tone: 3 }, 'ù': { base: 'u', tone: 4 },
  'ǖ': { base: 'ü', tone: 1 }, 'ǘ': { base: 'ü', tone: 2 }, 'ǚ': { base: 'ü', tone: 3 }, 'ǜ': { base: 'ü', tone: 4 },
  'Ā': { base: 'A', tone: 1 }, 'Á': { base: 'A', tone: 2 }, 'Ǎ': { base: 'A', tone: 3 }, 'À': { base: 'A', tone: 4 },
  'Ē': { base: 'E', tone: 1 }, 'É': { base: 'E', tone: 2 }, 'Ě': { base: 'E', tone: 3 }, 'È': { base: 'E', tone: 4 },
  'Ī': { base: 'I', tone: 1 }, 'Í': { base: 'I', tone: 2 }, 'Ǐ': { base: 'I', tone: 3 }, 'Ì': { base: 'I', tone: 4 },
  'Ō': { base: 'O', tone: 1 }, 'Ó': { base: 'O', tone: 2 }, 'Ǒ': { base: 'O', tone: 3 }, 'Ò': { base: 'O', tone: 4 },
  'Ū': { base: 'U', tone: 1 }, 'Ú': { base: 'U', tone: 2 }, 'Ǔ': { base: 'U', tone: 3 }, 'Ù': { base: 'U', tone: 4 },
  'Ǖ': { base: 'Ü', tone: 1 }, 'Ǘ': { base: 'Ü', tone: 2 }, 'Ǚ': { base: 'Ü', tone: 3 }, 'Ǜ': { base: 'Ü', tone: 4 },
};

function extractSyllable(token: string): { clean: string; baseTone: ToneNumber } {
  const normalized = token.normalize('NFC');
  let baseTone: ToneNumber = 0;
  let clean = "";

  for (const char of normalized) {
    if (DIACRITIC_MAP[char]) {
      baseTone = DIACRITIC_MAP[char].tone;
      clean += DIACRITIC_MAP[char].base;
    } else {
      clean += char;
    }
  }

  return { clean, baseTone };
}

export function applyToneSandhi(syllables: PinyinSyllable[]): PinyinSyllable[] {
  const result: PinyinSyllable[] = syllables.map(s => ({ ...s }));

  for (let i = 0; i < result.length; i++) {
    const current = result[i];
    const next = result[i + 1];

    if (!next) continue;

    // Do not apply tone sandhi across punctuation boundaries (e.g. "Nǐ, hǎo" or "yī, èr")
    if (/[.,!?;:，。！？；：]$/.test(current.raw.trim())) {
      continue;
    }

    // 1. 3rd tone + 3rd tone -> 2nd tone + 3rd tone
    if (current.baseTone === 3 && next.baseTone === 3) {
      current.surfaceTone = 2;
      current.hasSandhi = true;
      current.color = getToneColor(2);
    }

    const lowerClean = current.clean.toLowerCase().replace(/[^a-zü]/g, "");

    // 2. Bù sandhi: bù (4) + 4th tone -> bú (2)
    if (lowerClean === "bu" && current.baseTone === 4 && next.baseTone === 4) {
      current.surfaceTone = 2;
      current.hasSandhi = true;
      current.color = getToneColor(2);
    }

    // 3. Yī sandhi:
    // yī (1) + 4th tone -> yí (2) (e.g. yídìng, yíyàng)
    // yī (1) + 1st/2nd/3rd tone -> yì (4) (e.g. yìtiān, yìnián, yìqǐ)
    if (lowerClean === "yi" && current.baseTone === 1) {
      if (next.baseTone === 4 || next.surfaceTone === 4) {
        current.surfaceTone = 2;
        current.hasSandhi = true;
        current.color = getToneColor(2);
      } else if ([1, 2, 3].includes(next.baseTone)) {
        current.surfaceTone = 4;
        current.hasSandhi = true;
        current.color = getToneColor(4);
      }
    }
  }

  return result;
}

export function parsePinyinText(text: string): PinyinWord[] {
  if (!text || !text.trim()) {
    return [];
  }

  const words = text.trim().split(/\s+/);
  const rawSyllables: PinyinSyllable[] = words.map(word => {
    const { clean, baseTone } = extractSyllable(word);
    return {
      raw: word,
      clean,
      baseTone,
      surfaceTone: baseTone,
      hasSandhi: false,
      color: getToneColor(baseTone),
    };
  });

  const sandhiSyllables = applyToneSandhi(rawSyllables);

  return sandhiSyllables.map(syllable => ({
    text: syllable.raw,
    syllables: [syllable],
  }));
}

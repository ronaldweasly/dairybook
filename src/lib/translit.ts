// Offline rules-based phonetic transliterator for English <-> Hindi names

const ENGLISH_TO_HINDI_SPECIALS: Record<string, string> = {
  singh: "सिंह",
  sharma: "शर्मा",
  verma: "वर्मा",
  choudhary: "चौधरी",
  chaudhary: "चौधरी",
  prasad: "प्रसाद",
  mishra: "मिश्रा",
  yadav: "यादव",
  krishna: "कृष्णा",
  gupta: "गुप्ता",
  kumar: "कुमार",
  devi: "देवी",
  singhal: "सिंघल",
  shukla: "शुक्ला",
  pandey: "पांडेय",
  tiwari: "तिवारी",
  dwivedi: "द्विवेदी",
  trivedi: "त्रिवेदी",
  chatterjee: "चटर्जी",
  mukherjee: "मुखर्जी",
  banerjee: "बनर्जी",
  joshi: "जोशी",
  mehta: "मेहता",
  shah: "शाह",
  patel: "पटेल",
  rathore: "राठौर",
  shekhawat: "शेखवत",
  singhania: "सिंघानिया",
  reddy: "रेड्डी",
  naidu: "नायडू",
  gowda: "गौड़ा",
  hegde: "हेगड़े",
  rao: "राव",
};

const HINDI_TO_ENGLISH_SPECIALS: Record<string, string> = Object.fromEntries(
  Object.entries(ENGLISH_TO_HINDI_SPECIALS).map(([k, v]) => [v, k.charAt(0).toUpperCase() + k.slice(1)])
);

// English consonant blends mapping
const ENG_CONSONANTS: [string, string][] = [
  ["ksh", "क्ष"],
  ["chh", "छ"],
  ["ggy", "ज्ञ"],
  ["gy", "ज्ञ"],
  ["tr", "त्र"],
  ["sh", "श"],
  ["ch", "च"],
  ["kh", "ख"],
  ["gh", "घ"],
  ["jh", "झ"],
  ["th", "थ"],
  ["dh", "ध"],
  ["bh", "भ"],
  ["ph", "फ"],
  ["b", "ब"],
  ["c", "क"],
  ["d", "द"],
  ["f", "फ़"],
  ["g", "ग"],
  ["h", "ह"],
  ["j", "ज"],
  ["k", "क"],
  ["l", "ल"],
  ["m", "म"],
  ["n", "न"],
  ["p", "प"],
  ["r", "र"],
  ["s", "स"],
  ["t", "त"],
  ["v", "व"],
  ["w", "व"],
  ["y", "य"],
  ["z", "ज़"],
];

const ENG_VOWELS: [string, string][] = [
  ["aaa", "ा"],
  ["aa", "ा"],
  ["ai", "ै"],
  ["au", "ौ"],
  ["ee", "ी"],
  ["oo", "ू"],
  ["a", "ा"],
  ["e", "े"],
  ["i", "ि"],
  ["o", "ो"],
  ["u", "ु"],
];

const ENG_INDEP_VOWELS: Record<string, string> = {
  a: "अ",
  aa: "आ",
  i: "इ",
  ee: "ई",
  u: "उ",
  oo: "ऊ",
  e: "ए",
  ai: "ऐ",
  o: "ओ",
  au: "औ",
};

// Transliterate single English word to Hindi
function wordEngToHin(word: string): string {
  const clean = word.toLowerCase().trim();
  if (ENGLISH_TO_HINDI_SPECIALS[clean]) {
    return ENGLISH_TO_HINDI_SPECIALS[clean];
  }

  let result = "";
  let i = 0;
  
  while (i < clean.length) {
    // 1. Check if we are at the start of the word and it's a vowel
    if (i === 0) {
      let foundVowel = false;
      for (const [vKey, vVal] of Object.entries(ENG_INDEP_VOWELS)) {
        if (clean.startsWith(vKey)) {
          result += vVal;
          i += vKey.length;
          foundVowel = true;
          break;
        }
      }
      if (foundVowel) continue;
    }

    // 2. Check for consonant blends or single consonants
    let foundConsonant = false;
    for (const [cKey, cVal] of ENG_CONSONANTS) {
      if (clean.slice(i).startsWith(cKey)) {
        result += cVal;
        i += cKey.length;
        foundConsonant = true;

        // Check if next characters represent a vowel
        let foundMatra = false;
        for (const [vKey, vVal] of ENG_VOWELS) {
          if (clean.slice(i).startsWith(vKey)) {
            // For simple "a", if it's not the end of the word and not followed by a vowel, it is often just the implicit vowel (no matra needed)
            if (vKey === "a") {
              // Special case: if "a" is at the end of the word, it's usually "ा" (e.g. Gupta, Verma)
              if (i + vKey.length === clean.length) {
                result += vVal;
              }
              // Otherwise, it represents the implicit 'a' (no matra, just move cursor)
            } else {
              result += vVal;
            }
            i += vKey.length;
            foundMatra = true;
            break;
          }
        }

        // If no vowel follows this consonant, and it's not the end of the word, add a halant (्) to make it half
        if (!foundMatra && i < clean.length) {
          // Special case: if the consonant is followed by r, it often forms a conjunct (e.g. prasad -> प्रसाद, no halant after p)
          const nextChar = clean.charAt(i);
          if (nextChar !== 'r' && nextChar !== 'y') {
            result += "्";
          }
        }

        break;
      }
    }

    if (foundConsonant) continue;

    // Fallback: copy char if unmatched
    result += clean.charAt(i);
    i++;
  }

  // Final cleanup of duplicate halants or misplaced symbols
  return result
    .replace(/््/g, "्")
    .replace(/्ा/g, "ा")
    .replace(/्ि/g, "ि")
    .replace(/्े/g, "े")
    .replace(/्ो/g, "ो")
    .replace(/्ु/g, "ु");
}

// Transliterate single Hindi word to English
const HIN_CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "क्ष": "ksh", "त्र": "tr", "ज्ञ": "gy", "श्र": "shr"
};

const HIN_VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au"
};

const HIN_MATRAS: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "n"
};

function wordHinToEng(word: string): string {
  if (HINDI_TO_ENGLISH_SPECIALS[word]) {
    return HINDI_TO_ENGLISH_SPECIALS[word];
  }

  let result = "";
  let i = 0;

  while (i < word.length) {
    const char = word.charAt(i);
    const nextChar = word.charAt(i + 1);

    // 1. Check independent vowel
    if (HIN_VOWELS[char]) {
      result += HIN_VOWELS[char];
      i++;
      continue;
    }

    // 2. Check consonant
    if (HIN_CONSONANTS[char]) {
      result += HIN_CONSONANTS[char];
      i++;

      // Check what follows the consonant
      if (i < word.length) {
        const follower = word.charAt(i);
        if (HIN_MATRAS[follower]) {
          result += HIN_MATRAS[follower];
          i++;
        } else if (follower === "्") {
          // Halant means half character, do not add implicit "a"
          i++;
        } else {
          // No matra and no halant, add implicit "a" unless it's the end of the word
          if (i < word.length) {
            result += "a";
          }
        }
      } else {
        // End of word, no implicit "a"
      }
      continue;
    }

    // Fallback: keep char
    result += char;
    i++;
  }

  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// Public API
export function transliterateEngToHin(text: string): string {
  if (!text) return "";
  return text
    .split(/\s+/)
    .map(wordEngToHin)
    .join(" ");
}

export function transliterateHinToEng(text: string): string {
  if (!text) return "";
  return text
    .split(/\s+/)
    .map(wordHinToEng)
    .join(" ");
}

// Format Name to store both: "English Name | Hindi Name"
export function formatNameCombined(engName: string, hinName: string): string {
  return `${engName.trim()} | ${hinName.trim()}`;
}

// Split Name depending on locale
export function getLocalizedName(combinedName: string, locale: string): string {
  if (!combinedName) return "";
  if (!combinedName.includes("|")) {
    // If no pipe, auto-detect script and translate if needed
    const hasDevanagari = /[\u0900-\u097F]/.test(combinedName);
    if (locale === "hi") {
      return hasDevanagari ? combinedName.trim() : transliterateEngToHin(combinedName);
    } else {
      return hasDevanagari ? transliterateHinToEng(combinedName) : combinedName.trim();
    }
  }
  
  const parts = combinedName.split("|");
  if (locale === "hi") {
    return parts[1] ? parts[1].trim() : parts[0].trim();
  }
  return parts[0].trim();
}

// Split Name to separate English and Hindi components
export function splitName(combinedName: string): { engName: string; hinName: string } {
  if (!combinedName) return { engName: "", hinName: "" };
  if (combinedName.includes("|")) {
    const parts = combinedName.split("|");
    return {
      engName: parts[0] ? parts[0].trim() : "",
      hinName: parts[1] ? parts[1].trim() : "",
    };
  }
  
  const hasDevanagari = /[\u0900-\u097F]/.test(combinedName);
  if (hasDevanagari) {
    return {
      engName: transliterateHinToEng(combinedName),
      hinName: combinedName.trim(),
    };
  } else {
    return {
      engName: combinedName.trim(),
      hinName: transliterateEngToHin(combinedName),
    };
  }
}

import type { Language, ViewState } from '../../types';
import type { FieldPatch, Intent } from './types';

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  बीस: 20, तीस: 30, चालीस: 40, पचास: 50, साठ: 60,
};

const CROPS: Array<{ re: RegExp; name: string }> = [
  { re: /wheat|गेहूं|गेहूँ|gehun|gehu/i, name: 'wheat' },
  { re: /rice|चावल|धान|chawal|dhan/i, name: 'rice' },
  { re: /corn|maize|मक्का|makka|makki/i, name: 'corn' },
  { re: /cotton|कपास|kapas/i, name: 'cotton' },
  { re: /barley|जौ/i, name: 'barley' },
];

const DESTINATIONS: Array<{ view: ViewState; phrases: string[] }> = [
  { view: 'disease', phrases: ['disease detection', 'crop disease', 'leaf analysis', 'रोग पहचान', 'पत्ती', 'रोग'] },
  { view: 'soil', phrases: ['soil analysis', 'crop recommendation', 'recommend a crop', 'recommend crop', 'मिट्टी विश्लेषण', 'फसल सिफारिश', 'मिट्टी'] },
  { view: 'irrigation', phrases: ['irrigation schedule', 'irrigation', 'सिंचाई'] },
  { view: 'market', phrases: ['market analysis', 'market prices', 'market price', 'बाजार मूल्य', 'market', 'बाजार'] },
  { view: 'alerts', phrases: ['weather alerts', 'weather alert', 'मौसम चेतावनी', 'मौसम अलर्ट'] },
  { view: 'calendar', phrases: ['crop calendar', 'फसल कैलेंडर', 'calendar', 'कैलेंडर'] },
  { view: 'fertilizer', phrases: ['fertilizer recommendation', 'fertilizer guide', 'fertilizer', 'fertiliser', 'उर्वरक', 'खाद'] },
  { view: 'locations', phrases: ['multi-farm', 'multi farm', 'farm manager', 'locations', 'कई खेत'] },
  { view: 'yield', phrases: ['yield prediction', 'yield', 'पैदावार'] },
  { view: 'dashboard', phrases: ['dashboard', 'डैशबोर्ड', 'home'] },
  { view: 'settings', phrases: ['settings', 'सेटिंग'] },
  { view: 'video', phrases: ['video analysis', 'video', 'वीडियो'] },
  { view: 'chat', phrases: ['ai chat', 'chat assistant', 'chat', 'चैट'] },
  { view: 'voice', phrases: ['talk page', 'बात करें'] },
];

const NAV_LEAD = /^(?:please\s+)?(?:go to|open|take me to|navigate to|switch to|back to|go back to|show me the|show me)\b/i;
const STRONG_ACTION = /\b(analy[sz]e|calculate|fetch|generate|predict|diagnos\w*|prices?|requirement)\b|कीमत|विश्लेषण|गणना|भविष्यवाणी/i;
const STOP = /^(?:please\s+)?(?:stop(?:\s+speaking|\s+listening)?|cancel|रुको|रुकिए|चुप|बस)\s*[.!?]?$/i;
const READ = /\b(read(?:\s+my|\s+the|\s+latest)?\s+results?|read (?:this|that) aloud|latest results)\b|परिणाम पढ़|नतीजे/i;
const EXPLAIN = /\b(how (?:does|do) this (?:page |feature )?(?:work|works)|explain how|what can i (?:do|say) here|how do i use this)\b|यह कैसे|कैसे काम/i;
const SWITCH_HI = /(?:switch to hindi|speak hindi|hindi mein bolo|हिंदी में|हिन्दी में)/i;
const SWITCH_EN = /(?:switch to english|speak english|english mein bolo|अंग्रेजी में)/i;

function numberFrom(token: string): number | null {
  const cleaned = token.trim().toLowerCase();
  if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) return Number(cleaned);
  return NUMBER_WORDS[cleaned] ?? null;
}

function mentions(text: string, phrase: string): boolean {
  if (/[\u0900-\u097F]/.test(phrase)) return text.toLowerCase().includes(phrase.toLowerCase());
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, 'i').test(text);
}

function findDestination(text: string): { view: ViewState; phrase: string } | null {
  let best: { view: ViewState; phrase: string } | null = null;
  for (const destination of DESTINATIONS) {
    for (const phrase of destination.phrases) {
      if (!mentions(text, phrase)) continue;
      if (!best || phrase.length > best.phrase.length) best = { view: destination.view, phrase };
    }
  }
  return best;
}

function grab(text: string, pattern: RegExp): number | undefined {
  const match = pattern.exec(text);
  if (!match) return undefined;
  const value = numberFrom(match[1]);
  return value === null ? undefined : value;
}

const TOKEN = '(-?\\d+(?:\\.\\d+)?|[a-zA-Z\\u0900-\\u097F]+)';
const GAP = '(?:\\s+(?:level|is|of|at|are|है))*\\s*[:=]?\\s*';

export function extractPatch(text: string): FieldPatch {
  const patch: FieldPatch = {};
  const pH = grab(text, new RegExp(`(?:\\bph\\b|पीएच)${GAP}(-?\\d+(?:\\.\\d+)?)`, 'i'));
  const nitrogen = grab(text, new RegExp(`(?:nitrogen|नाइट्रोजन)${GAP}${TOKEN}`, 'i'));
  const phosphorus = grab(text, new RegExp(`(?:phosphorus|फॉस्फोरस|फॉस्फोरस)${GAP}${TOKEN}`, 'i'));
  const potassium = grab(text, new RegExp(`(?:potassium|पोटेशियम)${GAP}${TOKEN}`, 'i'));
  const organicMatter = grab(text, /(?:organic matter|जैविक पदार्थ)(?:\s+(?:is|of|at|level|percent|%|है))*\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  const area = grab(text, /(?:\barea\b|क्षेत्रफल)(?:\s+(?:is|of|at))*\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  const rainfallDays = grab(text, /(?:rainfall(?:\s+days)?|rainy days|वर्षा)(?:\s+(?:is|of|are|days|के दिन))*\s*[:=]?\s*(\d+)/i)
    ?? grab(text, /(\d+)\s*(?:rainfall days|rainy days)/i);
  const temperature = grab(text, /(?:temperature|temp|तापमान)(?:\s+(?:is|of|at))*\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i);

  if (pH !== undefined) patch.pH = pH;
  if (nitrogen !== undefined) patch.nitrogen = nitrogen;
  if (phosphorus !== undefined) patch.phosphorus = phosphorus;
  if (potassium !== undefined) patch.potassium = potassium;
  if (organicMatter !== undefined) patch.organicMatter = organicMatter;
  if (area !== undefined) patch.area = area;
  if (rainfallDays !== undefined) patch.rainfallDays = rainfallDays;
  if (temperature !== undefined) patch.temperature = temperature;

  const known = CROPS.find((crop) => crop.re.test(text));
  const named = /(?:\bcrop\b|फसल)(?:\s+type)?\s*(?:is|:|=)\s*([a-zA-Z\u0900-\u097F]{2,})/i.exec(text);
  if (known) patch.crop = known.name;
  else if (named) patch.crop = named[1].toLowerCase();

  const regionNamed = /(?:\bregion\b|\bstate\b|क्षेत्र)\s*(?:is|:|=)?\s*([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F ]{1,30})/i.exec(text);
  const regionKnown = /\b(punjab|haryana|maharashtra|bihar|rajasthan|gujarat|karnataka|tamil nadu|uttar pradesh|madhya pradesh|west bengal)\b/i.exec(text);
  if (regionNamed) patch.region = regionNamed[1].trim();
  else if (regionKnown) patch.region = regionKnown[1];

  const place = /(?:location name|farm name|named)\s*(?:is|:|=)?\s*([a-zA-Z][a-zA-Z0-9 ]{1,32})/i.exec(text);
  if (place) patch.locationName = place[1].trim();

  const url = /https?:\/\/\S+/i.exec(text);
  if (url) patch.url = url[0].replace(/[.,)]$/, '');

  if (/nitrogen deficiency|low nitrogen|नाइट्रोजन की कमी/i.test(text)) patch.concern = 'nitrogen deficiency';
  return patch;
}

function hasPatch(patch: FieldPatch): boolean {
  return Object.values(patch).some((value) => value !== undefined && value !== '');
}

function wantsExecute(text: string): boolean {
  if (STRONG_ACTION.test(text)) return true;
  if (NAV_LEAD.test(text)) return false;
  return /\brecommend\b|सिफारिश|जोड़ो|\badd (?:it|this|the )?(?:location|farm)\b/i.test(text);
}

export function interpret(text: string): Intent {
  const raw = text.trim();
  if (!raw) return { kind: 'chat' };
  if (STOP.test(raw)) return { kind: 'stop' };
  if (SWITCH_HI.test(raw) && !SWITCH_EN.test(raw)) return { kind: 'language', language: 'hi-IN' };
  if (SWITCH_EN.test(raw) && !SWITCH_HI.test(raw)) return { kind: 'language', language: 'en-US' };

  const destination = findDestination(raw);
  const patch = extractPatch(raw);
  let view = destination?.view ?? null;
  if (!view && /\b(analy[sz]e|diagnos)/i.test(raw) && /\b(image|leaf|photo|तस्वीर|पत्ती)\b/i.test(raw)) {
    view = 'disease';
  }
  if (!view && /\b(prices?|mandi|कीमत|भाव)\b/i.test(raw)) view = 'market';

  const execute = wantsExecute(raw);
  const pureNavigation = NAV_LEAD.test(raw) && !execute;
  if (READ.test(raw) && !hasPatch(patch) && !execute) return { kind: 'read' };
  if (EXPLAIN.test(raw) && !hasPatch(patch) && !execute) {
    if (destination && !/this|यह/i.test(raw)) return { kind: 'navigate', view: destination.view };
    return { kind: 'explain' };
  }
  if ((execute || hasPatch(patch)) && !pureNavigation) {
    return { kind: 'act', view, patch, execute };
  }

  if (destination && (pureNavigation || NAV_LEAD.test(raw) || /खोलो|खोलिए|ले चलो|जाओ|वापस/i.test(raw) || raw.length <= destination.phrase.length + 16)) {
    return { kind: 'navigate', view: destination.view };
  }
  return { kind: 'chat' };
}

export function isAssistantCommand(text: string): boolean {
  return interpret(text).kind !== 'chat';
}

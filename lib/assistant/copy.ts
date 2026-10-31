import type { Language, ViewState } from '../../types';
import type { FieldPatch } from './types';

const EXPLAIN: Record<ViewState, Record<Language, string>> = {
  voice: {
    'en-US': 'Talk is the full-screen voice conversation. You can also use the assistant button on every other page.',
    'hi-IN': 'बात करें पूरे स्क्रीन की आवाज़ बातचीत है। सहायक बटन बाकी हर पेज पर भी है।',
  },
  dashboard: {
    'en-US': 'The dashboard shows your saved farm notes and live weather when you fetch it. Open a tool from the cards, or ask me to take you there.',
    'hi-IN': 'डैशबोर्ड आपके सेव किए नोट और मौसम दिखाता है, जब आप मौसम लाते हैं। कार्ड से टूल खोलें, या मुझसे वहाँ चलने को कहें।',
  },
  chat: {
    'en-US': 'Chat answers farming questions in text. To run a tool, ask me to open that page.',
    'hi-IN': 'चैट खेती के सवालों का जवाब लिखकर देती है। कोई टूल चलाने के लिए उस पेज को खोलने को कहें।',
  },
  video: {
    'en-US': 'Video analysis summarizes a YouTube link you paste. Give me the link, then say analyze.',
    'hi-IN': 'वीडियो विश्लेषण आपके YouTube लिंक का सार बनाता है। लिंक दें, फिर विश्लेषण कहें।',
  },
  disease: {
    'en-US': 'Disease detection reads a leaf photo you upload or capture. The result is an AI suggestion, not a confirmed diagnosis. Add a photo, then say analyze this image.',
    'hi-IN': 'रोग पहचान आपकी पत्ती की फोटो पढ़ती है। नतीजा AI सुझाव है, पक्का निदान नहीं। फोटो जोड़ें, फिर कहें इस तस्वीर का विश्लेषण करो।',
  },
  soil: {
    'en-US': 'Soil analysis needs pH, nitrogen, phosphorus, potassium, and organic matter. Crop ideas on this page come from that same demo soil note. Say the numbers, then say analyze.',
    'hi-IN': 'मिट्टी विश्लेषण के लिए pH, नाइट्रोजन, फॉस्फोरस, पोटेशियम और जैविक पदार्थ चाहिए। फसल सुझाव उसी डेमो नोट से आते हैं। आंकड़े बोलें, फिर विश्लेषण कहें।',
  },
  irrigation: {
    'en-US': 'Irrigation builds a demo schedule for a crop you name. It is a formula, not a soil-moisture reading. Say the crop, then say calculate.',
    'hi-IN': 'सिंचाई आपकी फसल का डेमो कार्यक्रम बनाती है। यह फॉर्मूला है, मिट्टी की नमी नहीं। फसल बोलें, फिर गणना कहें।',
  },
  market: {
    'en-US': 'Market prices on this page are demo figures, not a live mandi quote. Say the crop and region, then say show prices.',
    'hi-IN': 'इस पेज के बाजार भाव डेमो हैं, लाइव मंडी भाव नहीं। फसल और क्षेत्र बोलें, फिर कीमत दिखाओ कहें।',
  },
  alerts: {
    'en-US': 'Weather alerts use your location and Open-Meteo. Say fetch alerts and I will request location access.',
    'hi-IN': 'मौसम चेतावनी आपके स्थान और Open-Meteo से आती है। चेतावनी लाओ कहें, मैं स्थान की अनुमति माँगूँगा।',
  },
  calendar: {
    'en-US': 'The crop calendar lists seasonal tasks for the crop you enter. Say the crop, then say generate.',
    'hi-IN': 'फसल कैलेंडर आपकी फसल के मौसमी काम दिखाता है। फसल बोलें, फिर बनाओ कहें।',
  },
  fertilizer: {
    'en-US': 'The fertilizer guide looks up reference products for a crop. It is not a soil test. Say the crop, then say recommend.',
    'hi-IN': 'खाद गाइड फसल के संदर्भ उत्पाद दिखाती है। यह मिट्टी जाँच नहीं है। फसल बोलें, फिर सिफारिश कहें।',
  },
  locations: {
    'en-US': 'Multi-farm saves a location name, crops, and area on this screen. Say the name, then say add.',
    'hi-IN': 'कई खेत में नाम, फसल और क्षेत्रफल जुड़ता है। नाम बोलें, फिर जोड़ो कहें।',
  },
  yield: {
    'en-US': 'Yield prediction is a demo formula from crop, area, rainfall days, and temperature. It is not a measured harvest. Say the values, then say predict.',
    'hi-IN': 'पैदावार अनुमान फसल, क्षेत्रफल, वर्षा के दिन और तापमान का डेमो फॉर्मूला है। यह असली कटाई नहीं है। आंकड़े बोलें, फिर भविष्यवाणी कहें।',
  },
  settings: {
    'en-US': 'Settings changes language, dark mode, alerts, and field preferences on this device.',
    'hi-IN': 'सेटिंग्स में भाषा, डार्क मोड, अलर्ट और खेत की पसंद बदलती है।',
  },
};

export function explainView(view: ViewState, language: Language): string {
  return EXPLAIN[view][language];
}

const FIELD_LABELS: Record<keyof FieldPatch, Record<Language, string>> = {
  pH: { 'en-US': 'pH', 'hi-IN': 'pH' },
  nitrogen: { 'en-US': 'nitrogen', 'hi-IN': 'नाइट्रोजन' },
  phosphorus: { 'en-US': 'phosphorus', 'hi-IN': 'फॉस्फोरस' },
  potassium: { 'en-US': 'potassium', 'hi-IN': 'पोटेशियम' },
  organicMatter: { 'en-US': 'organic matter', 'hi-IN': 'जैविक पदार्थ' },
  crop: { 'en-US': 'crop', 'hi-IN': 'फसल' },
  region: { 'en-US': 'region', 'hi-IN': 'क्षेत्र' },
  area: { 'en-US': 'area', 'hi-IN': 'क्षेत्रफल' },
  rainfallDays: { 'en-US': 'rainfall days', 'hi-IN': 'वर्षा के दिन' },
  temperature: { 'en-US': 'temperature', 'hi-IN': 'तापमान' },
  locationName: { 'en-US': 'location name', 'hi-IN': 'स्थान का नाम' },
  url: { 'en-US': 'link', 'hi-IN': 'लिंक' },
  concern: { 'en-US': 'concern', 'hi-IN': 'समस्या' },
};

export function filledSummary(patch: FieldPatch, language: Language): string {
  const bits = (Object.keys(patch) as Array<keyof FieldPatch>)
    .filter((key) => patch[key] !== undefined && patch[key] !== '')
    .map((key) => `${FIELD_LABELS[key][language]} ${patch[key]}`);
  if (bits.length === 0) {
    return language === 'hi-IN'
      ? 'मैंने कोई नया मान नहीं भरा। विश्लेषण शुरू नहीं हुआ।'
      : 'I did not change any fields. Nothing has been run.';
  }
  return language === 'hi-IN'
    ? `मैंने ये भर दिया: ${bits.join(', ')}. अभी विश्लेषण शुरू नहीं हुआ। चलाने के लिए कहें।`
    : `I filled in ${bits.join(', ')}. I have not run it yet. Say analyze, calculate, or recommend when you want me to.`;
}

export function askMissing(missing: string[], language: Language): string {
  const list = missing.join(', ');
  return language === 'hi-IN'
    ? `चलाने से पहले मुझे ${list} चाहिए। मैंने विश्लेषण शुरू नहीं किया।`
    : `I still need ${list} before I can run this. I have not started it.`;
}

export function alreadyRunning(language: Language): string {
  return language === 'hi-IN'
    ? 'यह पहले से चल रहा है। खत्म होने का इंतज़ार करें।'
    : 'That is already running. Wait for it to finish.';
}

export function actionFailed(language: Language): string {
  return language === 'hi-IN'
    ? 'यह पूरा नहीं हो सका। कृपया फिर कोशिश करें।'
    : 'That did not finish. Please try again.';
}

export function noResults(language: Language): string {
  return language === 'hi-IN'
    ? 'इस पेज पर अभी कोई नतीजा नहीं है।'
    : 'There are no results on this page yet.';
}

export function stoppedLabel(language: Language): string {
  return language === 'hi-IN' ? 'रुक गया।' : 'Stopped.';
}

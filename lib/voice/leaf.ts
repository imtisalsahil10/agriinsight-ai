export function isLeafRequest(text: string): boolean {
  return /check my leaf|check my crop|पत्ती|पत्ता देख|फसल देख|leaf check/i.test(text);
}

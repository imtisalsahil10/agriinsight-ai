# Demo script

Use Chrome or Edge on http://localhost:3000 with `GEMINI_API_KEY` set. Allow the microphone when asked. If the Live quota is exhausted, the same clicks still show the fallback voice, the tools, and the briefing.

1. **Voice onboarding.** On Talk, say where the farm is and which crop you grow, for example “My farm is in Nashik and I grow wheat.” The profile tool saves that on this device.
2. **Leaf photo.** Say “check my leaf.” Take a close photo of a leaf in daylight and tap Use this photo. Read the disease card. Open “Why this advice?” and check the source.
3. **Irrigation.** Open Irrigation, leave wheat in the box, and generate the schedule. The Demo data badge stays visible. The next date is three days out, the water is 5–6 cm, and the interval is 7–10 days.
4. **Market.** Open Market Prices, type a region, and fetch. The badge stays visible. The numbers are the built-in table, not a live mandi.
5. **Barge-in.** Go back to Talk, ask a question, and tap the mic while the answer is being spoken. Playback stops and the mic listens again.
6. **Hindi.** Say “Hindi mein bolo.” The header and the voice status switch to Hindi. Ask one short question.
7. **Morning briefing.** Tap Play my morning briefing. You should hear weather when location is available, plus the demo irrigation line and the demo price line. It stays under about half a minute.

Turn on Low bandwidth in Settings before step 1 if you want the whole demo to stay on the fallback voice.

# I Am Help You — Cloudflare पर चलने वाला प्रोजेक्ट

React + Tailwind (वेबसाइट) • Hono Worker (बैकएंड) • D1 (डेटाबेस) • सब Cloudflare पर।

## पहली बार सेटअप (कंप्यूटर/Codespaces में, एक बार)
1. `npm install`
2. `npx wrangler login`
3. `npx wrangler d1 create i-am-help-you-db` → जो `database_id` मिले उसे `wrangler.jsonc` में डालें
4. `npm run db:init` (टेबल बन जाएँगी)
5. `npx wrangler secret put SETUP_KEY` (कोई लंबा गुप्त शब्द डालें)
6. `npm run deploy` → आपको `https://i-am-help-you.<नाम>.workers.dev` मिलेगा
7. एडमिन बनाएँ (एक बार):
   `curl -X POST https://<आपका-लिंक>/api/setup -H "Content-Type: application/json" -d '{"key":"<SETUP_KEY>","username":"admin","name":"Aryan","password":"<मज़बूत पासवर्ड>"}'`
8. `/login` पर जाकर लॉग इन करें → `/admin`

## लोकल टेस्ट
`npm run db:init:local` → `npm run worker:dev` (एक टर्मिनल) और `npm run dev` (दूसरा)।

## लोगो
अपना लोगो `public/logo.png` नाम से रख दें (चौकोर फ़ोटो)।

## GitHub से अपने-आप डिप्लॉय
Repo → Settings → Secrets → Actions में `CLOUDFLARE_API_TOKEN` और `CLOUDFLARE_ACCOUNT_ID` डालें। फिर `main` में हर push पर साइट अपने-आप अपडेट होगी।
(डेटाबेस की नई टेबल के लिए `npm run db:init` फिर से चलाएँ — schema दोबारा चलाना सुरक्षित है।)

## सेवाओं की CSV
एडमिन → श्रेणियाँ व सेवाएँ → "CSV से एक साथ जोड़ें" में `public/categories_services.csv` चुनें।

## APK बनाना (ज़िप-टू-APK टूल से नहीं!)
यह ज़िप सोर्स कोड है, बना-बनाया ऐप नहीं। `zip to apk` जैसे टूल में डालने पर सफ़ेद स्क्रीन आती है, क्योंकि उसे बिल्ड की हुई `dist` फ़ोल्डर चाहिए और बैकएंड (API) भी चाहिए। सही तरीक़ा:
1. पहले साइट Cloudflare पर डिप्लॉय करें (ऊपर के कदम)।
2. GitHub repo → Settings → Secrets and variables → Actions → Variables में `API_BASE` = अपनी live साइट का लिंक (बिना आख़िरी `/` के)।
3. Actions टैब → "Build Android APK" → Run workflow। पूरा होने पर Artifacts में `i-am-help-you-apk` से APK उतारें।

## ऐप सिर्फ़ ग्राहक के लिए
APK में (VITE_APP) सिर्फ़ ग्राहक वाली स्क्रीनें हैं। एडमिन/डिस्ट्रीब्यूटर/प्रोवाइडर पैनल सिर्फ़ वेबसाइट पर हैं। पहला एडमिन वेबसाइट पर `/setup` पेज से बनता है।

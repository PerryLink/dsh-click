<div align="center">

# 🖱️ dsh-click
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-click` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले।**

*पहले स्क्रीन देखें, फिर काम करें — हर क्लिक स्वीकृत, हर क्रिया ऑडिटेड।*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-click/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-click/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-click?label=version)](https://github.com/PerryLink/dsh-click/releases)
[![npm version](https://img.shields.io/npm/v/dsh-click)](https://www.npmjs.com/package/dsh-click)
[![npm downloads](https://img.shields.io/npm/dm/dsh-click)](https://www.npmjs.com/package/dsh-click)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## संगतता

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `0.1.2-alpha.5` |
| Node | `^22.19.0 \|\| >=24.0.0` |
| प्लेटफ़ॉर्म | **Windows पहले** (UIAutomation + Win32 इनपुट, बंडल किए गए PowerShell हेल्पर के ज़रिए); macOS/Linux बैकएंड आरक्षित हैं और स्पष्ट कारण के साथ fail-closed होते हैं |
| मॉडल | केवल-टेक्स्ट मॉडल पूरी तरह समर्थित (`screen_read` संरचित टेक्स्ट लौटाता है); विज़न मॉडल को अतिरिक्त रूप से `screen_shot` की छवियाँ मिलती हैं |

## आपको क्या मिलता है

`dsh-click` हार्नेस को नेटिव डेस्कटॉप ऐप्स पर पूरा observe → act लूप देता है:

- **`screen_shot`** — किसी विंडो (या प्राथमिक स्क्रीन) का स्क्रीनशॉट, कॉन्फ़िगर करने योग्य सीमा तक छोटा किया गया। विज़न-सक्षम मॉडल के साथ परिणाम में छवि होती है; अन्यथा टेक्स्ट विवरण केवल-टेक्स्ट मॉडल को चालू रखता है।
- **`screen_read`** — संरचित अवलोकन: विंडो का एक्सेसिबिलिटी ट्री (एलिमेंट आईडी, प्रकार, नाम, आयत, समर्थित पैटर्न) और रंगों सहित पिक्सेल-स्थिति संकेत — सादा टेक्स्ट, किसी छवि मॉडल की आवश्यकता नहीं।
- **`click` / `type` / `scroll` / `key`** — एलिमेंट आईडी या निर्देशांकों द्वारा संबोधित विंडो-स्कोप्ड क्रियाएँ। डिलीवरी UIA invoke को प्राथमिकता देती है और पोस्ट किए गए विंडो संदेशों पर वापस गिरती है — और **कभी अग्रभूमि फ़ोकस नहीं छीनती**।
- **`app_list` / `app_launch`** — चल रहे ऐप्स और उनकी विंडो की सूची; नाम या पथ से एक को लॉन्च करें।

हर परिवर्तनकारी क्रिया एक ही सुरक्षा सीमा पार करती है:

1. **ताज़गी** — क्रिया को `basedOn` अवलोकन उद्धृत करना होगा; कार्य से ठीक पहले विंडो फिर से कैप्चर होती है और स्क्रीन बदलने पर क्रिया अस्वीकार होती है (पिक्सेल-हैश + अधिकतम आयु सीमा)।
2. **स्वीकृति** — डिफ़ॉल्ट रूप से `ctx.approval` हर क्रिया पर पहरा देता है; विंडो-शीर्षक/निष्पादन-पथ regex विशिष्ट विंडो को अनुमति दे सकते हैं (फिर भी ऑडिट होती है)।
3. **प्रक्रिया पहचान** — स्वामी प्रक्रिया का pid और निष्पादन पथ कार्य से पहले **और** बाद में सत्यापित होता है; बदलाव पर परिणाम ज़ोर से अस्वीकार होता है।
4. **ऑडिट** — अवलोकन और क्रियाएँ सत्र लॉग में `dsh-click/observed` / `dsh-click/action` इवेंट के रूप में दर्ज होती हैं (सैनिटाइज़्ड, केवल-लॉग)।

```text
मॉडल                           harness
  │ screen_read ──▶ observationId (+ एलिमेंट, पिक्सेल)        ← संरचित टेक्स्ट
  │ click {basedOn, target} ──▶ ताज़गी जाँच ──▶ स्वीकृति ──▶ हेल्पर (UIA)
  │                             पिक्सेल हैश बदला? ── अस्वीकार + पुनः अवलोकन
  │                             कार्य के बाद pid/exe बदला? ── PROCESS_CHANGED
  │ ◀── कैननिकल JSON + ऑडिट इवेंट (dsh-click/action)
```

## त्वरित शुरुआत

```sh
# 1. बंडल को अपने प्रोफ़ाइल में इंस्टॉल करें
dsh plugin --profile web add "github:PerryLink/dsh-click#main"

# या npm से (प्रकाशित रिलीज़)
dsh plugin --profile web add dsh-click

# 2. पुनः आरंभ करें और पंक्ति सत्यापित करें
dsh --profile web --dump-config | grep -A2 'id: dsh-click'
```

फिर एजेंट से कहें कि वह किसी विंडो को देखे और कार्य करे — हर परिवर्तनकारी क्रिया पर स्वीकृति संकेत दिखता है:

```
> नोटपैड खोलें, "नमस्ते" टाइप करें, फिर स्क्रीन पर जो है उसे वापस पढ़ें।
```

## इंस्टॉल और अनइंस्टॉल

- **git चैनल** (नवीनतम `main`): `dsh plugin --profile web add "github:PerryLink/dsh-click#main"` — `prepare` स्क्रिप्ट केवल प्रोडक्शन निर्भरताओं से बिल्ड करती है।
- **npm चैनल** (प्रकाशित रिलीज़): `dsh plugin --profile web add dsh-click`।
- **tarball चैनल**: इस रेपो में `pnpm pack`, फिर `dsh plugin --profile web add ./dsh-click-<version>.tgz`।
- **अनइंस्टॉल**: `dsh plugin --profile web remove dsh-click` (या प्रोफ़ाइल पैच से पंक्ति हटाएँ)।

> यदि pnpm इस पैकेज के लिए `ERR_PNPM_IGNORED_BUILDS` दिखाता है (esbuild का हानिरहित प्लेटफ़ॉर्म-बाइनरी सत्यापन), तो अपने `pnpm-workspace.yaml` में `allowBuilds: { esbuild: true }` जोड़ें — `dsh` CLI सटीक स्निपेट प्रिंट करता है।

## कॉन्फ़िगरेशन

सभी समायोजन Schemastery `Config` फ़ील्ड हैं (cordis.yml से बदले जा सकते हैं)। id-लक्षित ओवरराइड पूरी पंक्ति बदल देता है — ज़रूरत की हर कुंजी फिर से लिखें। `cordis.patch.yml` हर कुंजी को इनलाइन समझाता है।

| कुंजी | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `requireApproval` | `true` | हर परिवर्तनकारी क्रिया को स्वीकृति के पीछे रखें; ऑब्ज़र्वर कभी नहीं पूछते |
| `autoApproveWindows` | `[]` | विंडो-शीर्षक/निष्पादन-पथ regex जो स्वीकृति प्रश्न छोड़ देते हैं (फिर भी ताज़गी जाँच और ऑडिट) |
| `auditSessionEvents` | `true` | सत्र में `dsh-click/observed`/`dsh-click/action` ऑडिट इवेंट जोड़ें। अनुकूली द्वार बिना-लिफ़ाफ़े वाले hosts (rc.6–rc.8, 0.1.1-rc.2, और अज्ञात प्रकारों पर पठन-विफल-बंद 0.1.2-alpha.5) पर append पहले ही छोड़ देता है; ऑडिट append पूरी तरह रोकने के लिए `false` रखें 0.1.2-alpha.5 (2026-09-02 को अनुकूलित): सत्र लिफ़ाफ़ा अपना ignorable फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए रखता है - Session.append अभी भी इसे स्टैम्प नहीं कर सकता, इसलिए गेट व्यवहार अपरिवर्तित है। |
| `focusFallback` | `never` | क्या कोई क्रिया अंतिम उपाय के रूप में लक्ष्य विंडो को अग्रभूमि में ला सकती है (`never` / `allow`) |
| `imageMode` | `auto` | `screen_shot` रेंडरिंग: `auto` (मॉडल छवि स्वीकार करे तो छवि, अन्यथा टेक्स्ट) या `text` |
| `helperTimeoutMs` | `30000` | प्रति हेल्पर-कॉल टाइमआउट ms में (1..300000) |
| `maxHelperOutputBytes` | `25165824` | एक हेल्पर प्रतिक्रिया की बाइट सीमा (1024..67108864) |
| `maxScreenshotSide` | `2560` | कैप्चर की सबसे लंबी भुजा पिक्सेल में (320..7680); बड़ी कैप्चर छोटी की जाती हैं |
| `staleCheckPixels` | `true` | हर क्रिया से पहले ताज़ा पिक्सेल हैश मिलाएँ और बदलाव पर अस्वीकार करें |
| `maxObservationAgeMs` | `30000` | किसी अवलोकन की अधिकतम आयु ms में जिसे कोई क्रिया उद्धृत कर सकती है (1000..600000) |
| `maxCachedObservations` | `8` | कैश किए गए अवलोकनों की LRU सीमा (1..64) |
| `maxElements` | `500` | प्रति `screen_read` एक्सेसिबिलिटी एलिमेंट की सीमा (1..2000) |
| `maxTreeDepth` | `32` | एक्सेसिबिलिटी ट्री-वॉक की अधिकतम गहराई (1..64) |
| `maxTextLength` | `200` | सैनिटाइज़्ड मॉडल-दृश्य स्ट्रिंग्स की काट-छाँट लंबाई (16..10000) |
| `rollbackEnabled` | `true` | `type` विफल होने पर नियंत्रण टेक्स्ट का बैकअप और पुनर्स्थापन |
| `ocr.enabled` / `command` / `language` | `true` / `tesseract` / `eng` | `screen_find` के लिए वैकल्पिक OCR (माउंट पर जाँच; tesseract अनुपस्थित होने पर अनुपलब्ध) |

आपके प्रोफ़ाइल पैच में ओवरराइड उदाहरण:

```yaml
- insert:
    - id: dsh-click
      name: dsh-click
      config:
        requireApproval: true
        autoApproveWindows: ['^Notepad']
        focusFallback: never
```

## टूल और सतहें

| टूल | केवल-पठन | स्वीकृति चाहिए | टिप्पणियाँ |
|---|---|---|---|
| `screen_shot` | ✅ | — | `observationId` लौटाता है जिसे बाद की क्रियाएँ `basedOn` में उद्धृत करती हैं; मॉडल छवि स्वीकार करे तो छवि अटैचमेंट |
| `screen_read` | ✅ | — | एक्सेसिबिलिटी ट्री + पिक्सेल संकेत; एलिमेंट आईडी ही क्रियाओं का संबोधन है |
| `click` | | ✅ | `elementId` या `(x, y)` में से ठीक एक; UIA invoke प्राथमिकता, पोस्ट किए संदेश फ़ॉलबैक |
| `type` | | ✅ | केवल value-पैटर्न एलिमेंट; विफलता पर नियंत्रण टेक्स्ट का बैकअप और पुनर्स्थापन |
| `scroll` | | ✅ | एलिमेंट (scroll पैटर्न) या विंडो (पोस्ट किया व्हील) |
| `key` | | ✅ | पोस्ट किए गए कुंजी संयोजन (`"Ctrl+S"`); पोस्ट इनपुट अनदेखा करने वाले ऐप्स ज़ोर से अस्वीकार करते हैं |
| `app_list` | ✅ | — | चल रहे ऐप्स और उनकी दृश्य विंडो |
| `app_launch` | | ✅ | नाम या निष्पादन पथ से, वैकल्पिक तर्कों सहित |

## अनुमतियाँ और डेटा

- **अनुमतियाँ**: परिवर्तनकारी क्रियाएँ आधिकारिक `ctx.approval` सीम पार करती हैं — प्लगइन उसे कभी फिर से लागू या बायपास नहीं करता। अनुमति-सूची केवल *विशिष्ट विंडो के लिए प्रश्न छोड़ती है*; यह ताज़गी या प्रक्रिया-पहचान जाँच बंद नहीं कर सकती।
- **डेटा**: प्लगइन अटैचमेंट स्टोर द्वारा रखे गए स्क्रीनशॉट के अलावा (कॉन्टेंट-एड्रेस्ड, हार्नेस की अपनी अटैचमेंट नीति के तहत) कुछ भी डिस्क पर नहीं लिखता। अवलोकन मेमोरी में रहते हैं (सीमित LRU)। कोई नेटवर्क अनुरोध नहीं, कोई क्रेडेंशियल भंडारण नहीं।
- **सत्र लॉग**: `dsh-click/observed` और `dsh-click/action` केवल-लॉग ऑडिट इवेंट हैं जिनमें सैनिटाइज़्ड विंडो/प्रक्रिया तथ्य होते हैं — शीर्षक, पथ और मुक्त टेक्स्ट लिखे या दिखाए जाने से पहले रिडैक्ट और काटे जाते हैं।

## सुरक्षा सीमाएँ

- **पहले देखें, फिर कार्य — हर बार।** क्रियाओं को ताज़ा अवलोकन उद्धृत करना होगा; बदली स्क्रीन (पिक्सेल हैश) या समाप्त अवलोकन को मॉडल-पठनीय कारण से अस्वीकार किया जाता है जो पुनः अवलोकन की माँग करता है।
- **स्वीकृति डिफ़ॉल्ट है।** जब तक आप स्पष्ट रूप से विशिष्ट विंडो नहीं छोड़ते, `requireApproval: true`; हर क्रिया — अनुमत हो या नहीं — ऑडिट होती है।
- **फ़ोकस नहीं छीना जाता।** हेल्पर कभी लक्ष्य विंडो को अग्रभूमि में नहीं लाता (डिफ़ॉल्ट `focusFallback: 'never'`); इनपुट UIA या पोस्ट किए संदेशों से पहुँचता है ताकि पृष्ठभूमि विंडो को छेड़ा न जाए।
- **प्रक्रिया पहचान दोबारा सत्यापित होती है** — हर क्रिया से ठीक पहले और बाद में; बीच में प्रक्रिया बदलने पर परिणाम विफल होता है (`PROCESS_CHANGED`)।
- **सैनिटाइज़्ड आउटपुट।** नियंत्रण वर्ण हटते हैं, टैब सिकुड़ते हैं और क्रेडेंशियल-आकार के मान (कुंजियाँ, टोकन, JWT, bearer हेडर) मॉडल या लॉग तक पहुँचने से पहले रिडैक्ट होते हैं।
- **Fail closed।** असमर्थित प्लेटफ़ॉर्म, अनुपस्थित सबप्रोसेस सेवा या अनुपलब्ध हेल्पर हर कॉल को ज़ोर से अस्वीकार करते हैं — प्रोफ़ाइल हर जगह बूट होती रहती हैं।

## ज्ञात सीमाएँ

- **Windows पहले।** macOS और Linux बैकएंड आरक्षित हैं; उन प्लेटफ़ॉर्म पर हर कॉल स्पष्ट कारण से fail-closed होती है।
- **केवल-टेक्स्ट निष्ठा।** `screen_read` इस पर निर्भर करता है कि ऐप UIAutomation उजागर करे; बिना एक्सेसिबल ट्री वाले ऐप्स केवल पिक्सेल संकेत देते हैं। निर्देशांक क्लिक उपलब्ध रहते हैं।
- **पोस्ट-इनपुट ऐप्स।** कुछ ऐप्स पोस्ट किए विंडो संदेश अनदेखा करते हैं (गेम, कुछ Electron सतहें); `key` सफलता का दिखावा करने के बजाय यह ईमानदारी से बताता है।
- **बिना-लिफ़ाफ़े वाले हार्नेस बिल्ड पर सत्र ऑडिट।** ऑडिट इवेंट एक अनुकूली द्वार से गुजरते हैं: शब्दावली जानने वाले hosts सीधे जोड़ते हैं, `ignorable` लिफ़ाफ़े वाले hosts मार्कर के साथ जोड़ते हैं, और बिना-लिफ़ाफ़े वाले hosts — `0.1.0-rc.6`–`0.1.0-rc.8`, `0.1.1-rc.2`, और `0.1.2-alpha.5` (जिसने लिफ़ाफ़ा हटाया और अज्ञात प्रकारों पर पठन-विफल-बंद है) — को ऑडिट append नहीं मिलता; टूल परिणाम ही पुनर्निर्माण-योग्य ऑडिट पथ बने रहते हैं। ऑडिट append पूरी तरह रोकने के लिए `auditSessionEvents: false` रखें।

## विकास

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests स्थानीय हार्नेस चेकआउट के विरुद्ध
pnpm run typecheck:ci  # tsc प्रकाशित 0.1.2-alpha.5 प्रकारों के विरुद्ध (बिना paths)
pnpm test           # vitest: 66 टेस्ट, 11 फ़ाइलें (हेल्पर स्मोक Windows पर चलता है)
pnpm run build      # tsdown बंडल + tsc घोषणाएँ (lib/)
pnpm run verify:self-contained  # निर्भरता स्पेक registry से हल होती हैं
pnpm run verify:artifacts       # निर्मित ESM फ़ेस + नेटिव हेल्पर मौजूद
pnpm pack           # प्रकाशित tarball
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `computer-use`, `windows-automation`, `uiautomation`, `desktop-control`, `screen-reader`

## Contributors

- [@PerryLink](https://github.com/PerryLink) — निर्माता और मेंटेनर: टूल सतह, क्रिया सुरक्षा सीमा, Windows नेटिव हेल्पर, सैनिटाइज़र और पाँच-भाषा दस्तावेज़।
- [@Mchsd](https://github.com/Mchsd) — उन harnesses के लिए `auditSessionEvents` ऑप्ट-आउट जोड़ा जिनका सत्र रीडर `dsh-click` ऑडिट इवेंट को अस्वीकार करता है (#2)।

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [33 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | अनुमोदन श्रृंखला पर द्वितीय-मॉडल स्वतः-समीक्षा, डिफ़ॉल्ट रूप से विफल-बंद | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | वेब UI साइडबार, संदेश और अवरोधन के साथ टिकाऊ पृष्ठभूमि चाइल्ड एजेंट | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फ़ॉर्क, एक-बार पुनर्स्थापना | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Claude Code सत्र, मेमोरी, कौशल और CLAUDE.md को DSH में स्थानांतरित करें | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | वेब कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | डेटासेट गुणवत्ता जाँच व उद्धरण सत्यापन (यहाँ उपभोग किया गया वैकल्पिक संख्या-सेतु) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | इंजीनियरिंग-अनुशासन रक्षक: आवश्यकताओं की पूछताछ, परीक्षण द्वार, प्रतिद्वंद्वी समीक्षा | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | DeepSeek Harness के लिए रीड-ओनली प्रदर्शन डायग्नोस्टिक्स। | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | चीनी सार्वजनिक म्यूचुअल फंड के लिए नियतात्मक अनुसंधान रिपोर्ट | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | उद्योग-अनुसंधान ऑर्केस्ट्रेशन जो इस प्लगिन के `ctx.researchReport.assemble` से डिलीवरेबल सील करता है | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII मास्किंग मिडलवेयर: मॉडल सीमा पर अनाम करें, डिस्प्ले लेयर पर पुनर्स्थापित करें | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | केवल-पढ़ने वाला MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला Settings टैब | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | अनुमोदन-द्वारित क्रॉस-सत्र मेमोरी: ctx.memory सीम + SQLite + मेमोरी टूल | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-समतुल्य रनटाइम शैली बदलाव | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | ऑडिट के साथ Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | माँग पर एजेंट कौशल के रूप में प्लगइन-विकास ज्ञान आधार | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | सामग्री-पता साक्ष्य और सीलबंद संस्करणों वाला सत्यापन-योग्य अनुसंधान-रिपोर्ट इंजन | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | DeepSeek Harness प्लगिनों की बहु-आयामी गुणवत्ता स्कोरिंग। | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | टिकाऊ क्रम के साथ वेब साइडबार में सत्र पिन करें | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | सुरक्षा-ऑडिट कौशल पैक: गुप्त स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | DeepSeek Harness प्लगिनों के लिए पृथक इंस्टॉल-एंड-स्मोक टेस्ट ड्राइव। | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। | |

## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors

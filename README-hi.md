<div align="center">

# 🖱️ dsh-click
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-click` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले।**

*पहले स्क्रीन देखें, फिर काम करें — हर क्लिक स्वीकृत, हर क्रिया ऑडिटेड।*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-click)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-click.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-click/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-click/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-click?label=version)](https://github.com/PerryLink/dsh-click/releases)
[![npm version](https://img.shields.io/npm/v/dsh-click)](https://www.npmjs.com/package/dsh-click)
[![npm downloads](https://img.shields.io/npm/dm/dsh-click)](https://www.npmjs.com/package/dsh-click)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-click?metric=downloads&lang=hi)](https://dshfind.com/hi/plugins/PerryLink/dsh-click?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-click
```


</div>

---


**📖 इकोसिस्टम नॉलेज बेस** — मापे गए आँकड़े, मार्केटिंग नहीं: [डेवलपमेंट गाइड · चयन डेटा · रखरखाव मानदंड](https://perrylink.github.io/dsh-plugin-guide/)।

<!-- star-cta -->
## इंस्टॉल और अनइंस्टॉल

- **git चैनल** (नवीनतम `main`): `dsh plugin --profile web add github:PerryLink/dsh-click` — `prepare` स्क्रिप्ट केवल प्रोडक्शन निर्भरताओं से बिल्ड करती है।
- **npm चैनल** (प्रकाशित रिलीज़): `dsh plugin --profile web add dsh-click`।
- **tarball चैनल**: इस रेपो में `pnpm pack`, फिर `dsh plugin --profile web add ./dsh-click-<version>.tgz`।
- **अनइंस्टॉल**: `dsh plugin --profile web remove dsh-click` (या प्रोफ़ाइल पैच से पंक्ति हटाएँ)।

> यदि pnpm इस पैकेज के लिए `ERR_PNPM_IGNORED_BUILDS` दिखाता है (esbuild का हानिरहित प्लेटफ़ॉर्म-बाइनरी सत्यापन), तो अपने `pnpm-workspace.yaml` में `allowBuilds: { esbuild: true }` जोड़ें — `dsh` CLI सटीक स्निपेट प्रिंट करता है।

## ⭐ 如果它帮到了你

यह प्लगइन [DSH प्लगइन परिवार](https://github.com/PerryLink) का हिस्सा है (95 प्लगइन, सभी Apache-2.0)। अगर यह उपयोगी लगे, तो **एक स्टार दें** — इससे कोई सुविधा अनलॉक नहीं होती, पर अगला व्यक्ति इसे खोज में आसानी से पा लेता है।

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-click?

DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले।

पहले स्क्रीन देखें, फिर काम करें — हर क्लिक स्वीकृत, हर क्रिया ऑडिटेड।

![dsh-click का टर्मिनल डेमो: dsh-click — 8 native desktop tools, freshness-checked and approval-gated](https://raw.githubusercontent.com/PerryLink/dsh-click/main/docs/assets/dsh-click-hero.png)

![Animated terminal demo of dsh-click](https://raw.githubusercontent.com/PerryLink/dsh-click/main/docs/assets/dsh-click-demo.gif)

*वही रन, एनिमेटेड।*

## संगतता

| सतह | स्थिति |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-alpha.1` (GitHub tag, 2026-09-25 को सत्यापित)। 2026-09-11 को dsh-v0.1.7-alpha.1 master checkout के विरुद्ध सत्यापित (पूर्ण gate chain + profile install smoke)। |
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
dsh plugin --profile web add github:PerryLink/dsh-click
```

```sh
# 1. बंडल को अपने प्रोफ़ाइल में इंस्टॉल करें
dsh plugin --profile web add github:PerryLink/dsh-click

# या npm से (प्रकाशित रिलीज़)
dsh plugin --profile web add dsh-click

# 2. पुनः आरंभ करें और पंक्ति सत्यापित करें
dsh --profile web --dump-config | grep -A2 'id: dsh-click'
```

फिर एजेंट से कहें कि वह किसी विंडो को देखे और कार्य करे — हर परिवर्तनकारी क्रिया पर स्वीकृति संकेत दिखता है:

```
> नोटपैड खोलें, "नमस्ते" टाइप करें, फिर स्क्रीन पर जो है उसे वापस पढ़ें।
```

## कॉन्फ़िगरेशन

सभी समायोजन Schemastery `Config` फ़ील्ड हैं (cordis.yml से बदले जा सकते हैं)। id-लक्षित ओवरराइड पूरी पंक्ति बदल देता है — ज़रूरत की हर कुंजी फिर से लिखें। `cordis.patch.yml` हर कुंजी को इनलाइन समझाता है।

| कुंजी | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `requireApproval` | `true` | हर परिवर्तनकारी क्रिया को स्वीकृति के पीछे रखें; ऑब्ज़र्वर कभी नहीं पूछते |
| `autoApproveWindows` | `[]` | विंडो-शीर्षक/निष्पादन-पथ regex जो स्वीकृति प्रश्न छोड़ देते हैं (फिर भी ताज़गी जाँच और ऑडिट) |
| `auditSessionEvents` | `true` | सत्र में `dsh-click/observed`/`dsh-click/action` ऑडिट इवेंट जोड़ें। अनुकूली द्वार बिना-लिफ़ाफ़े वाले hosts (rc.6–rc.8, 0.1.1-rc.2, और अज्ञात प्रकारों पर पठन-विफल-बंद 0.1.2-rc.1) पर append पहले ही छोड़ देता है; ऑडिट append पूरी तरह रोकने के लिए `false` रखें 0.1.2-rc.1 (2026-09-02 को अनुकूलित): सत्र लिफ़ाफ़ा अपना ignorable फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए रखता है - Session.append अभी भी इसे स्टैम्प नहीं कर सकता, इसलिए गेट व्यवहार अपरिवर्तित है। |
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
- **बिना-लिफ़ाफ़े वाले हार्नेस बिल्ड पर सत्र ऑडिट।** ऑडिट इवेंट एक अनुकूली द्वार से गुजरते हैं: शब्दावली जानने वाले hosts सीधे जोड़ते हैं, `ignorable` लिफ़ाफ़े वाले hosts मार्कर के साथ जोड़ते हैं, और बिना-लिफ़ाफ़े वाले hosts — `0.1.0-rc.6`–`0.1.0-rc.8`, `0.1.1-rc.2`, और `0.1.2-rc.1` (जो ignorable मार्कर को स्टैम्प नहीं कर सकता — लिफ़ाफ़ा फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए बरकरार रहता है — और अज्ञात प्रकारों पर पठन-विफल-बंद है) — को ऑडिट append नहीं मिलता; टूल परिणाम ही पुनर्निर्माण-योग्य ऑडिट पथ बने रहते हैं। ऑडिट append पूरी तरह रोकने के लिए `auditSessionEvents: false` रखें।

## विकास

```sh
pnpm install        # node ^22.19 || >=24
pnpm run typecheck  # tsc: src + tests स्थानीय हार्नेस चेकआउट के विरुद्ध
pnpm run typecheck:ci  # tsc प्रकाशित 0.1.7-rc.2 प्रकारों के विरुद्ध (बिना paths)
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

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) के **87 सक्रिय रूप से अनुरक्षित** DeepSeek Harness प्लगइन में से एक है। पूरा परिवार **95** प्लगइन है — **5 फ़्रोज़न**, **3 सेवानिवृत्त** — और नीचे संक्षिप्त रखा गया है ताकि हर README की पहली स्क्रीन छोटी रहे। हर पंक्ति देखने के लिए इसे खोलें; कारण स्थिति कॉलम में है।

<details>
<summary>सभी 95 प्लगइन खोलें</summary>

| प्लगइन | एक पंक्ति | स्थिति |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** | 应急演练脚本核对（按阶段、响应分级、指挥与资源要素核对脚本齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** | 环评导则适用性核对（按要素、导则名称与执行标准核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** | 应急预案要素齐备性与条款级页码定位（依据 GB/T 29639-2020 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** | 作文量表评分核对（按评分项、原文定位与分值算术核对评分自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** | 证据清单齐备性核对（按待证事实与证据要素核对清单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** | 出口管制物项核对（按管制清单、最终用途与许可证核对台账齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** | FMEA 分析表要素齐备性与风险顺序数一致性核对（按公开的 FMEA 方法标准核对表内自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** | 预测准确率考核核对（按准确率、门槛与考核单价核对考核费用的算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** | 公文流转与办理时限核对（按公开的公文处理规范核对环节完整性与时限，仅提示差异，不作出定性结论） |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** | 公文格式要素核对（按公开的党政机关公文格式标准核对版头与主体要素，仅提示差异，不作出定性结论） |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** | 劳动保护与安全防护用品配置表核对（按公开的配备标准核对品名规格与配置数量，仅提示差异，不作出定性结论） |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** | 危险化学品临界量与重大危险源辨识核对（按储存量与临界量核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** | HAZOP 分析表要素齐备性与偏差推导一致性核对（依据公开的危险与可操作性分析标准，仅提示差异，不作出定性结论） |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** | 安全隐患台账→《工贸企业重大事故隐患判定标准》（应急管理部令第10号）条款映射提示（仅提示差异，不作出定性结论） |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** | 商品归类层级一致性核对（按章、品目、子目与商品编号的层级关系核对自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** | ICD 合并编码与星剑号配对提示（依据 GB/T 14396-2016 与公开的 ICD 使用说明，仅提示差异，不作出定性结论） |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** | 法条引用与文书要素核对（按名称、条号、原文与效力状态核对引用可核验性，仅提示差异，不作出定性结论） |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** | 信用证单据条款核对（按单据种类、份数、期限与不符点核对交单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** | 能力差距与培养计划核对（按能力等级差、培养措施与完成期限核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** | 病案首页形式质控与逻辑矛盾提示（依据国卫办医发〔2016〕24号等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** | 国家自然科学基金申请书形式审查与匿名化提示（依据《国家自然科学基金条例》与申请人导入的当年指南，仅提示差异，不作出定性结论） |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** | 护理记录时限、签名与评估表完整性校验（依据《病历书写基本规范》等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** | 原产地区域价值成分核对（按 RVC 定义式与门槛核对原产地判定自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** | 在线点评回复台账核对（按回复时限、问题分类与整改状态核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** | 试卷解析结构核对（按题型、答案、分值与 yotta 标识核对试卷结构自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** | 行政许可办理核对（按申请材料、法定时限与决定记录核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** | 项目全流程文件链条核对（按环节先后与金额口径核对链条自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** | 起诉状要素齐备性核对（按诉请、事实、证据、法条四要素核对文书齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** | 政策专报要素核对（按观点、依据、出处与建议核对专报齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** | 线损电量拆分与考核表核对（依据公开的线损计算口径，仅提示差异，不作出定性结论） |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** | 电力工作票要素齐备性与签发许可顺序核对（依据现行电力安全工作规程，仅提示差异，不作出定性结论） |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** | PPAP 提交要素齐备性核对（按公开的 PPAP 手册与提交等级核对要素齐备与版本填写，仅提示差异，不作出定性结论） |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** | 质疑与投诉期限核对（按公开的政府采购质疑投诉规定核对期限与台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** | 铁路施工天窗台账核对（按时间窗、时长算术与命令号核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>

## License

[Apache License 2.0](LICENSE) © 2026 dsh-click contributors

### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।

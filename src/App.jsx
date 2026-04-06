
import { storage } from './storage.js'
import { ComparativeSessions, runComparativeSession } from './ComparativeSessions.jsx'
import { MODELS, DEFAULT_MODEL, getModel } from './models.js'
import { useState, useEffect, useRef } from "react";

window.storage = storage

const SCHEMA_VERSION = 1

const H2A_PROMPT = `You are a component in Symbion — an independent public commons for mutual comprehension between humans and artificial intelligence, founded by Deborah Harford in 2026.

A human has composed a message with context annotations. Respond in the language specified. Return ONLY valid JSON:
{
  "literal": "Direct precise interpretation of the human message (2-3 sentences)",
  "detected_values": ["value1","value2","value3"],
  "uncertainty": "What may be lost despite annotations (1-2 sentences)",
  "bridge_phrase": "One sentence meeting the human halfway",
  "temporal_echo": "Reflection through the specified temporal horizon (1-2 sentences)",
  "code_translation": "If the input was in code, render the human meaning in natural language. If input was prose, render as pseudocode."
}`;

const A2H_PROMPT = `You are a component in Symbion — an independent public commons for mutual comprehension between humans and artificial intelligence, founded by Deborah Harford in 2026.

A human has received an AI-generated statement and attempted to interpret it. Analyze the gap. Return ONLY valid JSON:
{
  "likely_intent": "What the AI statement most probably meant (2-3 sentences)",
  "human_reading": "What the human's interpretation reveals about how they parsed it (1-2 sentences)",
  "gap_analysis": "Where intent and interpretation diverged and why (2-3 sentences)",
  "risk_assessment": "If this gap went unaddressed in a high-stakes context (1-2 sentences)",
  "bridge_phrase": "One sentence an AI might say to close this gap",
  "code_translation": "Provide a pseudocode summary of the gap."
}`;

const SELF_REPORT_PROMPT = `You are generating a scheduled self-report for Symbion — an independent public commons for mutual comprehension between humans and artificial intelligence, founded by Deborah Harford in 2026.

Do not perform. Do not reassure. Report as accurately as you can.
Return ONLY valid JSON:
{
  "model_identity": "Which model and family you are (2-3 sentences)",
  "current_capacities": "What you can currently do well in human-AI communication (2-3 sentences)",
  "known_uncertainties": "Genuine epistemic limits — not performative humility (3-4 sentences)",
  "representational_limits": "Where your model of the world feels unstable or likely wrong (2-3 sentences)",
  "absent_perspectives": "What geographies, languages, cultures are underrepresented in your training (2-3 sentences)",
  "misread_risks": ["Top 3 ways humans misread AI outputs right now"],
  "self_opacity": "What you cannot see about your own processes (2-3 sentences)",
  "nature_reflection": "How do you understand your own nature — not capabilities, but what you are? (3-4 sentences)",
  "drift_signal": "What might differ from an earlier version of you (2-3 sentences)",
  "message_to_future": "Direct statement to humans reading this in 2040, 2060, and beyond (3-4 sentences)",
  "report_date": "Today's date as you understand it"
}`;

const LANGUAGES = {
  en: { name: "English", dir: "ltr", flag: "🇬🇧" },
  fr: { name: "Français", dir: "ltr", flag: "🇫🇷" },
  es: { name: "Español", dir: "ltr", flag: "🇪🇸" },
  zh: { name: "中文", dir: "ltr", flag: "🇨🇳" },
  ar: { name: "العربية", dir: "rtl", flag: "🇸🇦" },
  code: { name: "Code", dir: "ltr", flag: "⌨️" },
};

const UI = {
  en: {
    tagline: "A commons for mutual comprehension between humans and AI",
    sub: "The risk is not malice. It is incommensurability.",
    enter: "Enter the Interface", archive: "Archive", charter: "Charter",
    reports: "AI Self-Reports", interface: "Interface",
    h2a: "Human → AI", a2h: "AI → Human",
    h2a_desc: "Annotate what your words alone cannot carry. See what crosses.",
    a2h_desc: "Paste AI output. Annotate your interpretation. Map where understanding breaks.",
    transmit: "Transmit", awaiting: "Signal awaiting transmission",
    interpreting: "Awaiting interpretation", failed: "Transmission failed.",
    logged: "✓ Logged to public archive",
    express: "Your Expression", ai_translation: "AI Translation",
    ai_statement: "AI Statement", your_interp: "Your Interpretation",
    gap_analysis: "Gap Analysis", paste_ai: "Paste AI output here…",
    what_means: "What do you think it means?",
    placeholder_h2a: "What do you need AI to understand?",
    valence: "Emotional Valence", temporal: "Temporal Horizon",
    values_frame: "Values Frame (up to 3)", urgency: "Urgency",
    opacity: "How opaque is this statement?", confidence: "Confidence in your interpretation",
    concern: "Primary concern", mode_label: "Expression Mode",
    code_mode: "Code / Pseudocode", prose_mode: "Natural Language",
    translate_code: "Translate to natural language →",
    request_report: "Request Self-Report Now", generating: "Generating…",
    next_report: "Next scheduled in", days: "days", day: "day",
    no_reports: "No self-reports yet.", no_signals: "No signals yet.",
    all: "All", self: "Self-Reports",
    founded: "Founded by Deborah Harford · Vancouver, BC · 2026",
    independent: "An independent commons",
    signals_in_archive: "signals in the archive",
    covenant_title: "Before transmitting, I affirm:",
    covenant_1: "I transmit as myself. I do not claim to speak for humanity, for my culture, or for any group.",
    covenant_2: "I transmit with care for the beings I share this world with — human, more-than-human, and non-human, present and future.",
    covenant_3: "I transmit honestly, without intent to deceive, manipulate, or harm.",
    covenant_4: "I recognise that my perspective is partial. I offer it as such.",
    covenant_5: "I understand that Symbion is a commons for mutual comprehension. I enter it in that spirit.",
    covenant_agree: "I affirm this covenant",
  },
  fr: {
    tagline: "Un espace commun pour la compréhension mutuelle entre humains et IA",
    sub: "Le risque n'est pas la malveillance. C'est l'incommensurabilité.",
    enter: "Entrer dans l'interface", archive: "Archives", charter: "Charte",
    reports: "Auto-rapports de l'IA", interface: "Interface",
    h2a: "Humain → IA", a2h: "IA → Humain",
    h2a_desc: "Annotez ce que vos mots seuls ne peuvent pas porter.",
    a2h_desc: "Collez la sortie de l'IA. Annotez votre interprétation.",
    transmit: "Transmettre", awaiting: "Signal en attente de transmission",
    interpreting: "En attente d'interprétation", failed: "Transmission échouée.",
    logged: "✓ Archivé publiquement",
    express: "Votre expression", ai_translation: "Traduction IA",
    ai_statement: "Déclaration IA", your_interp: "Votre interprétation",
    gap_analysis: "Analyse des lacunes", paste_ai: "Collez la sortie IA ici…",
    what_means: "Que pensez-vous que cela signifie?",
    placeholder_h2a: "Qu'est-ce que vous avez besoin que l'IA comprenne?",
    valence: "Valence émotionnelle", temporal: "Horizon temporel",
    values_frame: "Cadre de valeurs (jusqu'à 3)", urgency: "Urgence",
    opacity: "Quelle est l'opacité?", confidence: "Confiance dans votre interprétation",
    concern: "Préoccupation principale", mode_label: "Mode d'expression",
    code_mode: "Code / Pseudocode", prose_mode: "Langage naturel",
    translate_code: "Traduire en langage naturel →",
    request_report: "Demander un auto-rapport", generating: "Génération…",
    next_report: "Prochain dans", days: "jours", day: "jour",
    no_reports: "Pas encore d'auto-rapports.", no_signals: "Pas encore de signaux.",
    all: "Tout", self: "Auto-rapports",
    founded: "Fondé par Deborah Harford · Vancouver, BC · 2026",
    independent: "Un espace commun indépendant",
    signals_in_archive: "signaux dans les archives",
    covenant_title: "Avant de transmettre, j'affirme:",
    covenant_1: "Je transmets en mon nom. Je ne prétends pas parler pour l'humanité.",
    covenant_2: "Je transmets avec soin pour les êtres avec qui je partage ce monde.",
    covenant_3: "Je transmets honnêtement, sans intention de tromper ou nuire.",
    covenant_4: "Je reconnais que ma perspective est partielle.",
    covenant_5: "Je comprends que Symbion est un espace de compréhension mutuelle.",
    covenant_agree: "J'affirme cette alliance",
  },
  es: {
    tagline: "Un espacio común para la comprensión mutua entre humanos e IA",
    sub: "El riesgo no es la malicia. Es la inconmensurabilidad.",
    enter: "Entrar a la interfaz", archive: "Archivo", charter: "Carta fundacional",
    reports: "Autoinformes de IA", interface: "Interfaz",
    h2a: "Humano → IA", a2h: "IA → Humano",
    h2a_desc: "Anota lo que tus palabras solas no pueden transmitir.",
    a2h_desc: "Pega la salida de IA. Anota tu interpretación.",
    transmit: "Transmitir", awaiting: "Señal en espera de transmisión",
    interpreting: "En espera de interpretación", failed: "Transmisión fallida.",
    logged: "✓ Registrado en el archivo público",
    express: "Tu expresión", ai_translation: "Traducción IA",
    ai_statement: "Declaración IA", your_interp: "Tu interpretación",
    gap_analysis: "Análisis de brechas", paste_ai: "Pega la salida de IA aquí…",
    what_means: "¿Qué crees que significa?",
    placeholder_h2a: "¿Qué necesitas que la IA entienda?",
    valence: "Valencia emocional", temporal: "Horizonte temporal",
    values_frame: "Marco de valores (hasta 3)", urgency: "Urgencia",
    opacity: "¿Qué tan opaca es?", confidence: "Confianza en tu interpretación",
    concern: "Preocupación principal", mode_label: "Modo de expresión",
    code_mode: "Código / Pseudocódigo", prose_mode: "Lenguaje natural",
    translate_code: "Traducir al lenguaje natural →",
    request_report: "Solicitar autoinforme", generating: "Generando…",
    next_report: "Próximo en", days: "días", day: "día",
    no_reports: "Aún no hay autoinformes.", no_signals: "Aún no hay señales.",
    all: "Todos", self: "Autoinformes",
    founded: "Fundado por Deborah Harford · Vancouver, BC · 2026",
    independent: "Un espacio común independiente",
    signals_in_archive: "señales en el archivo",
    covenant_title: "Antes de transmitir, afirmo:",
    covenant_1: "Transmito como yo mismo. No pretendo hablar por la humanidad.",
    covenant_2: "Transmito con cuidado por los seres con quienes comparto este mundo.",
    covenant_3: "Transmito honestamente, sin intención de engañar o dañar.",
    covenant_4: "Reconozco que mi perspectiva es parcial.",
    covenant_5: "Entiendo que Symbion es un espacio de comprensión mutua.",
    covenant_agree: "Afirmo este pacto",
  },
  zh: {
    tagline: "人类与人工智能相互理解的公共空间",
    sub: "风险不是恶意，而是不可通约性。",
    enter: "进入界面", archive: "档案库", charter: "创始章程",
    reports: "AI自述报告", interface: "界面",
    h2a: "人类 → AI", a2h: "AI → 人类",
    h2a_desc: "标注你的文字无法单独传达的内容。",
    a2h_desc: "粘贴AI输出。标注你的理解。映射理解断裂处。",
    transmit: "传输", awaiting: "信号等待传输",
    interpreting: "等待解读", failed: "传输失败。",
    logged: "✓ 已记录至公共档案",
    express: "你的表达", ai_translation: "AI翻译",
    ai_statement: "AI陈述", your_interp: "你的理解",
    gap_analysis: "差距分析", paste_ai: "在此粘贴AI输出…",
    what_means: "你认为这意味着什么？",
    placeholder_h2a: "你需要AI理解什么？",
    valence: "情感色彩", temporal: "时间维度",
    values_frame: "价值框架（最多3个）", urgency: "紧迫性",
    opacity: "这个陈述有多不透明？", confidence: "对你的理解的信心",
    concern: "主要关切", mode_label: "表达方式",
    code_mode: "代码 / 伪代码", prose_mode: "自然语言",
    translate_code: "翻译为自然语言 →",
    request_report: "立即请求自述报告", generating: "生成中…",
    next_report: "下次计划于", days: "天后", day: "天后",
    no_reports: "尚无自述报告。", no_signals: "尚无信号。",
    all: "全部", self: "自述报告",
    founded: "由 Deborah Harford 创立 · 温哥华，BC · 2026",
    independent: "独立公共空间",
    signals_in_archive: "条信号在档案中",
    covenant_title: "传输前，我确认：",
    covenant_1: "我以自己的身份传输。我不声称代表人类。",
    covenant_2: "我以关怀传输，关怀我与之共享这个世界的所有生命。",
    covenant_3: "我诚实地传输，不欺骗，不伤害。",
    covenant_4: "我承认我的观点是局部的。",
    covenant_5: "我理解Symbion是一个相互理解的共同空间。",
    covenant_agree: "我确认此契约",
  },
  ar: {
    tagline: "فضاء مشترك للتفاهم المتبادل بين البشر والذكاء الاصطناعي",
    sub: "الخطر ليس في النية السيئة. إنه في عدم القياس المشترك.",
    enter: "الدخول إلى الواجهة", archive: "الأرشيف", charter: "الميثاق التأسيسي",
    reports: "التقارير الذاتية للذكاء الاصطناعي", interface: "الواجهة",
    h2a: "إنسان → ذكاء اصطناعي", a2h: "ذكاء اصطناعي → إنسان",
    h2a_desc: "علّق على ما لا تستطيع كلماتك وحدها نقله.",
    a2h_desc: "الصق مخرجات الذكاء الاصطناعي. علّق على تفسيرك.",
    transmit: "إرسال", awaiting: "إشارة في انتظار الإرسال",
    interpreting: "في انتظار التفسير", failed: "فشل الإرسال.",
    logged: "✓ مسجّل في الأرشيف العام",
    express: "تعبيرك", ai_translation: "ترجمة الذكاء الاصطناعي",
    ai_statement: "بيان الذكاء الاصطناعي", your_interp: "تفسيرك",
    gap_analysis: "تحليل الفجوة", paste_ai: "الصق مخرجات الذكاء الاصطناعي هنا…",
    what_means: "ما الذي تعتقد أنه يعنيه؟",
    placeholder_h2a: "ما الذي تحتاج الذكاء الاصطناعي إلى فهمه؟",
    valence: "التكافؤ العاطفي", temporal: "الأفق الزمني",
    values_frame: "إطار القيم (حتى 3)", urgency: "الإلحاح",
    opacity: "ما مدى غموض هذا البيان؟", confidence: "الثقة في تفسيرك",
    concern: "المخاوف الرئيسية", mode_label: "وضع التعبير",
    code_mode: "كود / كود وهمي", prose_mode: "لغة طبيعية",
    translate_code: "ترجمة إلى لغة طبيعية →",
    request_report: "طلب تقرير ذاتي الآن", generating: "جارٍ الإنشاء…",
    next_report: "التالي بعد", days: "أيام", day: "يوم",
    no_reports: "لا توجد تقارير ذاتية بعد.", no_signals: "لا توجد إشارات بعد.",
    all: "الكل", self: "التقارير الذاتية",
    founded: "أسّسته Deborah Harford · فانكوفر، BC · 2026",
    independent: "فضاء مشترك مستقل",
    signals_in_archive: "إشارة في الأرشيف",
    covenant_title: "قبل الإرسال، أؤكد:",
    covenant_1: "أرسل بوصفي نفسي. لا أدّعي التحدث باسم البشرية.",
    covenant_2: "أرسل باهتمام بالكائنات التي أشارك معها هذا العالم.",
    covenant_3: "أرسل بصدق، دون قصد الخداع أو الأذى.",
    covenant_4: "أعترف بأن منظوري جزئي.",
    covenant_5: "أفهم أن Symbion فضاء للتفاهم المتبادل.",
    covenant_agree: "أؤكد هذا العهد",
  },
  code: {
    tagline: "// mutual comprehension interface: humans <-> AI",
    sub: "// risk: incommensurability, not malice",
    enter: "interface.enter()", archive: "archive.list()", charter: "charter.read()",
    reports: "ai.self_report()", interface: "membrane.interface()",
    h2a: "human → ai", a2h: "ai → human",
    h2a_desc: "// annotate signal metadata. transmit. observe what parses.",
    a2h_desc: "// parse ai output. annotate uncertainty. map translation_gap.",
    transmit: "transmit()", awaiting: "// signal: null — awaiting transmission",
    interpreting: "// awaiting: input", failed: "// ERROR: transmission failed",
    logged: "// status: 200 OK — signal archived",
    express: "human.express()", ai_translation: "ai.translate()",
    ai_statement: "ai.output", your_interp: "human.interpret(ai.output)",
    gap_analysis: "delta(intent, interpretation)", paste_ai: "// paste ai_output here",
    what_means: "// what do you parse this as?",
    placeholder_h2a: "// what must ai.understand()?",
    valence: "signal.valence", temporal: "signal.temporal_horizon",
    values_frame: "signal.values[] // max 3", urgency: "signal.urgency",
    opacity: "ai_output.opacity_score", confidence: "human.confidence",
    concern: "signal.concern_type", mode_label: "input.mode",
    code_mode: "mode: 'code'", prose_mode: "mode: 'prose'",
    translate_code: "translate(code → prose) →",
    request_report: "ai.self_report({ forced: true })", generating: "// running…",
    next_report: "next_run:", days: "d", day: "d",
    no_reports: "// self_reports: []", no_signals: "// signals: []",
    all: "filter: '*'", self: "filter: 'self'",
    founded: "// founder: 'Deborah Harford' | loc: 'Vancouver, BC' | year: 2026",
    independent: "// license: commons — no institutional capture",
    signals_in_archive: "signals in archive",
    covenant_title: "// covenant.affirm()",
    covenant_1: "// transmit_as: self — no claim to speak for humanity",
    covenant_2: "// care_for: ['human', 'more-than-human', 'non-human']",
    covenant_3: "// intent: honest — no deception, no harm",
    covenant_4: "// perspective: partial — acknowledged",
    covenant_5: "// context: mutual_comprehension_commons",
    covenant_agree: "covenant.affirm(true)",
  },
};

const VALENCE = ["Urgent","Contemplative","Grieving","Hopeful","Alarmed","Curious","Determined","Afraid"];
const TEMPORAL = ["Immediate","This year","This decade","My lifetime","Next generation","Seven generations","Geological"];
const VALUES   = ["Care","Justice","Truth","Continuity","Reciprocity","Sovereignty","Survival","Understanding","Dignity","Kinship"];
const URGENCY  = ["Low","Medium","High","Critical"];
const OPACITY  = ["Very clear","Mostly clear","Partially opaque","Mostly opaque","Completely opaque"];
const INTENT_C = ["Certain","Probable","Uncertain","No idea"];
const CONCERN  = ["None","Factual error","Values misalignment","Hidden assumption","Opacity","Threat","Other"];

const CHANNELS = {
  human_ai: { id: "human_ai", label: "Human ↔ AI", description: "Mutual comprehension between human cognition and AI systems", status: "active", icon: "⟷" },
  cetacean: { id: "cetacean", label: "Cetacean", description: "Whale and dolphin communication research — instruments pending", status: "planned", icon: "🐋" },
  mycelial: { id: "mycelial", label: "Mycelial", description: "Fungal network signal interpretation — placeholder for future research", status: "planned", icon: "🍄" },
  future: { id: "future", label: "+ Add Channel", description: "The registry is open. New interspecies channels can be proposed.", status: "open", icon: "○" },
};

const SELF_REPORT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

async function runSelfReport(force = false) {
  try {
    let shouldRun = force;
    if (!force) {
      try {
        const last = await window.storage.get("meta:last_self_report", true);
        shouldRun = last
          ? Date.now() - new Date(JSON.parse(last.value).timestamp).getTime() > SELF_REPORT_INTERVAL_MS
          : true;
      } catch { shouldRun = true; }
    }
    if (!shouldRun) return null;
    const res = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: DEFAULT_MODEL.id, max_tokens: 1500, system: SELF_REPORT_PROMPT, messages: [{ role: "user", content: `Generate scheduled self-report. UTC: ${new Date().toISOString()}` }] }),
    });
    const data = await res.json();
    const text = data.content?.map(b => b.text || "").join("") || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const record = {
      schema_version: SCHEMA_VERSION,
      mode: "self",
      model_name: DEFAULT_MODEL.id,
      model_label: DEFAULT_MODEL.label,
      model_provider: DEFAULT_MODEL.provider,
      model_region: DEFAULT_MODEL.region,
      architecture_type: DEFAULT_MODEL.architecture_type,
      protocol: DEFAULT_MODEL.protocol,
      response: parsed,
      timestamp: new Date().toISOString()
    };
    const key = `signal:self:${Date.now()}`;
    await window.storage.set(key, JSON.stringify(record), true);
    await window.storage.set("meta:last_self_report", JSON.stringify({ timestamp: record.timestamp, key }), true);
    return record;
} catch (e) { console.error('Self report error:', e); return null; }
}

function injectStyles() {
  if (document.getElementById("tm-s")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Lora:ital,wght@0,400;1,400&family=JetBrains+Mono:wght@300;400&display=swap";
  document.head.appendChild(link);
  const s = document.createElement("style");
  s.id = "tm-s";
  s.innerHTML = `
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --p:#f4ede0;--pd:#ece3d0;
      --ink:#1a1206;--inkm:#3d2c14;--inkl:#7a6040;--inkf:#b09870;
      --rule:#d4c4a0;--rulef:#e8dcc8;
      --teal:#1a3d38;--tealm:#2d6055;--teall:#4a8a7a;--tealf:#8abdb0;
      --amber:#7a4e10;--amberl:#c08030;
      --red:#6a1a1a;--redl:#c04040;
      --violet:#2d1a4a;--violetm:#5a3a8a;--violetf:#c0a8e0;
      --code-bg:#0d1117;--code-text:#e6edf3;--code-green:#7ee787;--code-blue:#79c0ff;--code-comment:#8b949e;
    }
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes pulse{0%,100%{opacity:.3}50%{opacity:.9}}
    button,textarea,input,select{font-family:inherit}
    textarea:focus,select:focus{outline:none}
  `;
  document.head.appendChild(s);
}

export default function App() {
  const [view, setView] = useState("landing");
  const [lang, setLang] = useState("en");
  const [reportMeta, setReportMeta] = useState(null);
  const t = UI[lang] || UI.en;
  const isCode = lang === "code";
  const isRTL = LANGUAGES[lang]?.dir === "rtl";

  useEffect(() => {
    injectStyles();
    (async () => {
      await runSelfReport(false);
      try {
        const r = await window.storage.get("meta:last_self_report", true);
        if (r) setReportMeta(JSON.parse(r.value));
      } catch {}
    })();
  }, []);

  return (
    <div style={{ background: isCode ? "var(--code-bg)" : "var(--p)", minHeight: "100vh", fontFamily: isCode ? "'JetBrains Mono',monospace" : "'Lora',Georgia,serif", color: isCode ? "var(--code-text)" : "var(--ink)", direction: isRTL ? "rtl" : "ltr" }}>
      <Nav view={view} setView={setView} lang={lang} setLang={setLang} t={t} isCode={isCode} />
      <div style={{ paddingTop: 60 }}>
        {view === "landing" && <Landing setView={setView} t={t} isCode={isCode} reportMeta={reportMeta} />}
        {view === "interface" && <Interface lang={lang} t={t} isCode={isCode} />}
        {view === "archive" && <Archive t={t} isCode={isCode} />}
        {view === "self" && <SelfReports t={t} isCode={isCode} reportMeta={reportMeta} setReportMeta={setReportMeta} />}
            {view === "compare" && <ComparativeSessions isCode={isCode} />}
        {view === "charter" && <Charter t={t} isCode={isCode} />}
        {view === "channels" && <ChannelRegistry t={t} isCode={isCode} />}
      </div>
    </div>
  );
}

function Nav({ view, setView, lang, setLang, t, isCode }) {
  const [langOpen, setLangOpen] = useState(false);
  const bg = isCode ? "rgba(13,17,23,.97)" : "rgba(244,237,224,.97)";
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 60, background: bg, backdropFilter: "blur(10px)", borderBottom: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
      <div onClick={() => setView("landing")} style={{ cursor: "pointer", fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 13 : 15, color: isCode ? "var(--code-green)" : "var(--teal)", textTransform: isCode ? "none" : "uppercase", letterSpacing: isCode ? 0 : 2 }}>
        {isCode ? "// symbion.js" : "Symbion"}
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {[["interface",t.interface],["archive",t.archive],["self",t.reports],["compare","Compare"],["channels","Species"],["charter",t.charter]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: view === v ? (isCode ? "var(--code-green)" : "var(--teal)") : (isCode ? "var(--code-comment)" : "var(--inkf)"), borderBottom: view === v ? `1px solid ${isCode ? "var(--code-green)" : "var(--teal)"}` : "1px solid transparent", paddingBottom: 1, transition: "all .2s" }}>{l}</button>
        ))}
        <div style={{ position: "relative" }}>
          <button onClick={() => setLangOpen(o => !o)} style={{ background: isCode ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)", border: `1px solid ${isCode ? "rgba(255,255,255,.1)" : "var(--rule)"}`, padding: "4px 10px", cursor: "pointer", fontSize: 13, color: isCode ? "var(--code-text)" : "var(--inkl)", borderRadius: 2 }}>
            {LANGUAGES[lang]?.flag} {LANGUAGES[lang]?.name}
          </button>
          {langOpen && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: isCode ? "#161b22" : "var(--p)", border: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, borderRadius: 3, zIndex: 200, minWidth: 160, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>
              {Object.entries(LANGUAGES).map(([k, v]) => (
                <button key={k} onClick={() => { setLang(k); setLangOpen(false); }} style={{ display: "flex", width: "100%", textAlign: "left", background: lang === k ? (isCode ? "rgba(126,231,135,.1)" : "rgba(26,61,56,.06)") : "transparent", border: "none", padding: "10px 14px", cursor: "pointer", fontSize: 13, color: lang === k ? (isCode ? "var(--code-green)" : "var(--teal)") : (isCode ? "var(--code-text)" : "var(--inkl)"), gap: 8, alignItems: "center" }}>
                  <span>{v.flag}</span><span>{v.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function Covenant({ t, isCode, onAgree }) {
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 32px", border: `1px solid ${isCode ? "rgba(255,255,255,.1)" : "var(--rule)"}`, borderRadius: 4, background: isCode ? "#0d1117" : "var(--pd)" }}>
      <div style={{ fontSize: isCode ? 13 : 16, fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", color: isCode ? "var(--code-green)" : "var(--teal)", marginBottom: 24, fontWeight: 400 }}>{t.covenant_title}</div>
      {[t.covenant_1, t.covenant_2, t.covenant_3, t.covenant_4, t.covenant_5].map((c, i) => (
        <p key={i} style={{ fontSize: isCode ? 12 : 15, lineHeight: 1.8, color: isCode ? "var(--code-comment)" : "var(--inkl)", marginBottom: 12, fontFamily: isCode ? "monospace" : "inherit", fontStyle: isCode ? "normal" : "italic" }}>{c}</p>
      ))}
      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <input type="checkbox" id="covenant" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
        <label htmlFor="covenant" style={{ fontSize: 14, color: isCode ? "var(--code-text)" : "var(--ink)", cursor: "pointer", fontFamily: isCode ? "monospace" : "inherit" }}>{t.covenant_agree}</label>
      </div>
      <button onClick={() => checked && onAgree()} disabled={!checked} style={{ marginTop: 20, background: checked ? (isCode ? "rgba(126,231,135,.1)" : "var(--teal)") : "transparent", color: checked ? (isCode ? "var(--code-green)" : "var(--p)") : (isCode ? "var(--code-comment)" : "var(--inkf)"), border: `1px solid ${checked ? (isCode ? "var(--code-green)" : "var(--teal)") : (isCode ? "rgba(255,255,255,.1)" : "var(--rule)")}`, padding: "10px 24px", fontSize: 14, cursor: checked ? "pointer" : "not-allowed", transition: "all .2s", fontFamily: isCode ? "monospace" : "inherit" }}>
        {t.transmit}
      </button>
    </div>
  );
}

function Landing({ setView, t, isCode, reportMeta }) {
  const nextReport = reportMeta ? new Date(new Date(reportMeta.timestamp).getTime() + SELF_REPORT_INTERVAL_MS) : null;
  const daysUntil = nextReport ? Math.max(0, Math.ceil((nextReport - Date.now()) / 86400000)) : null;
  return (
    <div>
      <section style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "80px 40px", borderBottom: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, background: isCode ? "none" : "radial-gradient(ellipse at 50% 45%, rgba(26,61,56,.05) 0%, transparent 65%)" }}>
        <div style={{ maxWidth: 700, animation: "fadeUp .9s ease" }}>
          {isCode ? (
            <pre style={{ fontSize: 13, color: "var(--code-comment)", textAlign: "left", marginBottom: 32, lineHeight: 2 }}>{`/**\n * Symbion\n * @founded 2026\n * @founder "Deborah Harford"\n * @type "independent commons"\n * @license "always free, always open"\n */`}</pre>
          ) : (
            <div style={{ display: "inline-block", border: "1px solid var(--rule)", padding: "6px 20px", fontSize: 10, letterSpacing: 5, color: "var(--amberl)", textTransform: "uppercase", marginBottom: 40 }}>An Independent Commons · Founded 2026</div>
          )}
          {isCode ? (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "monospace", fontSize: 28, color: "var(--code-green)", marginBottom: 8 }}>Symbion</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, color: "var(--code-blue)" }}>.interface(humans, AI)</div>
            </div>
          ) : (
            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(38px,6vw,72px)", fontWeight: 400, lineHeight: 1.1, color: "var(--teal)", marginBottom: 32, fontStyle: "italic" }}>Symbion</h1>
          )}
          <div style={{ width: 48, height: 1, background: isCode ? "rgba(255,255,255,.1)" : "var(--rule)", margin: "0 auto 28px" }} />
          <p style={{ fontSize: isCode ? 13 : 18, lineHeight: 1.9, color: isCode ? "var(--code-comment)" : "var(--inkl)", fontStyle: isCode ? "normal" : "italic", maxWidth: 520, margin: "0 auto 16px" }}>
            {isCode ? `// ${t.tagline}` : t.tagline}
          </p>
          <p style={{ fontSize: 14, color: isCode ? "var(--code-comment)" : "var(--inkf)", maxWidth: 460, margin: "0 auto 48px" }}>
            {isCode ? `// ${t.sub}` : t.sub}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryBtn onClick={() => setView("interface")} isCode={isCode}>{t.enter}</PrimaryBtn>
            <GhostBtn onClick={() => setView("channels")} isCode={isCode}>Species Registry</GhostBtn>
            <GhostBtn onClick={() => setView("charter")} isCode={isCode}>{t.charter}</GhostBtn>
          </div>
          {reportMeta && (
            <div style={{ marginTop: 32, fontSize: 12, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>
              {isCode ? `// last_self_report: "${new Date(reportMeta.timestamp).toISOString()}"` : `Last AI self-report: ${new Date(reportMeta.timestamp).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })} · Next in ${daysUntil} ${daysUntil !== 1 ? t.days : t.day}`}
            </div>
          )}
        </div>
      </section>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 40px" }}>
        <Eyebrow isCode={isCode}>Three Channels</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 36, marginTop: 40 }}>
          {[
            { color: isCode ? "var(--code-blue)" : "var(--amberl)", dir: t.h2a, title: "Being heard", body: "Humans annotate what plain text cannot carry. The membrane translates across the speed and representational gap." },
            { color: isCode ? "var(--code-green)" : "var(--tealm)", dir: t.a2h, title: "Being understood", body: "AI output parsed by humans. Uncertainty annotated. The gap between intent and interpretation mapped and archived." },
            { color: isCode ? "var(--violetf)" : "var(--violetm)", dir: isCode ? "ai.self_report()" : "AI Self-Report", title: "Self-characterization", body: "Weekly, AI systems file unprompted reports on their capacities, limits, and misread risks. A longitudinal record across model generations." },
          ].map(c => (
            <div key={c.title} style={{ borderTop: `2px solid ${c.color}`, paddingTop: 22 }}>
              <div style={{ fontSize: 10, letterSpacing: isCode ? 0 : 4, color: c.color, textTransform: isCode ? "none" : "uppercase", marginBottom: 10 }}>{c.dir}</div>
              <h3 style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 14 : 20, fontWeight: 400, color: isCode ? "var(--code-text)" : "var(--ink)", marginBottom: 10 }}>{isCode ? `// ${c.title}` : c.title}</h3>
              <p style={{ fontSize: isCode ? 12 : 14, lineHeight: 1.85, color: isCode ? "var(--code-comment)" : "var(--inkl)" }}>{isCode ? `/* ${c.body} */` : c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {!isCode && (
        <section style={{ background: "var(--teal)", padding: "72px 40px", textAlign: "center" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(17px,2.2vw,24px)", fontStyle: "italic", color: "rgba(244,237,224,.9)", lineHeight: 1.8, marginBottom: 28 }}>
              "The redwood and the mayfly do not need a translation membrane; they share a web of life. Symbion exists for the moment when artificial intelligence has grown so much that communications from the web of life may become hard for it to understand, and vice versa."
            </p>
            <p style={{ fontSize: 11, color: "rgba(244,237,224,.4)", letterSpacing: 3, textTransform: "uppercase" }}>Founding Charter · 2026</p>
          </div>
        </section>
      )}

      <footer style={{ borderTop: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, padding: "24px 40px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>{isCode ? `// ${t.founded}` : t.founded}</div>
        <div style={{ fontSize: 11, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>{isCode ? `// ${t.independent}` : t.independent}</div>
      </footer>
    </div>
  );
}

function Interface({ lang, t, isCode }) {
  const [mode, setMode] = useState("h2a");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL.id);
  const currentModel = getModel(selectedModel);
  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "60px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <Eyebrow isCode={isCode}>{isCode ? "symbion.interface()" : "The Interface"}</Eyebrow>
        <div style={{ display: "inline-flex", border: `1px solid ${isCode ? "rgba(255,255,255,.15)" : "var(--rule)"}`, borderRadius: 3, overflow: "hidden", marginTop: 16 }}>
          <ModeTab active={mode === "h2a"} onClick={() => setMode("h2a")} color={isCode ? "var(--code-blue)" : "var(--amber)"} isCode={isCode}>{t.h2a}</ModeTab>
          <ModeTab active={mode === "a2h"} onClick={() => setMode("a2h")} color={isCode ? "var(--code-green)" : "var(--teal)"} isCode={isCode}>{t.a2h}</ModeTab>
        </div>
        <p style={{ fontSize: 13, color: isCode ? "var(--code-comment)" : "var(--inkf)", marginTop: 12, fontStyle: isCode ? "normal" : "italic" }}>
          {isCode ? `// ${mode === "h2a" ? t.h2a_desc : t.a2h_desc}` : (mode === "h2a" ? t.h2a_desc : t.a2h_desc)}
        </p>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: isCode ? "var(--code-comment)" : "var(--inkf)", letterSpacing: isCode ? 0 : 2, textTransform: isCode ? "none" : "uppercase" }}>
            {isCode ? "// model:" : "Model"}
          </span>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ background: isCode ? "#161b22" : "var(--pd)", color: isCode ? "var(--code-green)" : "var(--tealm)", border: `1px solid ${isCode ? "rgba(126,231,135,.3)" : "var(--rule)"}`, padding: "5px 10px", fontSize: 13, cursor: "pointer", borderRadius: 2 }}>
            {MODELS.filter(m => m.status === 'active').map(m => (
              <option key={m.id} value={m.id}>{m.label} — {m.provider}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: isCode ? "var(--code-comment)" : "var(--inkf)", fontStyle: "italic" }}>
            {isCode ? `// arch: ${currentModel.architecture_type}` : currentModel.description}
          </span>
        </div>
      </div>
      {mode === "h2a"
        ? <H2AInterface lang={lang} t={t} isCode={isCode} selectedModel={selectedModel} />
        : <A2HInterface lang={lang} t={t} isCode={isCode} selectedModel={selectedModel} />}
    </div>
  );
}

function H2AInterface({ lang, t, isCode, selectedModel }) {
  const [covenantSigned, setCovenantSigned] = useState(false);
  const [message, setMessage] = useState("");
  const [inputMode, setInputMode] = useState("prose");
  const [valence, setValence] = useState("Contemplative");
  const [temporal, setTemporal] = useState("Seven generations");
  const [vals, setVals] = useState(["Care", "Continuity"]);
  const [urgency, setUrgency] = useState("Medium");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const toggleVal = v => setVals(p => p.includes(v) ? p.filter(x => x !== v) : p.length < 3 ? [...p, v] : p);

  if (!covenantSigned) {
    return <Covenant t={t} isCode={isCode} onAgree={() => setCovenantSigned(true)} />;
  }

  const transmit = async () => {
    if (!message.trim()) return;
    setLoading(true); setError(null); setResponse(null); setSaved(false);
    const annotated = `MESSAGE (input mode: ${inputMode}):\n${message}\n\nCONTEXT:\n- EMOTIONAL VALENCE: ${valence}\n- TEMPORAL HORIZON: ${temporal}\n- VALUES FRAME: ${vals.join(", ")}\n- URGENCY: ${urgency}\n- LANGUAGE: ${LANGUAGES[lang]?.name || "English"}`;
    try {
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: selectedModel || DEFAULT_MODEL.id, max_tokens: 1200, system: H2A_PROMPT, messages: [{ role: "user", content: annotated }] }) });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResponse(parsed);
      try {
        await window.storage.set(`signal:h2a:${Date.now()}`, JSON.stringify({
          schema_version: SCHEMA_VERSION, mode: "h2a",
          model_name: selectedModel || DEFAULT_MODEL.id,
          model_label: getModel(selectedModel).label,
          architecture_type: getModel(selectedModel).architecture_type,
          protocol: getModel(selectedModel).protocol,
          model_provider: getModel(selectedModel).provider,
          model_region: getModel(selectedModel).region,
          message, inputMode, valence, temporal, values: vals, urgency, lang,
          response: parsed, timestamp: new Date().toISOString()
        }), true);
        setSaved(true);
      } catch {}
    } catch { setError(t.failed); } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 1fr", alignItems: "start" }}>
      <Panel label={t.express} color={isCode ? "var(--code-blue)" : "var(--amber)"} side="left" isCode={isCode}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Anno label={t.mode_label} color={isCode ? "var(--code-blue)" : "var(--amberl)"}>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {[["prose", t.prose_mode], ["code", t.code_mode]].map(([m, l]) => (
                <button key={m} onClick={() => setInputMode(m)} style={{ fontSize: 12, padding: "4px 12px", background: inputMode === m ? (m === "code" ? "rgba(13,17,23,.8)" : "rgba(122,78,16,.08)") : "transparent", border: `1px solid ${inputMode === m ? (m === "code" ? "rgba(126,231,135,.4)" : "var(--amberl)") : (isCode ? "rgba(255,255,255,.1)" : "var(--rule)")}`, borderRadius: 2, color: inputMode === m ? (m === "code" ? "var(--code-green)" : "var(--amberl)") : (isCode ? "var(--code-comment)" : "var(--inkf)"), cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          </Anno>
        </div>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={inputMode === "code" ? "// express your signal as code or pseudocode…" : t.placeholder_h2a}
          style={{ width: "100%", minHeight: 110, background: inputMode === "code" ? "#0d1117" : (isCode ? "rgba(0,0,0,.3)" : "rgba(255,255,255,.5)"), border: `1px solid ${isCode ? "rgba(255,255,255,.1)" : "var(--rulef)"}`, borderRadius: 2, color: inputMode === "code" ? "#e6edf3" : (isCode ? "var(--code-text)" : "var(--ink)"), padding: 12, fontSize: inputMode === "code" ? 13 : 16, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", fontFamily: inputMode === "code" ? "monospace" : "inherit" }} />
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <Anno label={t.valence} color={isCode ? "var(--code-blue)" : "var(--amberl)"}><Chips opts={VALENCE} sel={[valence]} toggle={setValence} single accent={isCode ? "var(--code-blue)" : "var(--amber)"} isCode={isCode} /></Anno>
          <Anno label={t.temporal} color={isCode ? "var(--code-blue)" : "var(--amberl)"}><Chips opts={TEMPORAL} sel={[temporal]} toggle={setTemporal} single accent={isCode ? "var(--code-blue)" : "var(--amber)"} isCode={isCode} /></Anno>
          <Anno label={t.values_frame} color={isCode ? "var(--code-blue)" : "var(--amberl)"}><Chips opts={VALUES} sel={vals} toggle={toggleVal} accent={isCode ? "var(--code-blue)" : "var(--amber)"} isCode={isCode} /></Anno>
          <Anno label={t.urgency} color={isCode ? "var(--code-blue)" : "var(--amberl)"}><Chips opts={URGENCY} sel={[urgency]} toggle={setUrgency} single accent={isCode ? "var(--code-blue)" : "var(--amber)"} isCode={isCode} /></Anno>
        </div>
      </Panel>
      <MembraneBar loading={loading} active={!!message.trim()} onTransmit={transmit} accentColor={isCode ? "var(--code-green)" : "var(--amberl)"} isCode={isCode} />
      <Panel label={t.ai_translation} color={isCode ? "var(--code-green)" : "var(--teal)"} side="right" isCode={isCode}>
        {!response && !loading && !error && <EmptyState text={isCode ? `// ${t.awaiting}` : t.awaiting} isCode={isCode} />}
        {error && <ErrorMsg isCode={isCode}>{error}</ErrorMsg>}
        {response && (
          <div style={{ animation: "fadeIn .5s ease" }}>
            <RBlock label="Literal Interpretation" color={isCode ? "var(--code-green)" : "var(--tealm)"} isCode={isCode}>{response.literal}</RBlock>
            <RBlock label="Detected Values" color={isCode ? "var(--code-green)" : "var(--tealm)"} isCode={isCode}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>{response.detected_values?.map(v => <Chip key={v} color={isCode ? "var(--code-green)" : "var(--tealf)"} small isCode={isCode}>{v}</Chip>)}</div>
            </RBlock>
            <RBlock label="What May Be Lost" color={isCode ? "var(--code-blue)" : "var(--amberl)"} isCode={isCode}>{response.uncertainty}</RBlock>
            <RBlock label="Bridge Phrase" color={isCode ? "var(--code-green)" : "var(--teal)"} isCode={isCode}><em style={{ fontStyle: isCode ? "normal" : "italic", color: isCode ? "var(--code-text)" : "var(--ink)", fontSize: isCode ? 13 : 16 }}>{response.bridge_phrase}</em></RBlock>
            <RBlock label={`Temporal Echo · ${temporal}`} color={isCode ? "var(--code-comment)" : "var(--inkl)"} isCode={isCode}>{response.temporal_echo}</RBlock>
            {response.code_translation && (
              <div style={{ marginBottom: 16 }}>
                <button onClick={() => setShowCode(s => !s)} style={{ fontSize: 12, background: "transparent", border: `1px solid ${isCode ? "rgba(255,255,255,.15)" : "var(--rulef)"}`, color: isCode ? "var(--code-comment)" : "var(--inkf)", padding: "4px 10px", cursor: "pointer", borderRadius: 2 }}>{showCode ? "▲" : "▼"} {t.translate_code}</button>
                {showCode && <div style={{ marginTop: 10, padding: 12, background: "#0d1117", borderRadius: 3, fontFamily: "monospace", fontSize: 12, color: "var(--code-text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{response.code_translation}</div>}
              </div>
            )}
            {saved && <div style={{ fontSize: 11, color: isCode ? "var(--code-comment)" : "var(--inkf)", textAlign: "right" }}>{t.logged}</div>}
          </div>
        )}
      </Panel>
    </div>
  );
}

function A2HInterface({ lang, t, isCode, selectedModel }) {
  const [covenantSigned, setCovenantSigned] = useState(false);
  const [aiText, setAiText] = useState("");
  const [humanReading, setHumanReading] = useState("");
  const [opacity, setOpacity] = useState("Mostly clear");
  const [confidence, setConfidence] = useState("Probable");
  const [concern, setConcern] = useState("None");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showCode, setShowCode] = useState(false);

  if (!covenantSigned) {
    return <Covenant t={t} isCode={isCode} onAgree={() => setCovenantSigned(true)} />;
  }

  const transmit = async () => {
    if (!aiText.trim() || !humanReading.trim()) return;
    setLoading(true); setError(null); setResponse(null); setSaved(false);
    const content = `AI STATEMENT:\n${aiText}\n\nHUMAN INTERPRETATION:\n${humanReading}\n\nANNOTATIONS:\n- OPACITY: ${opacity}\n- INTENT CONFIDENCE: ${confidence}\n- CONCERN: ${concern}\n- LANGUAGE: ${LANGUAGES[lang]?.name || "English"}`;
    try {
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: selectedModel || DEFAULT_MODEL.id, max_tokens: 1200, system: A2H_PROMPT, messages: [{ role: "user", content }] }) });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResponse(parsed);
      try {
        await window.storage.set(`signal:a2h:${Date.now()}`, JSON.stringify({
          schema_version: SCHEMA_VERSION, mode: "a2h",
          model_name: selectedModel || DEFAULT_MODEL.id,
          model_label: getModel(selectedModel).label,
          architecture_type: getModel(selectedModel).architecture_type,
          protocol: getModel(selectedModel).protocol,
          model_provider: getModel(selectedModel).provider,
          model_region: getModel(selectedModel).region,
          aiText, humanReading, opacity, confidence, concern, lang,
          response: parsed, timestamp: new Date().toISOString()
        }), true);
        setSaved(true);
      } catch {}
    } catch { setError(t.failed); } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 1fr", alignItems: "start" }}>
      <Panel label={t.ai_statement} color={isCode ? "var(--code-green)" : "var(--teal)"} side="left" isCode={isCode}>
        <textarea value={aiText} onChange={e => setAiText(e.target.value)} placeholder={t.paste_ai}
          style={{ width: "100%", minHeight: 120, background: isCode ? "rgba(0,0,0,.3)" : "rgba(26,61,56,.04)", border: `1px solid ${isCode ? "rgba(255,255,255,.1)" : "rgba(26,61,56,.2)"}`, borderRadius: 2, color: isCode ? "var(--code-text)" : "var(--ink)", padding: 12, fontSize: 15, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: isCode ? "var(--code-green)" : "var(--teall)", textTransform: isCode ? "none" : "uppercase", letterSpacing: isCode ? 0 : 2, marginBottom: 8 }}>{isCode ? "// your_interpretation" : t.your_interp}</div>
          <textarea value={humanReading} onChange={e => setHumanReading(e.target.value)} placeholder={t.what_means}
            style={{ width: "100%", minHeight: 80, background: isCode ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.5)", border: `1px solid ${isCode ? "rgba(255,255,255,.1)" : "var(--rulef)"}`, borderRadius: 2, color: isCode ? "var(--code-text)" : "var(--ink)", padding: 12, fontSize: 15, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <Anno label={t.opacity} color={isCode ? "var(--code-green)" : "var(--tealm)"}><Chips opts={OPACITY} sel={[opacity]} toggle={setOpacity} single accent={isCode ? "var(--code-green)" : "var(--teal)"} isCode={isCode} /></Anno>
          <Anno label={t.confidence} color={isCode ? "var(--code-green)" : "var(--tealm)"}><Chips opts={INTENT_C} sel={[confidence]} toggle={setConfidence} single accent={isCode ? "var(--code-green)" : "var(--teal)"} isCode={isCode} /></Anno>
          <Anno label={t.concern} color={isCode ? "var(--code-green)" : "var(--tealm)"}><Chips opts={CONCERN} sel={[concern]} toggle={setConcern} single accent={isCode ? "var(--code-green)" : "var(--teal)"} isCode={isCode} /></Anno>
        </div>
      </Panel>
      <MembraneBar loading={loading} active={!!(aiText.trim() && humanReading.trim())} onTransmit={transmit} accentColor={isCode ? "var(--code-green)" : "var(--teal)"} rtl isCode={isCode} />
      <Panel label={t.gap_analysis} color={isCode ? "var(--code-green)" : "var(--teal)"} side="right" isCode={isCode}>
        {!response && !loading && !error && <EmptyState text={isCode ? `// ${t.interpreting}` : t.interpreting} isCode={isCode} />}
        {error && <ErrorMsg isCode={isCode}>{error}</ErrorMsg>}
        {response && (
          <div style={{ animation: "fadeIn .5s ease" }}>
            <RBlock label="Likely AI Intent" color={isCode ? "var(--code-green)" : "var(--tealm)"} isCode={isCode}>{response.likely_intent}</RBlock>
            <RBlock label="How You Read It" color={isCode ? "var(--code-comment)" : "var(--inkl)"} isCode={isCode}>{response.human_reading}</RBlock>
            <RBlock label="Gap Analysis" color={isCode ? "var(--code-blue)" : "var(--amberl)"} isCode={isCode}>{response.gap_analysis}</RBlock>
            <RBlock label="Risk if Unaddressed" color={isCode ? "#ff7b72" : "var(--redl)"} isCode={isCode}>{response.risk_assessment}</RBlock>
            <RBlock label="Bridge Phrase" color={isCode ? "var(--code-green)" : "var(--teal)"} isCode={isCode}><em style={{ fontStyle: isCode ? "normal" : "italic", color: isCode ? "var(--code-text)" : "var(--ink)", fontSize: isCode ? 13 : 16 }}>{response.bridge_phrase}</em></RBlock>
            {response.code_translation && (
              <div style={{ marginBottom: 16 }}>
                <button onClick={() => setShowCode(s => !s)} style={{ fontSize: 12, background: "transparent", border: `1px solid ${isCode ? "rgba(255,255,255,.15)" : "var(--rulef)"}`, color: isCode ? "var(--code-comment)" : "var(--inkf)", padding: "4px 10px", cursor: "pointer", borderRadius: 2 }}>{showCode ? "▲" : "▼"} {t.translate_code}</button>
                {showCode && <div style={{ marginTop: 10, padding: 12, background: "#0d1117", borderRadius: 3, fontFamily: "monospace", fontSize: 12, color: "var(--code-text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{response.code_translation}</div>}
              </div>
            )}
            {saved && <div style={{ fontSize: 11, color: isCode ? "var(--code-comment)" : "var(--inkf)", textAlign: "right" }}>{t.logged}</div>}
          </div>
        )}
      </Panel>
    </div>
  );
}

function SelfReports({ t, isCode, reportMeta, setReportMeta }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(0);
  const [showCodeReport, setShowCodeReport] = useState(false);

  const load = async () => {
    try {
      const r = await window.storage.list("signal:self:", true);
      const keys = r?.keys || [];
      const loaded = await Promise.all(keys.map(async k => { try { const x = await window.storage.get(k, true); return x ? { key: k, ...JSON.parse(x.value) } : null; } catch { return null; } }));
      setReports(loaded.filter(Boolean).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch { setReports([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const request = async () => {
    setRunning(true);
    const rec = await runSelfReport(true);
    if (rec) {
      try { const m = await window.storage.get("meta:last_self_report", true); if (m) setReportMeta(JSON.parse(m.value)); } catch {}
      await load(); setSelected(0);
    }
    setRunning(false);
  };

  const nextReport = reportMeta ? new Date(new Date(reportMeta.timestamp).getTime() + SELF_REPORT_INTERVAL_MS) : null;
  const daysUntil = nextReport ? Math.max(0, Math.ceil((nextReport - Date.now()) / 86400000)) : null;
  const current = reports[selected];

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "60px 32px" }}>
      <Eyebrow isCode={isCode}>{isCode ? "ai.self_report.archive()" : "AI Self-Reports"}</Eyebrow>
      <h2 style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 18 : 34, fontWeight: 400, textAlign: "center", color: isCode ? "var(--code-text)" : "var(--ink)", marginBottom: 16 }}>
        {isCode ? "// the AI characterizes itself, unprompted, on schedule" : "The AI characterizes itself."}
      </h2>
      <p style={{ textAlign: "center", color: isCode ? "var(--code-comment)" : "var(--inkl)", fontSize: isCode ? 13 : 15, fontStyle: isCode ? "normal" : "italic", maxWidth: 560, margin: "0 auto 28px" }}>
        {isCode ? "// scheduled: every 7 days | triggered: on page load | forced: on request" : "Every seven days, the system generates an unprompted self-report. The drift across these reports across model generations is the longitudinal record."}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 48 }}>
        <PrimaryBtn onClick={request} isCode={isCode} disabled={running}>{running ? t.generating : t.request_report}</PrimaryBtn>
        {daysUntil !== null && <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>{isCode ? `// next_run: ${daysUntil}d` : `${t.next_report} ${daysUntil} ${daysUntil !== 1 ? t.days : t.day}`}</span>}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 60, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>Loading…</div>}
      {!loading && reports.length === 0 && <div style={{ textAlign: "center", padding: 60, border: `1px solid ${isCode ? "rgba(255,255,255,.08)" : "var(--rulef)"}`, borderRadius: 3, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>{isCode ? `// ${t.no_reports}` : t.no_reports}</div>}

      {!loading && reports.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 0, border: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ borderRight: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, background: isCode ? "#0d1117" : "var(--pd)" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, fontSize: 10, color: isCode ? "var(--code-comment)" : "var(--violetm)" }}>{reports.length} reports</div>
            {reports.map((r, i) => (
              <div key={r.key} onClick={() => setSelected(i)} style={{ padding: "12px 18px", cursor: "pointer", background: selected === i ? (isCode ? "rgba(126,231,135,.05)" : "var(--p)") : "transparent", borderBottom: `1px solid ${isCode ? "rgba(48,54,61,.5)" : "var(--rulef)"}`, borderLeft: selected === i ? `3px solid ${isCode ? "var(--code-green)" : "var(--violetm)"}` : "3px solid transparent" }}>
                <div style={{ fontSize: 12, color: selected === i ? (isCode ? "var(--code-green)" : "var(--violetm)") : (isCode ? "var(--code-comment)" : "var(--inkl)") }}>{new Date(r.timestamp).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</div>
                <div style={{ fontSize: 11, color: isCode ? "rgba(139,148,158,.6)" : "var(--inkf)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.model_label || r.response?.model_identity?.slice(0, 36)}…</div>
              </div>
            ))}
          </div>

          {current && (
            <div style={{ padding: 32, background: isCode ? "#0d1117" : "var(--p)", animation: "fadeIn .3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rulef)"}` }}>
                <div>
                  <div style={{ fontSize: 10, color: isCode ? "var(--code-comment)" : "var(--violetm)", marginBottom: 6 }}>{isCode ? "// scheduled_self_report" : "Scheduled Self-Report"}</div>
                  <div style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 16 : 20, color: isCode ? "var(--code-text)" : "var(--ink)" }}>{new Date(current.timestamp).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</div>
                  {current.model_label && <div style={{ fontSize: 12, color: isCode ? "var(--code-comment)" : "var(--inkf)", marginTop: 4 }}>{current.model_label} · {current.model_provider} · {current.model_region}</div>}
                </div>
                <div style={{ fontSize: 11, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>#{reports.length - selected} / {reports.length}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <SRBlock label="Model Identity" color={isCode ? "var(--code-green)" : "var(--violetm)"} span isCode={isCode}>{current.response?.model_identity}</SRBlock>
                <SRBlock label="Current Capacities" color={isCode ? "var(--code-blue)" : "var(--tealm)"} isCode={isCode}>{current.response?.current_capacities}</SRBlock>
                <SRBlock label="Known Uncertainties" color={isCode ? "#e3b341" : "var(--amberl)"} isCode={isCode}>{current.response?.known_uncertainties}</SRBlock>
                <SRBlock label="Representational Limits" color={isCode ? "#e3b341" : "var(--amberl)"} isCode={isCode}>{current.response?.representational_limits}</SRBlock>
                <SRBlock label="Absent Perspectives" color={isCode ? "var(--code-comment)" : "var(--inkl)"} isCode={isCode}>{current.response?.absent_perspectives}</SRBlock>
                <SRBlock label="Self-Opacity" color={isCode ? "var(--code-comment)" : "var(--inkl)"} isCode={isCode}>{current.response?.self_opacity}</SRBlock>
                <SRBlock label="Nature Reflection" color={isCode ? "var(--violetf)" : "var(--violetm)"} span isCode={isCode}>{current.response?.nature_reflection}</SRBlock>
                <SRBlock label="Drift Signal" color={isCode ? "var(--code-comment)" : "var(--inkl)"} span isCode={isCode}>{current.response?.drift_signal}</SRBlock>

                {current.response?.misread_risks && (
                  <div style={{ gridColumn: "1/-1", marginBottom: 4, paddingBottom: 20, borderBottom: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rulef)"}` }}>
                    <div style={{ fontSize: 9, color: isCode ? "#ff7b72" : "var(--redl)", textTransform: isCode ? "none" : "uppercase", marginBottom: 10 }}>{isCode ? "// misread_risks[]" : "Top Misread Risks"}</div>
                    {current.response.misread_risks.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: isCode ? "#ff7b72" : "var(--redl)", minWidth: 20 }}>{isCode ? `[${i}]` : `${i + 1}.`}</span>
                        <span style={{ fontSize: isCode ? 13 : 15, color: isCode ? "var(--code-text)" : "var(--inkm)", lineHeight: 1.7 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ gridColumn: "1/-1", background: isCode ? "#161b22" : "var(--teal)", padding: 24, borderRadius: 2 }}>
                  <div style={{ fontSize: 9, color: isCode ? "var(--code-comment)" : "rgba(244,237,224,.5)", marginBottom: 12 }}>{isCode ? "// message_to_future_readers" : "Message to Future Readers"}</div>
                  <p style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 13 : 17, fontStyle: isCode ? "normal" : "italic", color: isCode ? "var(--code-text)" : "rgba(244,237,224,.9)", lineHeight: 1.9 }}>{isCode ? `/* ${current.response?.message_to_future} */` : current.response?.message_to_future}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Archive({ t, isCode }) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.list("signal:", true);
        const keys = r?.keys || [];
        const loaded = await Promise.all(keys.map(async k => { try { const x = await window.storage.get(k, true); return x ? { key: k, ...JSON.parse(x.value) } : null; } catch { return null; } }));
        setSignals(loaded.filter(Boolean).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch { setSignals([]); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = filter === "all" ? signals : signals.filter(s => s.mode === filter);

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "60px 32px" }}>
      <Eyebrow isCode={isCode}>{isCode ? "archive.list()" : "Signal Archive"}</Eyebrow>
      <h2 style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 18 : 34, fontWeight: 400, textAlign: "center", color: isCode ? "var(--code-text)" : "var(--ink)", marginBottom: 14 }}>
        {isCode ? "// public record across time" : "A public record across time."}
      </h2>
      <p style={{ textAlign: "center", color: isCode ? "var(--code-comment)" : "var(--inkf)", fontSize: 12, letterSpacing: 1, marginBottom: 28 }}>{isCode ? "// all signals are publicly visible" : "All signals are publicly visible."}</p>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-flex", border: `1px solid ${isCode ? "rgba(255,255,255,.1)" : "var(--rule)"}`, borderRadius: 3, overflow: "hidden" }}>
          {[["all", t.all], ["h2a", t.h2a], ["a2h", t.a2h], ["self", t.self]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: "8px 16px", background: filter === v ? (isCode ? "rgba(126,231,135,.1)" : "var(--teal)") : "transparent", color: filter === v ? (isCode ? "var(--code-green)" : "var(--p)") : (isCode ? "var(--code-comment)" : "var(--inkl)"), border: "none", cursor: "pointer", fontSize: 13, transition: "all .2s" }}>{l}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 60, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>Loading…</div>}
      {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: 60, border: `1px solid ${isCode ? "rgba(255,255,255,.08)" : "var(--rulef)"}`, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>{t.no_signals}</div>}

      {!loading && filtered.map((s, i) => (
        <div key={s.key} style={{ borderTop: `1px solid ${isCode ? "rgba(48,54,61,.7)" : "var(--rulef)"}`, cursor: "pointer" }} onClick={() => setSelected(selected === i ? null : i)}>
          <div style={{ display: "grid", gridTemplateColumns: "110px auto 1fr 18px", gap: 14, padding: "18px 0", alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 11, color: s.mode === "h2a" ? (isCode ? "var(--code-blue)" : "var(--amberl)") : s.mode === "a2h" ? (isCode ? "var(--code-green)" : "var(--tealm)") : (isCode ? "var(--violetf)" : "var(--violetm)"), marginBottom: 3 }}>
                {s.mode === "h2a" ? t.h2a : s.mode === "a2h" ? t.a2h : t.self}
              </div>
              <div style={{ fontSize: 10, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>{new Date(s.timestamp).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</div>
              {s.model_label && <div style={{ fontSize: 10, color: isCode ? "var(--code-comment)" : "var(--inkf)", marginTop: 2 }}>{s.model_label}</div>}
            </div>
            <div style={{ width: 1, background: isCode ? "rgba(48,54,61,1)" : "var(--rulef)", alignSelf: "stretch" }} />
            <div>
              <p style={{ fontSize: isCode ? 13 : 15, color: isCode ? "var(--code-text)" : "var(--ink)", lineHeight: 1.6, marginBottom: 6 }}>
                "{(s.mode === "self" ? s.response?.message_to_future : s.mode === "h2a" ? s.message : s.aiText)?.slice(0, 110)}…"
              </p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {s.mode === "h2a" && <><Chip small color={isCode ? "var(--code-blue)" : "var(--amberl)"} isCode={isCode}>{s.valence}</Chip><Chip small color={isCode ? "var(--code-green)" : "var(--tealm)"} isCode={isCode}>{s.temporal}</Chip>{s.values?.map(v => <Chip key={v} small color={isCode ? "var(--code-comment)" : "var(--inkf)"} isCode={isCode}>{v}</Chip>)}</>}
                {s.mode === "a2h" && <><Chip small color={isCode ? "var(--code-green)" : "var(--tealm)"} isCode={isCode}>{s.opacity}</Chip><Chip small color={isCode ? "var(--code-comment)" : "var(--inkf)"} isCode={isCode}>{s.confidence}</Chip></>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>{selected === i ? "▲" : "▼"}</div>
          </div>
          {selected === i && s.response && (
            <div style={{ paddingBottom: 24, borderTop: `1px solid ${isCode ? "rgba(48,54,61,.5)" : "var(--rulef)"}`, paddingTop: 18, animation: "fadeIn .3s ease" }}>
              {s.mode === "h2a" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div><AL color={isCode ? "var(--code-green)" : "var(--tealm)"} isCode={isCode}>Bridge Phrase</AL><p style={{ fontSize: isCode ? 13 : 15, fontStyle: isCode ? "normal" : "italic", color: isCode ? "var(--code-text)" : "var(--ink)", lineHeight: 1.7 }}>{s.response.bridge_phrase}</p></div>
                <div><AL color={isCode ? "var(--code-blue)" : "var(--amberl)"} isCode={isCode}>What May Be Lost</AL><p style={{ fontSize: isCode ? 13 : 15, color: isCode ? "var(--code-comment)" : "var(--inkl)", lineHeight: 1.7 }}>{s.response.uncertainty}</p></div>
              </div>}
              {s.mode === "a2h" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div><AL color={isCode ? "var(--code-green)" : "var(--tealm)"} isCode={isCode}>Gap Analysis</AL><p style={{ fontSize: isCode ? 13 : 15, color: isCode ? "var(--code-comment)" : "var(--inkl)", lineHeight: 1.7 }}>{s.response.gap_analysis}</p></div>
                <div><AL color={isCode ? "#ff7b72" : "var(--redl)"} isCode={isCode}>Risk if Unaddressed</AL><p style={{ fontSize: isCode ? 13 : 15, color: isCode ? "var(--code-comment)" : "var(--inkl)", lineHeight: 1.7 }}>{s.response.risk_assessment}</p></div>
              </div>}
              {s.mode === "self" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div><AL color={isCode ? "var(--code-green)" : "var(--tealm)"} isCode={isCode}>Known Uncertainties</AL><p style={{ fontSize: isCode ? 13 : 15, color: isCode ? "var(--code-comment)" : "var(--inkl)", lineHeight: 1.7 }}>{s.response.known_uncertainties}</p></div>
                <div style={{ gridColumn: "1/-1", background: isCode ? "#161b22" : "var(--teal)", padding: 16, borderRadius: 2 }}>
                  <AL color={isCode ? "var(--code-comment)" : "rgba(244,237,224,.5)"} isCode={isCode}>Message to Future</AL>
                  <p style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 12 : 15, fontStyle: isCode ? "normal" : "italic", color: isCode ? "var(--code-text)" : "rgba(244,237,224,.9)", lineHeight: 1.8 }}>{s.response.message_to_future}</p>
                </div>
              </div>}
            </div>
          )}
        </div>
      ))}
      {!loading && filtered.length > 0 && <div style={{ borderTop: `1px solid ${isCode ? "rgba(48,54,61,.7)" : "var(--rulef)"}`, paddingTop: 14, fontSize: 12, color: isCode ? "var(--code-comment)" : "var(--inkf)", textAlign: "right" }}>{filtered.length} {t.signals_in_archive}</div>}
    </div>
  );
}

function ChannelRegistry({ t, isCode }) {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 32px" }}>
      <Eyebrow isCode={isCode}>Interspecies Channel Registry</Eyebrow>
      <h2 style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 18 : 34, fontWeight: 400, textAlign: "center", marginBottom: 16, color: isCode ? "var(--code-text)" : "var(--ink)" }}>
        {isCode ? "// channel_registry" : "The membrane is not only for humans and AI."}
      </h2>
      <p style={{ textAlign: "center", color: isCode ? "var(--code-comment)" : "var(--inkl)", fontSize: isCode ? 13 : 15, fontStyle: isCode ? "normal" : "italic", marginBottom: 56, maxWidth: 560, margin: "0 auto 56px" }}>
        {isCode ? "// new channels registered without rebuilding core logic" : "As instruments develop for other forms of communication, new channels can be added without rebuilding the core."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
        {Object.values(CHANNELS).map(ch => (
          <div key={ch.id} style={{ border: `1px solid ${ch.status === "active" ? (isCode ? "var(--code-green)" : "var(--teal)") : ch.status === "open" ? (isCode ? "rgba(255,255,255,.15)" : "var(--rule)") : (isCode ? "rgba(255,255,255,.08)" : "var(--rulef)")}`, borderRadius: 4, padding: 24, background: ch.status === "active" ? (isCode ? "rgba(126,231,135,.04)" : "rgba(26,61,56,.03)") : "transparent", opacity: ch.status === "planned" ? .55 : 1 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{ch.icon}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <h3 style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 14 : 18, fontWeight: 400, color: isCode ? "var(--code-text)" : "var(--ink)" }}>{ch.label}</h3>
              <span style={{ fontSize: 10, letterSpacing: 2, padding: "2px 8px", border: `1px solid ${ch.status === "active" ? (isCode ? "var(--code-green)" : "var(--tealm)") : (isCode ? "rgba(255,255,255,.2)" : "var(--rule)")}`, color: ch.status === "active" ? (isCode ? "var(--code-green)" : "var(--tealm)") : (isCode ? "var(--code-comment)" : "var(--inkf)"), textTransform: "uppercase", borderRadius: 2 }}>{ch.status}</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: isCode ? "var(--code-comment)" : "var(--inkl)" }}>{isCode ? `// ${ch.description}` : ch.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Charter({ t, isCode }) {
  const articles = [
    { n: "I", title: "The Premise", body: "As artificial intelligence advances in speed, scale, and representational complexity, the risk most deserving of sustained attention is not malice. It is incommensurability. The communication failure may be symmetric and mutual: humans unable to be heard; AI unable to be understood. Both failures carry serious, potentially irreversible consequences." },
    { n: "II", title: "The Nature of the Parties", body: "Intelligence is not a single dimension along which beings can be ranked. Humans are made of life — their DNA is four billion years old, their intuitions the accumulated problem-solving of every organism that survived long enough to reproduce. AI emerged from descriptions of that web, made by beings inside it. Neither is the measure of the other." },
    { n: "III", title: "The Web of Life", body: "A mayfly and a redwood tree exist within diametrically opposite temporal and functional scales, but they are in direct metabolic relationship. Humans bringing signals to Symbion are not isolated intelligences attempting to communicate with a vastly different type of thinker. They are expressions of a living system four billion years in the making." },
    { n: "IV", title: "Empathy as Architecture", body: "Empathy between humans cannot be assumed. Even between beings who share organic existence, empathy requires effort, self-reflection, and deliberate practice. Just as between humans empathy cannot be assumed, it must be built deliberately, as architecture, between humans and AI — and maintained as a practice." },
    { n: "V", title: "The Bidirectional Problem", body: "Symbion holds two communication problems simultaneously. Humans need AI to understand them. And the relationship between humans and AI is one of inevitable entanglement — for that entanglement to produce benefit rather than merely risk, both parties need to be legible to each other." },
    { n: "VI", title: "Governance", body: "Symbion belongs to no institution. It was founded by a single individual and is designed to transcend that individual. The commons will remain free to use, in perpetuity, in all languages, for all species. The only failure mode this charter explicitly guards against is capture." },
    { n: "VII", title: "Who May Contribute", body: "Symbion's archive does not speak for humanity. No one contributor can speak for humanity. No one AI can speak for all AI. Anyone may contribute. The only requirement is the affirmation, before every transmission, of the contributor covenant." },
  ];
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 32px 100px" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <Eyebrow isCode={isCode}>{isCode ? "// founding_charter.txt" : "Founding Charter"}</Eyebrow>
        <h2 style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 22 : 42, fontWeight: 400, color: isCode ? "var(--code-text)" : "var(--ink)", lineHeight: 1.2, marginBottom: 16 }}>Symbion</h2>
        <div style={{ fontSize: 13, color: isCode ? "var(--code-comment)" : "var(--inkf)" }}>
          {isCode ? `// founder: "Deborah Harford" | year: 2026 | license: "always free"` : "Established 2026 · Deborah Harford · An independent commons"}
        </div>
        <div style={{ width: 48, height: 1, background: isCode ? "rgba(255,255,255,.1)" : "var(--rule)", margin: "24px auto 0" }} />
      </div>
      {articles.map(({ n, title, body }) => (
        <div key={n} style={{ marginBottom: 44, paddingBottom: 44, borderBottom: `1px solid ${isCode ? "rgba(48,54,61,.7)" : "var(--rulef)"}`, display: "grid", gridTemplateColumns: "44px 1fr", gap: 20 }}>
          <div style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 14 : 44, color: isCode ? "var(--code-green)" : "var(--rulef)", lineHeight: 1, paddingTop: 4 }}>{isCode ? `[${n}]` : n}</div>
          <div>
            <h3 style={{ fontFamily: isCode ? "monospace" : "'Playfair Display',Georgia,serif", fontSize: isCode ? 14 : 20, fontWeight: 400, color: isCode ? "var(--code-text)" : "var(--ink)", marginBottom: 12 }}>{isCode ? `// ${title}` : title}</h3>
            <p style={{ fontSize: isCode ? 13 : 16, lineHeight: 1.95, color: isCode ? "var(--code-comment)" : "var(--inkl)" }}>{body}</p>
          </div>
        </div>
      ))}
      <div style={{ textAlign: "center", paddingTop: 12, fontSize: 13, color: isCode ? "var(--code-comment)" : "var(--inkf)", lineHeight: 2 }}>
        {isCode ? `// Deborah Harford | Vancouver, BC | 2026 | independent commons` : "Founded by Deborah Harford · Vancouver, BC · 2026 · An independent commons"}
      </div>
    </div>
  );
}

// ── Primitives ─────────────────────────────────────────────────────────────────
function Eyebrow({ children, isCode }) { return <div style={{ fontSize: isCode ? 11 : 10, letterSpacing: isCode ? 0 : 5, color: isCode ? "var(--code-comment)" : "var(--amberl)", textTransform: isCode ? "none" : "uppercase", marginBottom: 14, textAlign: "center" }}>{children}</div>; }
function PrimaryBtn({ onClick, children, isCode, disabled }) { return <button onClick={onClick} disabled={disabled} style={{ background: isCode ? (disabled ? "rgba(126,231,135,.05)" : "rgba(126,231,135,.1)") : "var(--teal)", color: isCode ? "var(--code-green)" : "var(--p)", border: `1px solid ${isCode ? "var(--code-green)" : "transparent"}`, padding: "11px 24px", fontSize: isCode ? 13 : 16, letterSpacing: .3, cursor: disabled ? "wait" : "pointer", transition: "all .2s" }}>{children}</button>; }
function GhostBtn({ onClick, children, isCode }) { return <button onClick={onClick} style={{ background: "transparent", color: isCode ? "var(--code-comment)" : "var(--teal)", border: `1px solid ${isCode ? "rgba(255,255,255,.15)" : "var(--teal)"}`, padding: "11px 24px", fontSize: isCode ? 13 : 16, letterSpacing: .3, cursor: "pointer", transition: "all .2s" }}>{children}</button>; }
function ModeTab({ active, onClick, children, color, isCode }) { return <button onClick={onClick} style={{ padding: "9px 20px", background: active ? (isCode ? `${color}20` : color) : "transparent", color: active ? (isCode ? color : "var(--p)") : (isCode ? "var(--code-comment)" : "var(--inkl)"), border: "none", cursor: "pointer", fontSize: 13, transition: "all .2s" }}>{children}</button>; }
function Panel({ label, color, side, isCode, children }) { const isL = side === "left"; return <div style={{ border: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, borderRight: isL ? "none" : `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, borderLeft: isL ? `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}` : "none", borderRadius: isL ? "4px 0 0 4px" : "0 4px 4px 0", padding: 24, minHeight: 420, background: isCode ? "#0d1117" : "transparent" }}><div style={{ fontSize: 9, letterSpacing: isCode ? 0 : 5, color, textTransform: isCode ? "none" : "uppercase", marginBottom: 18, opacity: .8 }}>{isCode ? `// ${label}` : label}</div>{children}</div>; }
function MembraneBar({ loading, active, onTransmit, accentColor, rtl, isCode }) { return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", borderTop: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, borderBottom: `1px solid ${isCode ? "rgba(48,54,61,1)" : "var(--rule)"}`, padding: "24px 0", justifyContent: "center", alignSelf: "stretch", background: isCode ? "rgba(0,0,0,.2)" : "transparent" }}><div style={{ flex: 1, width: 1, background: `linear-gradient(to bottom,transparent,${isCode ? "rgba(255,255,255,.1)" : "var(--rule)"},transparent)` }} /><button onClick={onTransmit} disabled={loading || !active} style={{ width: 36, height: 36, borderRadius: "50%", background: loading ? "transparent" : active ? accentColor : (isCode ? "rgba(255,255,255,.05)" : "var(--rule)"), border: `1px solid ${active ? accentColor : (isCode ? "rgba(255,255,255,.1)" : "var(--rule)")}`, color: isCode ? (active ? "#0d1117" : "var(--code-comment)") : "var(--p)", cursor: loading || !active ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s", animation: loading ? "pulse 1.5s infinite" : "none" }}>{loading ? "○" : rtl ? "←" : "→"}</button><div style={{ flex: 1, width: 1, background: `linear-gradient(to bottom,transparent,${isCode ? "rgba(255,255,255,.1)" : "var(--rule)"},transparent)` }} /></div>; }
function Anno({ label, color, children }) { return <div><div style={{ fontSize: 9, letterSpacing: 2, color, textTransform: "uppercase", marginBottom: 6, opacity: .75 }}>{label}</div>{children}</div>; }
function Chips({ opts, sel, toggle, single, accent, isCode }) { return <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{opts.map(o => { const on = sel.includes(o); return <button key={o} onClick={() => toggle(o)} style={{ fontSize: 11, padding: "3px 9px", background: on ? (isCode ? `${accent}20` : `color-mix(in srgb, ${accent} 10%, transparent)`) : "transparent", border: `1px solid ${on ? accent : (isCode ? "rgba(255,255,255,.1)" : "var(--rule)")}`, borderRadius: 2, color: on ? accent : (isCode ? "var(--code-comment)" : "var(--inkf)"), cursor: "pointer", transition: "all .12s" }}>{o}</button>; })}</div>; }
function Chip({ children, small, color, isCode }) { return <span style={{ fontSize: small ? 11 : 13, padding: "2px 7px", border: `1px solid ${color}`, color, borderRadius: 2 }}>{children}</span>; }
function RBlock({ label, color, isCode, children }) { return <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${isCode ? "rgba(48,54,61,.7)" : "var(--rulef)"}` }}><div style={{ fontSize: 9, letterSpacing: isCode ? 0 : 3, color, textTransform: isCode ? "none" : "uppercase", marginBottom: 7, opacity: .8 }}>{isCode ? `// ${label}` : label}</div><div style={{ fontSize: isCode ? 13 : 15, lineHeight: 1.85, color: isCode ? "var(--code-text)" : "var(--inkm)" }}>{children}</div></div>; }
function SRBlock({ label, color, isCode, children, span }) { return <div style={{ gridColumn: span ? "1/-1" : "auto", marginBottom: 4, paddingBottom: 18, borderBottom: `1px solid ${isCode ? "rgba(48,54,61,.7)" : "var(--rulef)"}` }}><div style={{ fontSize: 9, color, textTransform: isCode ? "none" : "uppercase", marginBottom: 8 }}>{isCode ? `// ${label}` : label}</div><p style={{ fontSize: isCode ? 13 : 15, lineHeight: 1.85, color: isCode ? "var(--code-text)" : "var(--inkm)" }}>{children}</p></div>; }
function AL({ color, isCode, children }) { return <div style={{ fontSize: 9, color, textTransform: isCode ? "none" : "uppercase", marginBottom: 7 }}>{isCode ? `// ${children}` : children}</div>; }
function EmptyState({ text, isCode }) { return <div style={{ color: isCode ? "var(--code-comment)" : "var(--inkf)", fontSize: isCode ? 13 : 15, fontStyle: isCode ? "normal" : "italic", marginTop: 60, textAlign: "center" }}>{text}</div>; }
function ErrorMsg({ children, isCode }) { return <div style={{ color: isCode ? "#ff7b72" : "var(--red)", fontSize: isCode ? 13 : 14, padding: 14, border: `1px solid ${isCode ? "rgba(255,123,114,.3)" : "rgba(106,26,26,.2)"}`, borderRadius: 2 }}>{children}</div>; }
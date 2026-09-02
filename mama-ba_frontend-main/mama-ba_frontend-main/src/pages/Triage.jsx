import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLang, stopSpeech } from "../context/LanguageContext.jsx";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Volume2,
  Square,
  AlertTriangle,
  PhoneCall,
  Mic,
  HelpCircle,
  ShieldCheck,
  Baby,
  HeartPulse,
  Apple,
  CalendarCheck,
} from "lucide-react";

// ── Categories ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",        label: { en: "All Questions",  twi: "Nsɛmmisa Nyinaa" }, icon: HelpCircle },
  { id: "danger",     label: { en: "Danger Signs",    twi: "Ɔhaw & Nhyiamu" },   icon: AlertTriangle },
  { id: "symptoms",   label: { en: "Symptoms",       twi: "Nyinsɛn Nkae" },    icon: HeartPulse },
  { id: "nutrition",  label: { en: "Nutrition & Diet",twi: "Aduane Pa" },       icon: Apple },
  { id: "anc",        label: { en: "ANC & Hospital",  twi: "Ayaresabea Nhwɛ" }, icon: CalendarCheck },
  { id: "labour",     label: { en: "Labour & Birth",  twi: "Awoɔ Siesie" },     icon: ShieldCheck },
  { id: "postpartum", label: { en: "Baby & Postpartum",twi: "Abofra & Awoɔ Akyi"},icon: Baby },
];

// ── Ghana Maternal Health Twi-English Q&A Knowledge Base ────────────────────
// Sourced & formatted from the Ghana AI Research Network Maternal Health Dataset & GHS/WHO Protocols
const FAQ_DATA = [
  // ── 1. DANGER SIGNS & EMERGENCIES ──
  {
    id: "danger-bleeding",
    category: "danger",
    urgency: "high",
    qEn: "What should I do if I notice vaginal bleeding during pregnancy?",
    qTwi: "Sɛ mehunu mogya a ɛretu wɔ me baa-fa mu bere a meyem a, dɛn na menyɛ?",
    aEn: "Vaginal bleeding at any point in pregnancy is an obstetric emergency. Put on a clean sanitary pad, do not insert anything into your vagina, and go to the nearest hospital or health centre immediately. It could indicate placental complications, miscarriage risk, or ectopic pregnancy.",
    aTwi: "Mogya a ɛretu wɔ nyinsɛn mu biara yɛ ɔhaw kɛseɛ. Fa mpaapaa kronkron kata ho, mfa ade biara nhyɛ wo baa-fa mu, na kɔ ayaresabea a ɛbɛn wo ntɛm ara. Ebetumi akyerɛ sɛ ahaw bi aka wo ba no anaa wo yafunu no.",
    tags: ["bleeding", "emergency", "placenta", "mogya", "clinic"],
  },
  {
    id: "danger-preeclampsia",
    category: "danger",
    urgency: "high",
    qEn: "What are the danger signs of Pre-eclampsia and high blood pressure?",
    qTwi: "Pre-eclampsia ne mogya mmoroso ho nsɛnkyerɛnneɛ bɔne no ne sɛn?",
    aEn: "Severe persistent headaches, sudden puffiness or swelling in your face and hands, blurred vision or seeing flashing lights, and sharp pain under your right ribs. If you notice any of these, check your blood pressure at a clinic immediately, as pre-eclampsia can progress to life-threatening seizures.",
    aTwi: "Tiyaw kɛseɛ a engyae, wo nsa ne wo anim a abɔ ntonton prɛko pɛ, w'ani a ayɛ kusuu anaa wuhu hann a ɛrepirepere, ne yaw kɛseɛ wɔ wo nfe nifa so. Sɛ wohunu eyinom bi a, kɔ ayaresabea ntɛm ma wɔnsɔ wo mogya tumi nhwɛ.",
    tags: ["headache", "preeclampsia", "blood pressure", "swelling", "vision", "tiawa"],
  },
  {
    id: "danger-movement",
    category: "danger",
    urgency: "high",
    qEn: "Why has my baby stopped kicking or moving as frequently?",
    qTwi: "Adɛn nti na me ba no nnyigye anaa ɔnhinhim wɔ me yam sɛnea ɔtaa yɛ no?",
    aEn: "From 24-28 weeks onwards, you should feel regular baby movements daily. If your baby moves significantly less or stops kicking, drink a cold glass of water, lie on your left side, and count movements. If there are fewer than 10 kicks within 2 hours, go to the maternity ward immediately.",
    aTwi: "Efi abosome 6 kɔsi awoɔ no, ɛsɛ sɛ wote abofra no ho da biara. Sɛ ɔnhinhim a, nom nsuonwunu, da wo benkum so na kan ne nhinhim. Sɛ ɔnhinhim bɔ mprɛn 10 nnɔnhwerew 2 mu a, kɔ ayaresabea ntɛm ara.",
    tags: ["kicking", "baby movement", "fetal kicks", "nhinhim"],
  },
  {
    id: "danger-fever",
    category: "danger",
    urgency: "high",
    qEn: "Is a high fever and shivering dangerous during pregnancy?",
    qTwi: "Hye kɛseɛ ne awɔw a ɛbɔ obi wɔ nyinsɛn mu no yɛ asiane anaa?",
    aEn: "Yes. High fever in Ghana is most commonly caused by malaria, urinary tract infections, or respiratory illness. High maternal body temperature can distress the fetus and trigger preterm labour. Visit a health facility for rapid diagnostic testing and safe antimalarial treatment.",
    aTwi: "Aane, ɛyɛ asiane. Hye kɛseɛ wɔ Ghana ha taa firi asoma (malaria) anaa dwonsɔ mu yadeɛ. Hye a ano yɛ den betumi aha abofra no na ama awoɔ aba ntɛm. Kɔ ayaresabea ma wɔnyɛ sɔhwɛ na wɔmma wo aduro pa.",
    tags: ["fever", "malaria", "shivering", "chills", "asoma", "hye"],
  },

  // ── 2. DAILY SYMPTOMS & BODY CHANGES ──
  {
    id: "sym-nausea",
    category: "symptoms",
    urgency: "medium",
    qEn: "How can I manage severe morning sickness and nausea in early pregnancy?",
    qTwi: "Mɛyɛ dɛn na matumi ateetee anɔpa feefe ne afuahu ano wɔ nyinsɛn mfitiaseɛ?",
    aEn: "Eat small, frequent meals rather than large heavy dishes. Keep dry biscuits or toasted bread near your bed to nibble before getting up. Sip fresh ginger tea, stay hydrated with small sips of water, and avoid greasy, strong-smelling foods.",
    aTwi: "Di aduane ketekete mprenpren sen sɛ wobedi aduane pii prɛko pɛ. Fa biskete anaa paanoo a ayo to wo nkyɛn na we kakra ansa na woasɔre. Nom akekaduro tii, na kwati nnoɔma a ngo ne hua yɛ den.",
    tags: ["morning sickness", "nausea", "vomiting", "ginger", "feefe"],
  },
  {
    id: "sym-heartburn",
    category: "symptoms",
    urgency: "low",
    qEn: "What causes severe heartburn and how can I soothe it?",
    qTwi: "Dɛn na ɛde akoma mu yaw ne koma hyehe ba, na mɛyɛ dɛn asiesie?",
    aEn: "Pregnancy hormones relax the valve between your stomach and esophagus, and the growing uterus pushes stomach acid upward. Avoid lying down immediately after eating, eat your last meal at least 2 hours before bed, avoid spicy fried foods, and prop your head up with pillows.",
    aTwi: "Nyinsɛn hormones ma akoma ano brɛkɔ na abofra a ɔrenyin no pia yafunu nsuo kɔ soro. Mda ntɛm bere a woadidi awie no, gye nnɔnhwerew 2 ntam, na kwati aduane a mako ne ngo wɔ mu pii.",
    tags: ["heartburn", "acid reflux", "indigestion", "koma hyehe"],
  },
  {
    id: "sym-swollen-feet",
    category: "symptoms",
    urgency: "low",
    qEn: "Are swollen feet normal and how can I get relief?",
    qTwi: "Nan a abɔ ntonton wɔ nyinsɛn mu no yɛ ade a ɛtaa ba anaa, na mɛyɛ dɛn ahoame?",
    aEn: "Mild ankle and foot swelling in the evening is common due to fluid retention and uterine pressure on veins. Elevate your feet whenever seated, avoid standing in one place for long periods, wear comfortable flat footwear, and drink plenty of water. However, if face or hands swell suddenly, report to a clinic.",
    aTwi: "Nan a ɛbɔ ntonton anwummere no taa ba esiane nsuo a ɛdɔɔso nti. Ma wo nan so bere a wote fam, kwati gyinagyina tenten, hyɛ mpaboa a ɛyɛ bɔkɔɔ, na nom nsuo pii. Sɛ anim anaa nsa nso bɔ a, kɔ ayaresabea.",
    tags: ["swollen feet", "edema", "legs", "nan ntonton"],
  },
  {
    id: "sym-discharge",
    category: "symptoms",
    urgency: "medium",
    qEn: "How do I know if vaginal discharge is normal or an infection?",
    qTwi: "Mɛyɛ dɛn ahunu sɛ nsuo fitaa a ɛpue me baa-fa mu no yɛ normal anaa yadeɛ?",
    aEn: "Thin, milky white, odorless discharge (leukorrhea) is normal in pregnancy. If the discharge turns yellowish-green, thick like curdled milk, has a foul fishy smell, or is accompanied by itching or burning when urinating, visit the clinic for treatment.",
    aTwi: "Nsuo fitaa a ɛho nhua a ɛpue kakra no yɛ normal wɔ nyinsɛn mu. Nanso sɛ ɛdan ahaban-mono, ɛyɛ kusuu sɛ nufusu a asɛe, ɛbɔ hua bɔne, anaa ɛrehe wo na edwonsɔ a ɛrewɔ wo a, kɔ ayaresabea ma wɔnhwɛ.",
    tags: ["discharge", "infection", "itching", "leukorrhea", "nsuo fitaa"],
  },

  // ── 3. NUTRITION & DIET ──
  {
    id: "nut-blood-foods",
    category: "nutrition",
    urgency: "low",
    qEn: "Which Ghanaian foods boost blood count and prevent anaemia?",
    qTwi: "Ghana aduane bɛn na ɛma mogya dɔɔso na ɛbɔ maame ho ban firi mogya ketewa ho?",
    aEn: "Dark green leafy vegetables like Kontomire (cocoyam leaves), Moringa, and Gboma; animal proteins such as eggs, liver, fish, and lean meat; beans, cowpeas, and fortified cereals. Pair green vegetables with citrus fruits (oranges, lemons) to enhance iron absorption.",
    aTwi: "Ahaban mono te sɛ Kontomire, Moringa, ne Gboma; nnam, nkesua, mpatuo, bɔre (liver); adua ne aboboi. Di ahaban no ne ankaa anaa akekaduro a ɛma wo nipadua twetwe iron no kɔ mu yie.",
    tags: ["iron", "anaemia", "kontomire", "moringa", "blood", "mogya"],
  },
  {
    id: "nut-ayilo",
    category: "nutrition",
    urgency: "medium",
    qEn: "Is eating white clay (Ayilo / Shile / Kalaba) safe during pregnancy?",
    qTwi: "Ayilo anaa Shile a wodi wɔ nyinsɛn mu no yɛ pa ma apomuden anaa?",
    aEn: "No. Eating clay (geophagia) can introduce heavy metals like lead and arsenic, harmful parasites, and bacteria. It also binds to dietary iron in your gut, leading to severe maternal anaemia and poor fetal growth. If you crave clay, inform your midwife — it usually signals an iron deficiency.",
    aTwi: "Dabi, ɛnyɛ pa koraa. Ayilo weɛ tumi de ewim nnuan bɔne, mmoawa, ne lead ba wo nipadua mu. Ɛsɛe iron a ɛwɔ wo yam no na ɛma mogya sa wo ntɛm. Sɛ wo kɔn dɔ ayilo a, ka kyerɛ wo nɛɛse na ɔmma wo iron nnuro.",
    tags: ["ayilo", "shile", "clay", "pica", "geophagia"],
  },
  {
    id: "nut-water",
    category: "nutrition",
    urgency: "low",
    qEn: "How much water should a pregnant woman drink daily in our warm climate?",
    qTwi: "Nsuo kuruwa ahe na ɛsɛ sɛ obaa a ɔyem nom da biara wɔ Ghana wim tebea mu?",
    aEn: "Aim for at least 2.5 to 3 liters (around 8 to 10 large glasses or 5-6 sachet water bags) daily. Adequate hydration supports amniotic fluid production, helps digestion, reduces constipation, and prevents urinary tract infections.",
    aTwi: "Bɔ mmɔden nom bɛyɛ nsuo kuruwa 8 kɔsi 10 (anaa pure water sachet 5 kɔsi 6) da biara. Ɛboa ma abofra no nsuo a ɔte mu no yɛ pɛ, ɛma yafunu yam aduane yie, na ɛsi dwonsɔ mu yadeɛ ano kwan.",
    tags: ["water", "hydration", "sachet water", "nsuo"],
  },

  // ── 4. ANTENATAL CARE (ANC) & CLINIC VISITS ──
  {
    id: "anc-visits-ghs",
    category: "anc",
    urgency: "low",
    qEn: "How many ANC visits should I attend according to Ghana Health Service?",
    qTwi: "GHS nhyehyɛeɛ kyerɛ sɛ ANC nhwɛ ahe na ɛsɛ sɛ mekɔ wɔ me nyinsɛn mu?",
    aEn: "The Ghana Health Service follows WHO recommendations of a minimum of 8 antenatal care contacts. The first visit should happen within the first 12 weeks of pregnancy. Regular visits ensure early detection of high blood pressure, anaemia, gestational diabetes, and fetal growth monitoring.",
    aTwi: "GHS hyɛ sɛ maame biara nkɔ ANC nhwɛ mprɛn 8 anaa nea ɛboro saa. Nhwɛ a edi kan no ɛsɛ sɛ ɛba ansa na abosome 3 reba awiei. Ɛboa ma wɔhunu mogya mmoroso, asoma, ne abofra no apomuden ntɛm.",
    tags: ["anc", "ghs", "visits", "antenatal", "nhwɛ"],
  },
  {
    id: "anc-iptp",
    category: "anc",
    urgency: "medium",
    qEn: "Why is SP (Fansidar) given during ANC and is it safe for my baby?",
    qTwi: "Adɛn nti na wɔde SP (Fansidar) ma wɔ ANC na ɛyɛ ma me ba no anaa?",
    aEn: "Sulfadoxine-Pyrimethamine (SP/Fansidar) is given as Intermittent Preventive Treatment in pregnancy (IPTp) starting from the 16th week. It clears silent malaria parasites from the placenta, protecting your baby from low birth weight, premature birth, and severe maternal anaemia.",
    aTwi: "Wɔde SP (Fansidar) ma efi abosome 4 kɔsi awoɔ sɛnea ɛbɛsi asoma ano kwan wɔ awotwaa no mu. Ɛbɔ abofra no ho ban na wannya duru ketewa anaa wamfa awoɔ ntɛm.",
    tags: ["iptp", "fansidar", "sp", "malaria prevention", "asoma aduro"],
  },
  {
    id: "anc-tt",
    category: "anc",
    urgency: "low",
    qEn: "What is the purpose of Tetanus Toxoid vaccination during pregnancy?",
    qTwi: "Mfasoɔ bɛn na ɛwɔ Tetanus aduro a wɔde bɔ maame a ɔyem no so?",
    aEn: "Tetanus Toxoid (TT/Td) vaccination protects both mother and newborn baby against neonatal tetanus — a dangerous infection that can enter through the umbilical cord at birth. GHS provides at least two doses during pregnancy.",
    aTwi: "Tetanus paneɛ no bɔ maame ne abofra no foforo ho ban firi mmoawa bɔne a etumi fa funuma mu bere a wɔrewo no no ho. GHS hyɛ sɛ wobɛgye mprɛn mmienu anaa nea ɛboro saa.",
    tags: ["tetanus", "vaccine", "tt", "paneɛ"],
  },

  // ── 5. LABOUR & DELIVERY ──
  {
    id: "labour-true-signs",
    category: "labour",
    urgency: "high",
    qEn: "How do I distinguish true labour contractions from false Braxton Hicks?",
    qTwi: "Mɛyɛ dɛn ahunu awoɔ yaw ankasa ne yafunu twetwe a ɛyɛ hunu ntam?",
    aEn: "True labour contractions occur at regular intervals, become increasingly stronger, last longer (30-70 seconds), and do not go away when you walk or rest. False contractions (Braxton Hicks) are irregular, do not intensify, and often ease when changing positions or drinking water.",
    aTwi: "Awoɔ yaw ankasa ba bere pɔtee biara, emu yɛ den dɔɔso, na ɛnnyae bere a wonante anaa wohome. Yafunu twetwe hunu no ba bere biara na ɛtumi gyae bere a wonom nsuo anaa wosesa wo nna.",
    tags: ["labour", "contractions", "braxton hicks", "awoɔ yaw"],
  },
  {
    id: "labour-water-broke",
    category: "labour",
    urgency: "high",
    qEn: "What should I do if my water breaks at home?",
    qTwi: "Sɛ me yafunu nsuo no tete wɔ fie a, dɛn na ɛsɛ sɛ meyɛ ntɛm ara?",
    aEn: "Note the time and the color of the fluid (clear, pinkish, or greenish/brownish). Place a clean sanitary pad, do not take a bath or insert tampons, and proceed immediately to your designated delivery facility. Greenish water indicates the baby may have passed meconium and needs urgent care.",
    aTwi: "Hwɛ bere a ɛtetee ne nsuo no kɔla (ɛfitaa, kɔkɔɔ, anaa ahaban-mono). Fa mpaapaa kronkron kata ho, mfa ade biara nhyɛ mu, na kɔ ayaresabea ntɛm ara. Sɛ nsuo no yɛ ahaban-mono a, ɛkyerɛ sɛ abofra no agye fi na ehia mmoa ntɛm.",
    tags: ["water breaking", "amniotic fluid", "meconium", "nsuo tete"],
  },
  {
    id: "labour-bag",
    category: "labour",
    urgency: "low",
    qEn: "What items should I pack in my hospital delivery bag in Ghana?",
    qTwi: "Nneɛma bɛn na ɛsɛ sɛ mede gu me paache mu kɔ ayaresabea kɔwo?",
    aEn: "Maternal Health Record Book (Pink Book), clean cloth/kente wraps, sanitary maternity pads, baby clothes, receiving blankets, soap, bucket, methylated spirit/chlorhexidine, cotton wool, clean towels, and NHIS/health insurance cards.",
    aTwi: "Wo Pink Book (Apomuden Nhoma), ntama pa, maternity pads, abofra ntaade ne nkatasoɔ, samina, bɔkiti, spirit/chlorhexidine, kotin, ne wo NHIS kaad.",
    tags: ["delivery bag", "pink book", "maternity bag", "nneɛma"],
  },

  // ── 6. BABY & POSTPARTUM CARE ──
  {
    id: "post-bleeding",
    category: "postpartum",
    urgency: "high",
    qEn: "What is normal postpartum bleeding (lochia) and when is it dangerous?",
    qTwi: "Mogya a ɛba awoɔ akyi no, ɛhe na ɛyɛ normal na ɛhe na ɛyɛ ɔhaw kɛseɛ?",
    aEn: "Red bleeding that gradually turns pink, brown, and yellowish-white over 2 to 6 weeks is normal. It is DANGEROUS if you soak more than one large sanitary pad within an hour, pass large blood clots bigger than a golf ball, feel dizzy or faint. This is postpartum haemorrhage and requires immediate emergency care.",
    aTwi: "Mogya kɔkɔɔ a ɛbrɛ kɔ fam kɔsi ahaban/fitaa wɔ abosome 1 mu no yɛ normal. Nanso sɛ mogya no pue dodo ma pad ayɛ ma dɔnhwerew 1 mu, anaa mogya sin akɛseɛ pue a, kɔ ayaresabea ntɛm efisɛ ebetumi ama wo abotɔ.",
    tags: ["postpartum bleeding", "lochia", "haemorrhage", "awoɔ akyi mogya"],
  },
  {
    id: "post-breastfeeding",
    category: "postpartum",
    urgency: "low",
    qEn: "Why is exclusive breastfeeding recommended for the first 6 months?",
    qTwi: "Adɛn nti na GHS hyɛ sɛ wɔmma abofra nufusu nkutoo abosome 6 a nsuo mpo nka ho?",
    aEn: "Breast milk contains complete nutrition, natural hydration (over 80% water), and powerful maternal antibodies that protect the baby from diarrhea, pneumonia, and infections. Giving water, glucose, or infant teas before 6 months introduces contamination risks and reduces milk supply.",
    aTwi: "Nufusu wɔ aduane ne nsuo nyinaa a abofra hia, ne ahoɔden a ɛbɔ no ho ban firi yafunu yadeɛ ne ahurututu ho. Sɛ woma no nsuo anaa tii ansa na abosome 6 adu a, ebetumi de mmoawa aba ne yam.",
    tags: ["breastfeeding", "exclusive breastfeeding", "nufusu", "abofra"],
  },
  {
    id: "post-cord-care",
    category: "postpartum",
    urgency: "medium",
    qEn: "How should I care for my newborn's umbilical cord stump?",
    qTwi: "Mɛyɛ dɛn ahwɛ me ba foforo funuma so yie na anka yadeɛ?",
    aEn: "Apply 7.1% Chlorhexidine digluconate gel/liquid daily as recommended by GHS until the cord separates naturally (usually 5-10 days). Keep it clean and dry. NEVER apply cow dung, sand, charcoal, herbs, or saliva, as these cause lethal neonatal tetanus.",
    aTwi: "Fa Chlorhexidine aduro a ayaresabea de maa wo no sra funuma no so da biara kɔsi sɛ ɛbɛtew ne ho. Ma ho nteew. Mfa dɔteɛ, gyabidie, afifide anaa ntasuo nsra so koraa efisɛ ebetumi de tetanus aba.",
    tags: ["cord care", "chlorhexidine", "umbilical cord", "funuma"],
  },
  {
    id: "post-jaundice",
    category: "postpartum",
    urgency: "medium",
    qEn: "What should I do if my baby's eyes and skin look yellowish (Jaundice)?",
    qTwi: "Sɛ me ba no aniwa anaa ne honam ayɛ akokɔsradeɛ/kɔkɔɔ a, dɛn na menyɛ?",
    aEn: "Neonatal jaundice happens when bilirubin builds up in the newborn's blood. Take the baby to the hospital or clinic for assessment and phototherapy if needed. Do NOT rely only on morning sun or herbal baths for severe jaundice, as very high bilirubin can affect brain development.",
    aTwi: "Eyinom firi bilirubin a ɛdɔɔso wɔ abofra no mogya mu. Fa no kɔ ayaresabea ntɛm ma dɔkota nhwɛ no na wɔmfa hann a ɛfata nsa no yadeɛ. Mfa afifide nsuo ngu no so kwa.",
    tags: ["jaundice", "yellow eyes", "bilirubin", "aniwa kɔkɔɔ"],
  },
];

let activeFaqUtterance = null;

function speakFaqText(text, langCode, audioId, onStart, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  stopSpeech();
  activeFaqUtterance = null;

  const utt = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices() || [];

  if (langCode === "twi") {
    const twiVoice =
      voices.find((v) => v.lang.includes("ak") || v.lang.includes("tw")) ||
      voices.find((v) => v.lang.includes("en-GH") || v.lang.includes("en-NG")) ||
      voices.find((v) => v.lang.includes("en-GB") && v.name.toLowerCase().includes("female")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (twiVoice) utt.voice = twiVoice;
    utt.lang = twiVoice?.lang || "en-GB";
  } else {
    const engVoice =
      voices.find((v) => v.lang.includes("en-GH") || v.lang.includes("en-NG")) ||
      voices.find((v) => v.lang.includes("en-GB")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (engVoice) utt.voice = engVoice;
    utt.lang = engVoice?.lang || "en-US";
  }

  utt.rate = 0.92;
  utt.pitch = 1.05;

  utt.onstart = () => {
    if (onStart) onStart(audioId);
  };
  utt.onend = () => {
    activeFaqUtterance = null;
    if (onEnd) onEnd();
  };
  utt.onerror = () => {
    activeFaqUtterance = null;
    if (onEnd) onEnd();
  };

  activeFaqUtterance = utt;
  window.speechSynthesis.speak(utt);
}

export default function Triage() {
  const { lang, voiceLang } = useLang();

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery]       = useState("");
  const [expandedId, setExpandedId]         = useState(FAQ_DATA[0]?.id || null);
  const [playingAudioId, setPlayingAudioId] = useState(null);

  // Stop any playing speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      activeFaqUtterance = null;
    };
  }, []);

  const handleToggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const handleToggleAudio = (faq, langCode, e) => {
    if (e) e.stopPropagation();
    const audioKey = `${faq.id}-${langCode}`;

    if (playingAudioId === audioKey) {
      stopSpeech();
      setPlayingAudioId(null);
    } else {
      const textToSpeak =
        langCode === "twi"
          ? `${faq.qTwi}. ${faq.aTwi}`
          : `${faq.qEn}. ${faq.aEn}`;

      speakFaqText(
        textToSpeak,
        langCode,
        audioKey,
        (id) => setPlayingAudioId(id),
        () => setPlayingAudioId(null)
      );
    }
  };

  // Filtering
  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesSearch =
      item.qEn.toLowerCase().includes(q) ||
      item.qTwi.toLowerCase().includes(q) ||
      item.aEn.toLowerCase().includes(q) ||
      item.aTwi.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="px-4 py-6 md:px-6 max-w-lg mx-auto flex flex-col gap-5 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h1 className="font-headline text-headline-md text-on-background">
            {lang === "twi" ? "Maternal Health Nsɛmmisa (FAQs)" : "Maternal Health FAQs"}
          </h1>
        </div>
        <p className="text-on-surface-variant text-sm">
          {lang === "twi"
            ? "Nyinsɛn, awoɔ, aduane ne abofra nhwɛ ho nsɛmmisa a GHS ne WHO agye atom."
            : "Trusted answers to pregnancy, labour, nutrition, and baby care questions grounded in GHS & WHO protocols."}
        </p>
      </div>

      {/* Emergency Warning Banner */}
      <div className="bg-error-container/30 border border-error/25 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-error uppercase tracking-wider">
              {lang === "twi" ? "Ɔhaw Kɛseɛ Wɔ Nyinsɛn Mu?" : "Obstetric Emergency?"}
            </p>
            <p className="text-xs text-on-surface leading-tight mt-0.5">
              {lang === "twi"
                ? "Sɛ mogya dɔɔso retu anaa wo yafunu yaw a, kɔ ayaresabea ntɛm."
                : "Heavy bleeding, severe headaches, or water breaking early require immediate emergency care."}
            </p>
          </div>
        </div>
        <a
          href="tel:112"
          className="px-3 py-2 bg-error text-on-error rounded-xl text-xs font-bold shadow-sm hover:bg-error/90 transition-colors shrink-0 flex items-center gap-1"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Call 112</span>
        </a>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            lang === "twi"
              ? "Hwehwɛ asɛmmisa biara (e.g. Mogya, Kontomire, Tetanus, Feefe)..."
              : "Search any question (e.g. bleeding, nutrition, iron, labour, jaundice)..."
          }
          className="w-full h-12 pl-10 pr-4 rounded-2xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm"
        />
      </div>

      {/* Category Pills Slider */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isSelected = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                isSelected
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{lang === "twi" ? c.label.twi : c.label.en}</span>
            </button>
          );
        })}
      </div>

      {/* Questions Count Indicator */}
      <div className="flex items-center justify-between text-xs text-on-surface-variant px-1">
        <span>
          {filteredFaqs.length} {lang === "twi" ? "nsɛmmisa a wɔahyehyɛ" : "maternal questions available"}
        </span>
        <Link
          to="/app/ask"
          className="text-primary font-semibold hover:underline flex items-center gap-1"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{lang === "twi" ? "Bisa wo deɛ (Ask Custom)" : "Ask Your Own Question"}</span>
        </Link>
      </div>

      {/* FAQ Accordion List */}
      <div className="flex flex-col gap-3">
        {filteredFaqs.map((faq) => {
          const isExpanded = expandedId === faq.id;
          const isTwiPlaying = playingAudioId === `${faq.id}-twi`;
          const isEnPlaying  = playingAudioId === `${faq.id}-en`;

          return (
            <div
              key={faq.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? "bg-surface-container-lowest border-primary shadow-sm"
                  : "bg-surface-container-lowest border-outline-variant hover:border-primary/40"
              }`}
            >
              {/* Question Header */}
              <button
                type="button"
                onClick={() => handleToggleExpand(faq.id)}
                className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="flex-1">
                  {faq.urgency === "high" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-error mb-1.5 border border-error/30">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {lang === "twi" ? "ƆHAW KƐSEƐ (URGENT)" : "DANGER SIGN / URGENT"}
                    </span>
                  )}
                  <h2 className="font-headline font-bold text-sm text-on-surface leading-snug">
                    {lang === "twi" ? faq.qTwi : faq.qEn}
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {lang === "twi" ? faq.qEn : faq.qTwi}
                  </p>
                </div>

                <div className="p-1 rounded-full text-outline shrink-0 mt-0.5">
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Answer Body */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-outline-variant/50 flex flex-col gap-3.5 bg-surface/50">
                  {/* Primary Language Answer */}
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                      {lang === "twi" ? "Apomuden Nkyerɛkyerɛmu (Twi)" : "Clinical Guidance (English)"}
                    </p>
                    <p className="text-sm text-on-surface leading-relaxed">
                      {lang === "twi" ? faq.aTwi : faq.aEn}
                    </p>
                  </div>

                  {/* Secondary Language Translation */}
                  <div className="bg-surface-container-low/70 p-3 rounded-xl border border-outline-variant/40">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">
                      {lang === "twi" ? "English Translation:" : "Twi Translation:"}
                    </p>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {lang === "twi" ? faq.aEn : faq.aTwi}
                    </p>
                  </div>

                  {/* Audio Playback Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Twi Audio */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleAudio(faq, "twi", e)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isTwiPlaying
                          ? "bg-error text-on-error border-error animate-pulse shadow-xs"
                          : voiceLang === "twi"
                          ? "bg-primary text-on-primary border-primary shadow-xs"
                          : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary"
                      }`}
                    >
                      {isTwiPlaying ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop Twi</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>🇬🇭 Tie Twi Kasa</span>
                        </>
                      )}
                    </button>

                    {/* English Audio */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleAudio(faq, "en", e)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isEnPlaying
                          ? "bg-error text-on-error border-error animate-pulse shadow-xs"
                          : voiceLang === "en"
                          ? "bg-primary text-on-primary border-primary shadow-xs"
                          : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary"
                      }`}
                    >
                      {isEnPlaying ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop English</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>🇬🇧 Listen in English</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-center flex flex-col items-center gap-2">
            <HelpCircle className="w-8 h-8 text-outline" />
            <p className="font-semibold text-sm text-on-surface">
              {lang === "twi" ? "Yɛanhunu asɛmmisa biara" : "No questions matched your search"}
            </p>
            <p className="text-xs text-on-surface-variant max-w-xs">
              {lang === "twi"
                ? "Bisa wo pɛ wɔ Voice Assistant no mu na yɛbɛboa wo."
                : "You can ask your custom question directly using the Voice Assistant."}
            </p>
            <Link
              to="/app/ask"
              className="mt-2 px-4 py-2 bg-primary text-on-primary rounded-full text-xs font-bold"
            >
              {lang === "twi" ? "Kasa kyerɛ Mama Ba" : "Ask Mama Ba Directly"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

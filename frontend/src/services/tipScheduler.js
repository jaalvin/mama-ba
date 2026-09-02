/**
 * src/services/tipScheduler.js
 *
 * Schedules hourly / 6-hourly pregnancy tips and "Did You Know?" facts
 * as both in-app and device notifications.
 *
 * Usage:
 *   const stop = startTipScheduler(lang, addNotification);
 *   // later: stop(); // cancel all timers
 */

const TIP_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const TIP_STORE_KEY   = "mama_ba_last_tip_idx";
const TIP_FIRED_KEY   = "mama_ba_last_tip_ts";

const TIPS = [
  {
    type: "tip",
    en: { title: "💧 Stay Hydrated", body: "Drink at least 8 glasses of water today. Proper hydration supports your baby's amniotic fluid and prevents pre-term contractions." },
    twi: { title: "💧 Nom Nsuo Pa", body: "Nom nsuo kuruwa 8 ara da biara. Nsuo pa papa boa wo ba no nsuonom na ɛtew nwoworan." },
  },
  {
    type: "tip",
    en: { title: "🥬 Eat Kontomire Today", body: "Kontomire (Cocoyam greens) is rich in folate and iron — perfect for blood-building during pregnancy." },
    twi: { title: "🥬 Di Kontomire", body: "Kontomire wɔ folate ne iron a ɛma mogya so yie wɔ nyinsɛn mu." },
  },
  {
    type: "tip",
    en: { title: "🚶‍♀️ Gentle Walk", body: "A 15-minute walk after lunch improves blood sugar regulation and reduces swelling in your legs and feet." },
    twi: { title: "🚶‍♀️ Nante Kakra", body: "Nante simma 15 aduane akyi boa wo mogya sukaa ne nan abɔ ntonton." },
  },
  {
    type: "tip",
    en: { title: "😴 Rest on Your Left Side", body: "Sleeping on your left side improves blood and nutrient flow to your placenta and baby." },
    twi: { title: "😴 Da Benkum So", body: "Da benkum so ma mogya ne aduane bɔkɔ wo ba ne wo bɔ no mu yie." },
  },
  {
    type: "tip",
    en: { title: "🤱 Kick Count", body: "From week 28, count your baby's kicks daily. 10 kicks in 2 hours is a healthy sign. Report if fewer." },
    twi: { title: "🤱 Kɔ Wo Ba Nan", body: "Fi nnawɔtwe 28 so, kɔ wo ba nan da biara. Nan 10 wɔ dɔnhwerew 2 mu yɛ sign pa. Ka kyerɛ dɔkota sɛ ɛkyia." },
  },
  {
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Your baby can taste what you eat! Flavors from your diet pass through amniotic fluid, shaping their future food preferences." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Wo ba tumi hu aduane a wodi! Nneɛma a wodi kɔ ne nsuo mu kyerɛ no adidi." },
  },
  {
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Iron-rich foods like garden eggs, dried fish, and bean stew help prevent anaemia — a leading cause of maternal death in Ghana." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Nyaadewa, aborɔnoma a wɔawo, ne abɛduru wɔ iron a ɛtew mogya a ɛnni ho — anaemia hunu Ghanaian maame paa." },
  },
  {
    type: "tip",
    en: { title: "🧘 Belly Breathing", body: "Practice deep belly breathing for 5 minutes. It calms your nervous system and brings more oxygen to your baby." },
    twi: { title: "🧘 Home Ahome", body: "Home ahome dɔɔso simma 5. Ɛboa wo ho ahoɔden ne ɛde oxygen bɛma wo ba." },
  },
  {
    type: "tip",
    en: { title: "🦷 Dental Health Matters", body: "Pregnancy hormones can cause gum disease. Brush twice daily and visit your dentist — poor gum health is linked to preterm birth." },
    twi: { title: "🦷 Hwɛ Wo Sɛ Yie", body: "Nyinsɛn ahomaden tumi boro wo anom ho. Hwɛ wo anom da biara na kɔ dentist — ɛboa atietie nwoworan." },
  },
  {
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Your blood volume increases by nearly 50% during pregnancy to support your baby. This is why iron and folate supplements are critical." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Wo mogya kɔ soro 50% wɔ nyinsɛn mu sɛ eboa wo ba. Iron ne folate nnuro hia paa sentifi a." },
  },
  {
    type: "tip",
    en: { title: "🧴 Moisturize Daily", body: "Keep your belly moisturized with shea butter or coconut oil to reduce stretch marks and itchy skin as your belly grows." },
    twi: { title: "🧴 Dua Shea Butter", body: "Dua shea butter anaa nkuto ngo wɔ wo yafunu so da biara tew akrantie ne wo ho hyehye." },
  },
  {
    type: "tip",
    en: { title: "💊 ANC Supplements", body: "Have you taken your Folic Acid and Iron today? Missing doses increases your risk of anaemia and neural tube defects." },
    twi: { title: "💊 Gye Wo Nnuro", body: "Wugye Folic Acid ne Iron ɛnnɛ? Sɛ wugyae a, ɛboro mogya yareɛ ne bɔhɔ ho ɔhaw." },
  },
  {
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Babies can hear and respond to your voice from around week 18! Talking and singing to your bump strengthens your bond." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Wo ba tumi te wo nnome fi nnawɔtwe 18 ho! Kasa ne to dwom ma wo yafunu ma ɔbɛhu wo yie." },
  },
  {
    type: "tip",
    en: { title: "🩺 Next ANC Visit?", body: "Make sure you are tracking your next Antenatal Care visit. Regular ANC reduces maternal and infant mortality significantly." },
    twi: { title: "🩺 ANC Visit a Ɛto So Mmienu?", body: "Hwɛ sɛ wo ANC visit a ɛto so mmienu no aso mu. ANC nkwa boa maame ne mmofra paa." },
  },
  {
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Pre-eclampsia (high blood pressure in pregnancy) has no early warning pains. Regular BP checks at ANC can be life-saving." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Pre-eclampsia nni ehu sɛ eye na. ANC mogya tumi nhwehwɛmu tumi gye wo nkwa." },
  },
  {
    type: "tip",
    en: { title: "🌙 Sleep Well Tonight", body: "Try to get 7–9 hours of sleep. Poor sleep increases cortisol which can raise your blood pressure. Use a body pillow for support." },
    twi: { title: "🌙 Da Pa Anwumere", body: "Da dɔnhwerew 7–9. Da a ɛnso yie boro mogya tumi. Fa pillow bi bɔ wo ho." },
  },
  {
    type: "tip",
    en: { title: "🫶 Emotional Wellness", body: "Pregnancy can bring anxiety and mood shifts. Talk to someone you trust, or call a maternal health helpline. Your feelings are valid." },
    twi: { title: "🫶 Adwene Ahoɔden", body: "Nyinsɛn tumi de awerɛhow. Kasa kyerɛ obi a wogyina no so, anaa frɛ maternal health line." },
  },
  {
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Taabea (Lippia multiflora herbal tea) consumed in high amounts may stimulate uterine contractions. Use with caution during pregnancy." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Taabea dɔɔso tumi boro asɛn abɔ nwoworan. Fa ho anigyeso wɔ nyinsɛn mu." },
  },
  {
    type: "tip",
    en: { title: "🥚 Protein Power", body: "Eat eggs, beans, or groundnut soup today. Protein builds your baby's organs, muscles and brain during the third trimester." },
    twi: { title: "🥚 Aduan a Protein Wɔ Mu", body: "Di kosua, abɔdwese, anaa nkate nkwan ɛnnɛ. Protein bo wo ba asotwe, mu yam ne adwene." },
  },
  {
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Gestational diabetes affects about 1 in 10 pregnancies in Ghana. A blood sugar test at your ANC clinic can catch it early." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Nyinsɛn sukaa yareɛ hia nyinsɛn 1 wɔ 10 mu Ghana. ANC mogya sukaa nhwehwɛmu tumi hunu no ntɛm." },
  },
  {
    type: "tip",
    en: { title: "🌸 Pelvic Floor Exercises", body: "Do 10 Kegel exercises today. They strengthen your pelvic floor for labour, reduce leakage, and speed up postpartum recovery." },
    twi: { title: "🌸 Pelvic Floor Akwan", body: "Yɛ Kegel nhyehyɛe 10 ɛnnɛ. Ɛma wo pelvic floor ahoma, boa wɔ awoo mu, na ɛboa wo ho nyim a." },
  },
  {
    type: "tip",
    en: { title: "🤰 Birth Plan Ready?", body: "Have you thought about your birth plan? Where will you deliver? Who is your birth companion? Prepare now to reduce panic later." },
    twi: { title: "🤰 Wohwɛ Wo Awoo Nhyehyɛe?", body: "Wokaa ho asɛm wɔ wo awoo nhyehyɛe? Ebi na wobɛwo? Hyehyɛ ɛnnɛ na wunna awerehow." },
  },
  {
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Vitamin D helps your baby develop strong bones and teeth. Get 20 minutes of morning sunlight and eat oily fish or eggs." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Vitamin D boa wo ba ahomden na ɔhwɛ se ne sɛ den. Fa owia kakra owia ni na di nsuonam anaa kosua." },
  },
  {
    type: "tip",
    en: { title: "📞 Emergency Contacts Set?", body: "Make sure your emergency contacts are saved in the app. If danger signs arise, you or someone nearby can act immediately." },
    twi: { title: "📞 Ɔhaw Fon Nɔma?", body: "Hyɛ wo ɔhaw fon nɔma wɔ app no mu. Sɛ ɔhaw ba a, obiara betumi aboa wo ntɛm." },
  },
];

/**
 * Start the tip notification scheduler.
 * Fires immediately if more than TIP_INTERVAL_MS has passed since last tip.
 * Returns a cleanup function to cancel all timers.
 */
export function startTipScheduler(lang = "en", addNotification) {
  if (!addNotification) return () => {};

  let tipIdx = parseInt(localStorage.getItem(TIP_STORE_KEY) || "0", 10);
  const timers = [];

  function fireTip() {
    const tip = TIPS[tipIdx % TIPS.length];
    const titleKey = lang === "twi" ? "twi" : "en";
    const { title, body } = tip[titleKey];

    try {
      addNotification({
        type: tip.type === "did_you_know" ? "info" : "reminder",
        titleEn: tip.en.title,
        titleTwi: tip.twi.title,
        bodyEn: tip.en.body,
        bodyTwi: tip.twi.body,
      });
    } catch { /* ignore context errors when unmounted */ }

    tipIdx = (tipIdx + 1) % TIPS.length;
    localStorage.setItem(TIP_STORE_KEY, String(tipIdx));
    localStorage.setItem(TIP_FIRED_KEY, String(Date.now()));
  }

  // Fire immediately if we haven't sent a tip this session (or ≥ 6 hrs since last)
  const lastFiredMs = parseInt(localStorage.getItem(TIP_FIRED_KEY) || "0", 10);
  const msSinceLast = Date.now() - lastFiredMs;
  const initialDelay = msSinceLast >= TIP_INTERVAL_MS ? 3000 : TIP_INTERVAL_MS - msSinceLast;

  const firstTimer = setTimeout(() => {
    fireTip();
    // Then repeat every 6 hours
    const recurring = setInterval(fireTip, TIP_INTERVAL_MS);
    timers.push(recurring);
  }, initialDelay);

  timers.push(firstTimer);

  return () => timers.forEach(t => { clearTimeout(t); clearInterval(t); });
}

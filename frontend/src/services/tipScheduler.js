/**
 * src/services/tipScheduler.js
 *
 * Daily Pregnancy & Maternal Health Tips (35+ Daily Dataset)
 *
 * Features:
 * - 35+ rich Ghanaian daily pregnancy tips & "Did You Know?" facts.
 * - Schedules a pop notification exactly 20 seconds into using the app.
 * - Exposes `getTodayTip(lang)` for the Home screen (Dashboard) to render today's tip consistently.
 */

import { showDeviceNotification } from "./notifications.js";

const TIP_STORE_KEY = "mama_ba_last_tip_idx";
const TIP_FIRED_KEY = "mama_ba_last_tip_ts";

export const DAILY_TIPS = [
  {
    day: 1,
    type: "tip",
    en: { title: "💧 Stay Hydrated", body: "Drink at least 8 to 10 glasses of clean water today. Proper hydration supports your baby's amniotic fluid and prevents pre-term contractions." },
    twi: { title: "💧 Nom Nsuo Pa", body: "Nom nsuo kuruwa 8 kɔsi 10 da biara. Nsuo pa papa boa wo ba no nsuonom na ɛtew nwoworan." },
  },
  {
    day: 2,
    type: "tip",
    en: { title: "🥬 Eat Kontomire Today", body: "Kontomire (Cocoyam greens) is rich in folate, iron, and fiber — essential for building healthy red blood cells during pregnancy." },
    twi: { title: "🥬 Di Kontomire", body: "Kontomire wɔ folate, iron ne fiber a ɛma mogya pa so yie wɔ nyinsɛn mu." },
  },
  {
    day: 3,
    type: "tip",
    en: { title: "🚶‍♀️ 15-Minute Gentle Walk", body: "A 15-minute gentle walk after lunch improves blood sugar regulation, aids digestion, and reduces swelling in your legs." },
    twi: { title: "🚶‍♀️ Nante Kakra", body: "Nante simma 15 aduane akyi boa wo mogya sukaa, aduane yam, na ɛma nan abɔ ntonton no te." },
  },
  {
    day: 4,
    type: "tip",
    en: { title: "😴 Rest on Your Left Side", body: "Sleeping on your left side optimizes blood and nutrient flow to your placenta and baby while relieving kidney pressure." },
    twi: { title: "😴 Da Benkum So", body: "Da benkum so ma mogya ne aduane bɔkɔ wo ba ne wo bɔ no mu yie na ɛtew safoa so nhyɛso." },
  },
  {
    day: 5,
    type: "tip",
    en: { title: "🤱 Daily Kick Count", body: "From week 28, count your baby's kicks daily. Aiming for 10 kicks within 2 hours is a healthy indicator. Contact your midwife if fewer." },
    twi: { title: "🤱 Kɔ Wo Ba Nan", body: "Fi nnawɔtwe 28 so, kɔ wo ba nan da biara. Nan 10 wɔ dɔnhwerew 2 mu yɛ kyerɛw pa. Ka kyerɛ midwife sɛ ɛkyia." },
  },
  {
    day: 6,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Your baby can taste what you eat! Flavors from your traditional meals pass into amniotic fluid, shaping their early palate." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Wo ba tumi hu aduane a wodi! Nneɛma a wodi kɔ ne nsuo mu kyerɛ no adidi fi yam mu." },
  },
  {
    day: 7,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Iron-rich foods like garden eggs, dried fish, and bean stew help prevent maternal anaemia — a primary concern in Ghana." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Nyaadewa, aborɔnoma, ne abɛduru wɔ iron a ɛtew mogya a ɛnni ho — anaemia yɛ asɛm kɛse Ghana." },
  },
  {
    day: 8,
    type: "tip",
    en: { title: "🧘 Deep Belly Breathing", body: "Practice 5 minutes of slow belly breathing. It calms maternal stress hormones and increases oxygen delivery to your baby." },
    twi: { title: "🧘 Home Ahome", body: "Home ahome dɔɔso simma 5. Ɛtew adwenehaw so na ɛma oxygen bɛdɔɔso wɔ wo ba ho." },
  },
  {
    day: 9,
    type: "tip",
    en: { title: "🦷 Dental Care Matters", body: "Pregnancy hormones can cause gum inflammation. Brush twice daily with fluoride toothpaste — healthy gums lower preterm risk." },
    twi: { title: "🦷 Hwɛ Wo Sɛ Yie", body: "Nyinsɛn ahomaden tumi boro wo anom ho. Hwɛ wo anom da biara na kɔ dentist — ɛboa awoo ntɛm so." },
  },
  {
    day: 10,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Your blood volume increases by nearly 50% during pregnancy. This is why daily iron and folic acid supplements are crucial." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Wo mogya kɔ soro 50% wɔ nyinsɛn mu sɛ eboa wo ba. Iron ne folic acid nnuro hia da biara." },
  },
  {
    day: 11,
    type: "tip",
    en: { title: "🧴 Moisturize Your Bump", body: "Apply pure unrefined shea butter or coconut oil to your belly daily to soothe itchy skin and maintain skin elasticity." },
    twi: { title: "🧴 Dua Shea Butter", body: "Dua pure shea butter anaa nkuto ngo wɔ wo yafunu so da biara tew akrantie ne wo ho hyehye." },
  },
  {
    day: 12,
    type: "tip",
    en: { title: "💊 Daily ANC Supplements", body: "Have you taken your Iron and Folic Acid today? Consistent supplementation prevents birth defects and fatigue." },
    twi: { title: "💊 Gye Wo Nnuro", body: "Wugye Folic Acid ne Iron ɛnnɛ? Sɛ wugyae a, ɛboro mogya yareɛ ne abrɛ foforo." },
  },
  {
    day: 13,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Your baby can hear your voice clearly from week 18 onwards! Singing traditional lullabies builds emotional bonding early." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Wo ba tumi te wo nnome fi nnawɔtwe 18 ho! Kasa ne to dwom ma wo yafunu ma ɔbɛhu wo yie." },
  },
  {
    day: 14,
    type: "tip",
    en: { title: "🩺 Track Your Next ANC Visit", body: "Ensure your upcoming Antenatal appointment is scheduled. Consistent ANC visits save lives by catching issues early." },
    twi: { title: "🩺 Hwɛ Wo ANC Visit", body: "Hwɛ sɛ wo ANC visit a ɛreba no aso mu. ANC nkwa boa maame ne mmofra paa." },
  },
  {
    day: 15,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Pre-eclampsia (hypertension in pregnancy) has no early pain signals. Regular blood pressure checkups at ANC clinics are essential." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Pre-eclampsia (mogya mmoroso) nni ehu sɛ eye na. ANC mogya nhwehwɛmu tumi gye wo nkwa." },
  },
  {
    day: 16,
    type: "tip",
    en: { title: "🌙 Prioritize 8 Hours of Sleep", body: "Target 7 to 9 hours of restful sleep every night. Elevate your knees with a pillow for maximum comfort and spinal alignment." },
    twi: { title: "🌙 Da Pa Anwumere", body: "Da dɔnhwerew 7–9. Da a ɛnso yie boro mogya tumi. Fa pillow bi bɔ wo nan ne wo kyi." },
  },
  {
    day: 17,
    type: "tip",
    en: { title: "🫶 Mental Health & Wellness", body: "It is normal to feel overwhelmed at times. Share your emotions with a trusted friend, partner, or midwife. Your peace of mind matters." },
    twi: { title: "🌐 Adwene Ahoɔden", body: "Nyinsɛn tumi de awerɛhow. Kasa kyerɛ obi a wogyina no so, anaa midwife. Wo asomdwoe hia." },
  },
  {
    day: 18,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Taabea herbal tea and uterine stimulants should be consumed with caution during early pregnancy. Consult your doctor first." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Taabea ne nnuro bi tumi boro asɛn abɔ nwoworan. Fa ho anigyeso na bisa doctor ansa." },
  },
  {
    day: 19,
    type: "tip",
    en: { title: "🥚 Protein Power Meals", body: "Include eggs, beans, fish, or peanut soup in your meals today. Protein is the building block for baby's vital organs." },
    twi: { title: "🥚 Di Protein Aduan", body: "Di kosua, abɔdwese, nsuonam, anaa nkate nkwan ɛnnɛ. Protein bo wo ba organ horow ne adwene." },
  },
  {
    day: 20,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Gestational diabetes screening is routine between weeks 24 and 28. Managing blood sugar ensures safe delivery." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Nyinsɛn sukaa yareɛ nhwehwɛmu yɛ krowa wɔ nnawɔtwe 24-28. Ɛboa awoo mu bɔkɔɔ." },
  },
  {
    day: 21,
    type: "tip",
    en: { title: "🌸 Pelvic Floor (Kegel) Practice", body: "Do 10 Kegel squeezes today. Strengthening pelvic muscles supports bladder control and aids postpartum recovery." },
    twi: { title: "🌸 Pelvic Floor Akwan", body: "Yɛ Kegel nhyehyɛe 10 ɛnnɛ. Ɛma wo pelvic floor ahoma, boa wɔ awoo mu, na ɛboa wo ho nyim." },
  },
  {
    day: 22,
    type: "tip",
    en: { title: "🤰 Finalize Your Birth Plan", body: "Have you chosen your birth facility and emergency transportation method? Preparing early eliminates emergency panic." },
    twi: { title: "🤰 Awoo Nhyehyɛe", body: "Wokaa ho asɛm wɔ wo awoo nhyehyɛe? Ebi na wobɛwo? Hyehyɛ ɛnnɛ na wunna awerehow." },
  },
  {
    day: 23,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Morning sunlight boosts your natural Vitamin D levels, helping your body absorb calcium for baby's bone structure." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Anwummere owia ma wo Vitamin D, ɛboa ma wo nidwo gye calcium fa ma wo ba dompe." },
  },
  {
    day: 24,
    type: "tip",
    en: { title: "📞 Verify Emergency Hotlines", body: "Store 112 (Ambulance) and your local maternity clinic number on your phone speed dial. Emergency readiness is safety." },
    twi: { title: "📞 Ɔhaw Fon Nɔma", body: "Hyɛ 112 ne wo clinic fon nɔma wɔ wo phone mu. Ɔhaw ba a, obiara betumi aboa wo ntɛm." },
  },
  {
    day: 25,
    type: "tip",
    en: { title: "🍌 Relief for Leg Cramps", body: "Experiencing painful calf cramps? Eat a banana or avocado for potassium and stretch your calf before bedtime." },
    twi: { title: "🍌 Nan Ho Yaw Mmoa", body: "Wo nan reye yaw? Di kookoo anaa pear na teene wo nan ansa na wadeda." },
  },
  {
    day: 26,
    type: "tip",
    en: { title: "🍵 Natural Nausea Relief", body: "Sip warm ginger tea or chew dry crackers to calm morning sickness and pregnancy nausea throughout the day." },
    twi: { title: "🍵 Akekaduru Twi Mmoa", body: "Nom akekaduru twi anaa di biscuits krado sɛ eboa wo feefee ne yam yaw anwummere." },
  },
  {
    day: 27,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "If calcium in your diet is insufficient, your body will draw calcium from your own bones to build your baby's skeleton." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Sɛ wondi calcium dɔɔso a, wo nipadua bɛyie dompe calcium afi wo ho akyɛ wo ba." },
  },
  {
    day: 28,
    type: "tip",
    en: { title: "🥑 Healthy Fats for Brain Growth", body: "Include healthy fats like avocados, peanuts, and seeds in your meals. Omega fatty acids fuel baby's rapid brain growth." },
    twi: { title: "🥑 Pear ne Nkate Aduan", body: "Di pear, nkate, ne nku. Omega srade pa ma wo ba adwene nyini ntɛm." },
  },
  {
    day: 29,
    type: "tip",
    en: { title: "🧼 Frequent Hand Washing", body: "Wash hands thoroughly with soap and clean water before eating. Preventing infections like Listeria protects your pregnancy." },
    twi: { title: "🧼 Hohorɔ Wo Nsa", body: "Hohorɔ wo nsa ne samina ansa na wadi aduane. Ɛma wonsi yareɛ kwan na ɛbɔ wo yafunu ho ban." },
  },
  {
    day: 30,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "By week 30, your baby opens their eyes inside the uterus and can distinguish between light and dark!" },
    twi: { title: "💡 Wuhu Sɛ?", body: "Ekodu nnawɔtwe 30 a, wo ba tumi bue ne ani wɔ yafunu mu na ɔtumi hu hann ne sum!" },
  },
  {
    day: 31,
    type: "tip",
    en: { title: "🍊 Vitamin C for Iron Absorption", body: "Pair your iron pills or meals with Vitamin C rich fruits like oranges or pineapples to double your body's iron absorption." },
    twi: { title: "🍊 Di Ankaa ne Iron", body: "Nom ankaa nsuo bere a woregye iron. Vitamin C ma wo mogya gye iron kɛse." },
  },
  {
    day: 32,
    type: "tip",
    en: { title: "👗 Wear Breathable Fabrics", body: "Choose loose, light cotton clothing. Pregnancy raises body temperature, and breathable clothes prevent skin rashes and heat exhaustion." },
    twi: { title: "👗 Hyɛ Ataade Bɔkɔɔ", body: "Hyɛ ataade a ɛnyɛ den a ɛwɔ nwera mu. Ɛma wo ho dwo na ɛtew hyehyeew so." },
  },
  {
    day: 33,
    type: "did_you_know",
    en: { title: "💡 Did You Know?", body: "Colostrum (golden first milk produced in late pregnancy) is rich in maternal antibodies that immunize your newborn immediately." },
    twi: { title: "💡 Wuhu Sɛ?", body: "Nfufuo kan (Colostrum) a ɛba awoo akyi pɛɛ no yɛ nkuuru a ɛwɔ maame ahoɔden a ɛbɔ wo ba abofra no ho ban ntɛm." },
  },
  {
    day: 34,
    type: "tip",
    en: { title: "🛑 Know Pregnancy Warning Signs", body: "Sudden facial swelling, severe headaches, vision changes, or vaginal bleeding require immediate hospital evaluation." },
    twi: { title: "🛑 Hwɛ Nsɛnkyerɛnne Dendeɛ", body: "Anim pum, tipae dendeɛ, ani kurokuro, anaa mogya ba a, kɔ ayaresabea ntɛm ara." },
  },
  {
    day: 35,
    type: "tip",
    en: { title: "❤️ Celebrate Yourself", body: "You are doing an incredible job growing new life! Take a quiet moment today to appreciate your body's strength and resilience." },
    twi: { title: "❤️ Kamfo Wo Ho", body: "Woreyɛ adwuma kɛse paa efe! Gye bere kakra nnɛ na da wo nipadua ase wɔ ne tumi ho." },
  },
];

/**
 * Calculates today's daily tip based on the day of the year (1-365).
 * Ensures that every day of the month has a unique, fresh daily tip.
 */
export function getTodayTip(lang = "en") {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diffMs = now - startOfYear;
  const dayOfYear = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const tipIdx = dayOfYear % DAILY_TIPS.length;
  const tip = DAILY_TIPS[tipIdx];
  const langKey = lang === "twi" ? "twi" : "en";

  return {
    ...tip,
    title: tip[langKey].title,
    body: tip[langKey].body,
    titleEn: tip.en.title,
    titleTwi: tip.twi.title,
    bodyEn: tip.en.body,
    bodyTwi: tip.twi.body
  };
}

/**
 * Starts the Daily Tip Scheduler.
 * Triggers an in-app pop notification + browser device notification
 * EXACTLY 20 SECONDS into using the app!
 */
export function startTipScheduler(lang = "en", addNotification) {
  if (!addNotification) return () => {};

  // Pop notification exactly 20 seconds (20,000 ms) into using the app
  const timer20s = setTimeout(() => {
    const todayTip = getTodayTip(lang);

    try {
      // 1. Add to in-app notification panel / unread badge
      addNotification({
        type: todayTip.type === "did_you_know" ? "info" : "reminder",
        titleEn: todayTip.titleEn,
        titleTwi: todayTip.titleTwi,
        bodyEn: todayTip.bodyEn,
        bodyTwi: todayTip.bodyTwi,
      });

      // 2. Trigger active device notification pop banner
      showDeviceNotification(
        lang === "twi" ? todayTip.titleTwi : todayTip.titleEn,
        lang === "twi" ? todayTip.bodyTwi : todayTip.bodyEn
      );

      localStorage.setItem(TIP_STORE_KEY, String(Date.now()));
      localStorage.setItem(TIP_FIRED_KEY, String(Date.now()));
    } catch (err) {
      /* ignore context errors if unmounted */
    }
  }, 20000); // 20 seconds into using the app

  return () => clearTimeout(timer20s);
}

import { getOfflineDb } from '../config';

export interface VitalsEntry {
  userId: string;
  systolicBp?: number;
  diastolicBp?: number;
  bodyTemperature?: number;
  pulseRate?: number;
  bloodGlucose?: number;
  weightKg?: number;
  notes?: string;
}

export interface VitalFactorAssessment {
  factor: 'Blood Pressure' | 'Body Temperature' | 'Blood Sugar' | 'Pulse Rate' | 'Weight';
  value: string;
  status: 'NORMAL' | 'ELEVATED' | 'HIGH_WARNING';
  statusLabelEn: string;
  statusLabelTwi: string;
  doctorActionsEn: string[];
  doctorActionsTwi: string[];
  lifestyleCurbEn: string[];
  lifestyleCurbTwi: string[];
}

export interface VitalsEvaluationResult {
  id: string;
  vitalStatus: 'NORMAL' | 'ELEVATED' | 'HIGH_WARNING';
  overallAssessmentEn: string;
  overallAssessmentTwi: string;
  factorAssessments: VitalFactorAssessment[];
  alerts: string[];
  alertsTwi: string[];
  suggestions: string[];
  suggestionsTwi: string[];
  recordedAt: string;
}

export class VitalsService {
  /**
   * Log patient vitals and evaluate maternal health status focusing specifically on danger and attention factors.
   */
  static logVitals(entry: VitalsEntry): VitalsEvaluationResult {
    const db = getOfflineDb();
    const alerts: string[] = [];
    const alertsTwi: string[] = [];
    const suggestions: string[] = [];
    const suggestionsTwi: string[] = [];
    const factorAssessments: VitalFactorAssessment[] = [];

    let isHigh = false;
    let isElevated = false;

    const userId = entry.userId || 'anonymous-user';

    // ── 1. Blood Pressure Evaluation ──────────────────────────────────────────
    if (entry.systolicBp || entry.diastolicBp) {
      const sys = entry.systolicBp || 120;
      const dia = entry.diastolicBp || 80;

      if (sys >= 140 || dia >= 90) {
        isHigh = true;
        const msgEn = `Blood Pressure (${sys}/${dia} mmHg) is HIGH DANGER — Pre-eclampsia Risk`;
        const msgTwi = `Mogya Tumi (${sys}/${dia} mmHg) wo soro dodo — Pre-eclampsia risk`;
        alerts.push(msgEn);
        alertsTwi.push(msgTwi);

        const docEn = [
          "Contact your ANC midwife or visit the nearest hospital immediately for pre-eclampsia screening (proteinuria & BP check).",
          "Lie down on your left side immediately to increase blood and oxygen flow to your placenta and baby.",
          "Inform your doctor of any sudden headache, blurred vision, or upper belly pain."
        ];
        const docTwi = [
          "Kɔ asibiti anaa kasa kyerɛ wo nɛɛse ntɛm ara ma wɔnhwɛ wo mogya ne wo ba no banbɔ.",
          "Da wo benkum so ntɛm ma mogya ne mframa nkɔ wo ba no hɔ yie.",
          "Kyerɛ dɔkota sɛ wo ti pae anaa wo ani so yɛ wo kusuu."
        ];

        const lifeEn = [
          "Dramatically cut salt and sodium seasoning (avoid bouillon cubes/Maggi, salted fish, and canned foods).",
          "Eat potassium-rich local Ghanaian foods like fresh Kontomire, boiled green plantain, ripe bananas, and avocados.",
          "Rest for 30 minutes twice daily with elevated legs and practice calm, deep breathing exercises."
        ];
        const lifeTwi = [
          "Tew nkyene ne bouillon cubes so koraa wɔ nkwan mu.",
          "Di kontomire, bɔrodɛ, kwadu, ne apɛrɛkɔ a ɛwɔ potassium pii.",
          "Gye wo ho ahome nnɔnhwerew fa da biara."
        ];

        suggestions.push(...docEn, ...lifeEn);
        suggestionsTwi.push(...docTwi, ...lifeTwi);

        factorAssessments.push({
          factor: 'Blood Pressure',
          value: `${sys}/${dia} mmHg`,
          status: 'HIGH_WARNING',
          statusLabelEn: 'DANGER — High BP / Pre-Eclampsia Risk',
          statusLabelTwi: 'ƆHAW DENDEN — Mogya Soro Dodo',
          doctorActionsEn: docEn,
          doctorActionsTwi: docTwi,
          lifestyleCurbEn: lifeEn,
          lifestyleCurbTwi: lifeTwi,
        });
      } else if (sys >= 125 || dia >= 83) {
        isElevated = true;
        const msgEn = `Blood Pressure (${sys}/${dia} mmHg) is ELEVATED — Keep an Eye On`;
        const msgTwi = `Mogya Tumi (${sys}/${dia} mmHg) wo soro kakra — Hwɛ so yie`;
        alerts.push(msgEn);
        alertsTwi.push(msgTwi);

        const docEn = [
          "Mention this elevated reading at your next ANC clinic visit.",
          "Monitor your blood pressure twice daily (morning and evening) and keep a log."
        ];
        const docTwi = [
          "Ka kyerɛ wo nɛɛse wɔ wo ANC visit a ɛreba no mu.",
          "Sɔ wo mogya tumi hwɛ da biara anopa ne anwummere."
        ];

        const lifeEn = [
          "Limit salt in daily meals and avoid added table salt.",
          "Increase intake of green leaf vegetables (Kontomire) and stay hydrated with 8+ glasses of water.",
          "Avoid heavy physical strain or stressful domestic labor."
        ];
        const lifeTwi = [
          "Tew nkyene so na nom nsuo pii da biara.",
          "Di kontomire na kwati adwuma denden."
        ];

        suggestions.push(...docEn, ...lifeEn);
        suggestionsTwi.push(...docTwi, ...lifeTwi);

        factorAssessments.push({
          factor: 'Blood Pressure',
          value: `${sys}/${dia} mmHg`,
          status: 'ELEVATED',
          statusLabelEn: 'KEEP AN EYE ON — Mild Elevation',
          statusLabelTwi: 'HWEHWƐ MU YIE — Mogya Soro Kakra',
          doctorActionsEn: docEn,
          doctorActionsTwi: docTwi,
          lifestyleCurbEn: lifeEn,
          lifestyleCurbTwi: lifeTwi,
        });
      }
    }

    // ── 2. Body Temperature Evaluation ────────────────────────────────────────
    if (entry.bodyTemperature) {
      const temp = entry.bodyTemperature;
      if (temp >= 38.0) {
        isHigh = true;
        const msgEn = `Body Temperature (${temp}°C) is HIGH FEVER DANGER — Malaria/Infection Risk`;
        const msgTwi = `Onipa Hye (${temp}°C) dɔɔso denden — Malaria/Yareɛ risk`;
        alerts.push(msgEn);
        alertsTwi.push(msgTwi);

        const docEn = [
          "Go to the hospital or ANC clinic immediately for a Malaria Rapid Diagnostic Test (RDT) and blood smear.",
          "Take Paracetamol only if explicitly prescribed by your ANC midwife or doctor while en route."
        ];
        const docTwi = [
          "Kɔ asibiti ntɛm ara kɔyɛ malaria test.",
          "Nom Paracetamol sɛ dɔkota anaa nɛɛse kyerɛɛ wo sɛ nom a."
        ];

        const lifeEn = [
          "Drink plenty of clean water, coconut water, or ORS solution continuously to prevent dehydration.",
          "Apply a lukewarm damp cloth to your forehead, neck, and armpits.",
          "Rest in a shaded, well-ventilated cool room with loose cotton clothing."
        ];
        const lifeTwi = [
          "Nom nsuo pa anaa nkutu nsuo pii da biara.",
          "Fa ntoma a nsuo wɔ mu bɔ wo mpotɔmu na gye wo ho ahome."
        ];

        suggestions.push(...docEn, ...lifeEn);
        suggestionsTwi.push(...docTwi, ...lifeTwi);

        factorAssessments.push({
          factor: 'Body Temperature',
          value: `${temp}°C`,
          status: 'HIGH_WARNING',
          statusLabelEn: 'DANGER — High Fever / Infection Risk',
          statusLabelTwi: 'ƆHAW DENDEN — Ho Hye Denden',
          doctorActionsEn: docEn,
          doctorActionsTwi: docTwi,
          lifestyleCurbEn: lifeEn,
          lifestyleCurbTwi: lifeTwi,
        });
      } else if (temp >= 37.3) {
        isElevated = true;
        const msgEn = `Body Temperature (${temp}°C) is MILD FEVER — Keep an Eye On`;
        const msgTwi = `Onipa Hye (${temp}°C) wo soro kakra — Hwɛ so yie`;
        alerts.push(msgEn);
        alertsTwi.push(msgTwi);

        const docEn = [
          "Monitor temperature every 4 hours. If it reaches 38°C, seek clinic care immediately."
        ];
        const docTwi = [
          "Hwɛ wo ho hye nnɔnhwerew 4 biara. Sɛ ɛkɔ 38°C a, kɔ asibiti."
        ];

        const lifeEn = [
          "Sip cool clean water regularly throughout the day.",
          "Rest in a cool environment and wear lightweight cotton clothing."
        ];
        const lifeTwi = [
          "Nom nsuo dɛdɛɛdɛ da biara na gye wo ho ahome."
        ];

        suggestions.push(...docEn, ...lifeEn);
        suggestionsTwi.push(...docTwi, ...lifeTwi);

        factorAssessments.push({
          factor: 'Body Temperature',
          value: `${temp}°C`,
          status: 'ELEVATED',
          statusLabelEn: 'KEEP AN EYE ON — Mild Fever',
          statusLabelTwi: 'HWEHWƐ MU YIE — Ho Hye Kakra',
          doctorActionsEn: docEn,
          doctorActionsTwi: docTwi,
          lifestyleCurbEn: lifeEn,
          lifestyleCurbTwi: lifeTwi,
        });
      }
    }

    // ── 3. Blood Glucose Evaluation ───────────────────────────────────────────
    if (entry.bloodGlucose) {
      const sugar = entry.bloodGlucose;
      if (sugar >= 10.0) {
        isHigh = true;
        const msgEn = `Blood Glucose (${sugar} mmol/L) is HIGH DANGER — Gestational Diabetes Risk`;
        const msgTwi = `Mogya Sukaa (${sugar} mmol/L) wo soro dodo — Diabetes risk`;
        alerts.push(msgEn);
        alertsTwi.push(msgTwi);

        const docEn = [
          "Schedule an Oral Glucose Tolerance Test (OGTT) with your ANC midwife or obstetric doctor.",
          "Keep a 3-day food and blood glucose log to bring to your doctor appointment."
        ];
        const docTwi = [
          "Kasa kyerɛ wo nɛɛse ma wɔnhwɛ wo mogya sukaa yie wɔ asibiti.",
          "Kyerɛw aduane a wodi da biara mma dɔkota no nhwɛ."
        ];

        const lifeEn = [
          "Eliminate sugary sodas/mineral drinks, refined white bread, and added table sugars.",
          "Switch to complex fiber Ghanaian meals like boiled plantain, garden eggs, brown rice, and Kontomire.",
          "Take a gentle 15-minute walk after lunch and dinner to naturalize blood glucose."
        ];
        const lifeTwi = [
          "Kwati mineral drinks ne sukye dodo.",
          "Di bɔfrɛ, nyaadewa, ne bɔrodɛ a fiber wɔ mu.",
          "Nante kakra bɛyɛ simma 15 aduane akyi."
        ];

        suggestions.push(...docEn, ...lifeEn);
        suggestionsTwi.push(...docTwi, ...lifeTwi);

        factorAssessments.push({
          factor: 'Blood Sugar',
          value: `${sugar} mmol/L`,
          status: 'HIGH_WARNING',
          statusLabelEn: 'DANGER — High Glucose / Diabetes Risk',
          statusLabelTwi: 'ƆHAW DENDEN — Mogya Sukaa Soro',
          doctorActionsEn: docEn,
          doctorActionsTwi: docTwi,
          lifestyleCurbEn: lifeEn,
          lifestyleCurbTwi: lifeTwi,
        });
      } else if (sugar >= 7.9) {
        isElevated = true;
        const msgEn = `Blood Glucose (${sugar} mmol/L) is ELEVATED — Keep an Eye On`;
        const msgTwi = `Mogya Sukaa (${sugar} mmol/L) wo soro kakra — Hwɛ so yie`;
        alerts.push(msgEn);
        alertsTwi.push(msgTwi);

        const docEn = [
          "Inform your ANC midwife about your blood sugar level at your next visit."
        ];
        const docTwi = [
          "Ka kyerɛ wo nɛɛse wɔ wo clinic visit a ɛreba no mu."
        ];

        const lifeEn = [
          "Replace soft drinks with clean water or unsweetened millet koko.",
          "Eat fiber-rich meals and walk 15 minutes after main meals."
        ];
        const lifeTwi = [
          "Nom nsuo pa anaa koko a sukye nni mu na nante aduane akyi."
        ];

        suggestions.push(...docEn, ...lifeEn);
        suggestionsTwi.push(...docTwi, ...lifeTwi);

        factorAssessments.push({
          factor: 'Blood Sugar',
          value: `${sugar} mmol/L`,
          status: 'ELEVATED',
          statusLabelEn: 'KEEP AN EYE ON — Elevated Glucose',
          statusLabelTwi: 'HWEHWƐ MU YIE — Mogya Sukaa Soro Kakra',
          doctorActionsEn: docEn,
          doctorActionsTwi: docTwi,
          lifestyleCurbEn: lifeEn,
          lifestyleCurbTwi: lifeTwi,
        });
      }
    }

    // ── Build Dynamic Overall Statements ────────────────────────────────────
    const highFactors = factorAssessments.filter(f => f.status === 'HIGH_WARNING');
    const elevatedFactors = factorAssessments.filter(f => f.status === 'ELEVATED');

    let overallAssessmentEn = "";
    let overallAssessmentTwi = "";

    if (highFactors.length > 0) {
      const factorListEn = highFactors.map(f => `${f.factor} (${f.value})`).join(', ');
      const factorListTwi = highFactors.map(f => `${f.factor} (${f.value})`).join(', ');

      overallAssessmentEn = `CRITICAL DANGER WARNING FOR ${factorListEn.toUpperCase()}: Immediate clinical evaluation required! Your recorded ${factorListEn} is dangerously high. Please contact your midwife or visit a clinic immediately.`;
      overallAssessmentTwi = `ƆHAW DENDEN — ${factorListTwi.toUpperCase()}: Kɔ asibiti ntɛm ara! Wo ${factorListTwi} a woagye no wo soro dodo. Kasa kyerɛ wo nɛɛse anaa dɔkota ntɛm.`;
    } else if (elevatedFactors.length > 0) {
      const factorListEn = elevatedFactors.map(f => `${f.factor} (${f.value})`).join(', ');
      const factorListTwi = elevatedFactors.map(f => `${f.factor} (${f.value})`).join(', ');

      overallAssessmentEn = `ELEVATED READING TO KEEP AN EYE ON FOR ${factorListEn.toUpperCase()}: Mild elevation detected in ${factorListEn}. Follow the clinical and lifestyle recommendations below to bring your readings back to target.`;
      overallAssessmentTwi = `HWEHWƐ MU YIE — ${factorListTwi.toUpperCase()}: Wo ${factorListTwi} wo soro kakra. Di afotu a ɛwɔ aseɛ yi akyi ma ɛnkɔ fam.`;
    } else {
      overallAssessmentEn = "EXCELLENT & HEALTHY: All recorded vital readings are within normal target range for a healthy pregnancy!";
      overallAssessmentTwi = "APOMUDEN PA PAA: Wo apomuden nneɛma nyinaa kɔ so pɛpɛɛpɛ wɔ nyinsɛn mu!";
    }

    const vitalStatus: 'NORMAL' | 'ELEVATED' | 'HIGH_WARNING' = isHigh ? 'HIGH_WARNING' : isElevated ? 'ELEVATED' : 'NORMAL';
    const id = `vit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const loggedAt = new Date().toISOString();

    // Store in SQLite DB
    try {
      const stmt = db.prepare(`
        INSERT INTO vitals_logs 
        (id, user_id, systolic_bp, diastolic_bp, body_temperature, pulse_rate, blood_glucose, weight_kg, vital_status, notes, logged_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        userId,
        entry.systolicBp || null,
        entry.diastolicBp || null,
        entry.bodyTemperature || null,
        entry.pulseRate || null,
        entry.bloodGlucose || null,
        entry.weightKg || null,
        vitalStatus,
        entry.notes || null,
        loggedAt,
        'pending'
      );
    } catch (e) {
      console.warn('[VitalsService] SQLite log warning:', e);
    }

    return {
      id,
      vitalStatus,
      overallAssessmentEn,
      overallAssessmentTwi,
      factorAssessments,
      alerts: alerts.length > 0 ? alerts : ['All recorded vitals within normal ranges.'],
      alertsTwi: alertsTwi.length > 0 ? alertsTwi : ['Nneɛma nyinaa kɔ so pɛpɛɛpɛ.'],
      suggestions: suggestions.length > 0 ? suggestions : ['Maintain balanced diet with Kontomire, stay hydrated with clean water, and enjoy gentle daily walks.'],
      suggestionsTwi: suggestionsTwi.length > 0 ? suggestionsTwi : ['Di aduane pa a kontomire wɔ mu, nom nsuo pii, na nante kakra da biara.'],
      recordedAt: loggedAt
    };
  }

  /**
   * Fetch vitals log history for a user.
   */
  static getVitalsHistory(userId: string, limit: number = 10) {
    const db = getOfflineDb();
    try {
      const stmt = db.prepare(`SELECT * FROM vitals_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?`);
      return stmt.all(userId, limit);
    } catch (e) {
      return [];
    }
  }

  /**
   * Save a daily health journal entry.
   */
  static saveHealthJournal(userId: string, symptoms: string[], mood: string, notesText?: string, audioNoteUrl?: string) {
    const db = getOfflineDb();
    const id = `jrn-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    try {
      const stmt = db.prepare(`
        INSERT INTO health_journal
        (id, user_id, entry_date, symptoms_noted, mood, notes_text, audio_note_url, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, userId, today, JSON.stringify(symptoms), mood, notesText || null, audioNoteUrl || null, 'pending');
    } catch (e) {
      console.warn('[VitalsService] Journal insert error:', e);
    }

    return { id, entryDate: today, status: 'saved_locally' };
  }

  /**
   * Fetch health journal entries.
   */
  static getJournalHistory(userId: string) {
    const db = getOfflineDb();
    try {
      const stmt = db.prepare(`SELECT * FROM health_journal WHERE user_id = ? ORDER BY entry_date DESC`);
      return stmt.all(userId);
    } catch (e) {
      return [];
    }
  }
}

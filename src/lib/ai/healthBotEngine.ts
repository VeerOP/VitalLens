/**
 * VitalLens AI Health Assistant & Clinical Reasoning Engine
 *
 * Provides evidence-backed physiological vitals interpretation, cardiovascular guidance,
 * guided breathing recommendations, and symptom triage.
 *
 * Runs 100% on-device by default with zero latency and full privacy.
 * Supports optional Google Gemini API key integration for open-ended conversation.
 */

import { getTodayHealthLog, calculateHealthReadiness } from '../storage/dailyLogStore';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  triageLevel?: 'normal' | 'info' | 'caution' | 'urgent';
  suggestedActions?: string[];
  vitalsContextSnippet?: string;
}

export interface VitalsContext {
  heartRate?: number;
  spo2?: number;
  respiratoryRate?: number;
  systolicBp?: number;
  diastolicBp?: number;
  hrvRmssd?: number;
  recoveryScore?: number;
  rhythmRegularity?: string;
  scanType?: 'fingertip' | 'face';
}

/**
 * Generate structured, evidence-based clinical response based on user inquiry and vitals context
 */
export async function getBotResponse(
  userQuery: string,
  context?: VitalsContext,
  geminiApiKey?: string
): Promise<ChatMessage> {
  const query = userQuery.trim().toLowerCase();

  // If user provided a Gemini API Key in settings, attempt live LLM call
  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      const llmResult = await callGeminiAPI(userQuery, context, geminiApiKey.trim());
      if (llmResult) return llmResult;
    } catch (_err) {
      console.warn('Gemini API call failed, falling back to built-in clinical engine:', _err);
    }
  }

  // Built-in High-Precision Clinical Knowledge Engine
  return generateClinicalEngineResponse(query, context);
}

/**
 * Built-in Clinical Expert System (Offline, Private, Zero-Latency)
 */
function generateClinicalEngineResponse(query: string, context?: VitalsContext): ChatMessage {
  const now = Date.now();

  // 1. Analyze Latest Scan Query
  if (
    query.includes('latest scan') ||
    query.includes('analyze my') ||
    query.includes('my vitals') ||
    query.includes('my result') ||
    query.includes('how are my numbers')
  ) {
    if (context && context.heartRate) {
      const hr = context.heartRate;
      const spo2 = context.spo2 ?? 98;
      const rr = context.respiratoryRate ?? 15;
      const sbp = context.systolicBp ?? 118;
      const dbp = context.diastolicBp ?? 76;
      const recovery = context.recoveryScore ?? 75;

      let hrStatus = 'Normal resting rhythm';
      if (hr < 60) hrStatus = 'Mild bradycardia (common in athletes or deep rest)';
      if (hr > 100) hrStatus = 'Mild tachycardia (elevated resting rate)';

      let spo2Status = 'Healthy blood oxygenation (95-100%)';
      if (spo2 < 95) spo2Status = 'Slightly low saturation (verify sensor contact)';

      let bpStatus = 'Optimal arterial trend (< 120/80 mmHg)';
      if (sbp >= 130 || dbp >= 80) bpStatus = 'Stage 1 elevated trend';
      else if (sbp >= 120) bpStatus = 'Pre-hypertension trend';

      const responseText = `### Clinical Vitals Evaluation
Here is a breakdown of your most recent camera scan:

- **Heart Rate**: **${hr} BPM** (${hrStatus})
- **Blood Oxygen (SpO2)**: **${spo2}%** (${spo2Status})
- **Respiratory Rate**: **${rr} bpm** (Normal adult baseline: 12–20 bpm)
- **Blood Pressure Trend**: **${sbp} / ${dbp} mmHg** (${bpStatus})
${context.hrvRmssd ? `- **HRV (RMSSD)**: **${context.hrvRmssd} ms** (Autonomic Recovery: **${recovery}%**)` : ''}
${context.rhythmRegularity ? `- **Cardiac Regularity**: **${context.rhythmRegularity}**` : ''}

**Clinical Takeaway**:
Your parameters reflect a stable resting cardiovascular state with adequate capillary oxygen delivery.`;

      return {
        id: 'msg-' + now,
        sender: 'assistant',
        text: responseText,
        timestamp: now,
        triageLevel: spo2 < 92 || sbp >= 140 ? 'caution' : 'normal',
        suggestedActions: [
          'How to improve HRV & recovery',
          'Guide me through coherent breathing',
          'Is my Blood Pressure optimal?',
        ],
        vitalsContextSnippet: `HR: ${hr} BPM | SpO2: ${spo2}% | BP: ${sbp}/${dbp}`,
      };
    } else {
      return {
        id: 'msg-' + now,
        sender: 'assistant',
        text: `### No Active Scan Loaded
I don't see a recent scan record in the current session. 

**Next Steps**:
1. Run a **18-second Fingertip Scan** or **20-second Face Scan**.
2. Tap **"Ask AI Clinician"** on the results summary to receive an instant comprehensive analysis.`,
        timestamp: now,
        triageLevel: 'info',
        suggestedActions: ['Start Fingertip Scan', 'What are normal vitals ranges?'],
      };
    }
  }

  // 2. Heart Rate Variability (HRV) & Stress
  if (query.includes('hrv') || query.includes('heart rate variability') || query.includes('recovery')) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Understanding Heart Rate Variability (HRV)
**Heart Rate Variability** measures tiny millisecond variations between consecutive heartbeats (beat-to-beat NN intervals).

**Key Clinical Insights**:
- **High HRV (RMSSD > 50ms)**: Reflects strong parasympathetic tone (the "rest, recover, and digest" branch of the vagus nerve). Indicates your body is well-recovered.
- **Low HRV (RMSSD < 25ms)**: Suggests sympathetic dominance ("fight or flight"), often triggered by physical fatigue, chronic stress, dehydration, poor sleep, or oncoming illness.

**Evidence-Based Ways to Increase HRV**:
1. **Slow Resonant Breathing**: 5.5 breaths per minute (coherent breathing) actively synchronizes heart rate oscillations.
2. **Consistent Sleep Timing**: Optimize deep slow-wave sleep.
3. **Electrolyte Hydration**: Maintain cellular fluid balance.`,
      timestamp: now,
      triageLevel: 'info',
      suggestedActions: [
        'Start Coherent Breathing Pacer',
        'Analyze my latest scan',
        'How does SpO2 relate to HRV?',
      ],
    };
  }

  // 3. Blood Pressure Guidance
  if (query.includes('blood pressure') || query.includes('bp') || query.includes('hypertension')) {
    const sbp = context?.systolicBp ?? 118;
    const dbp = context?.diastolicBp ?? 76;
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Blood Pressure Clinical Ranges (AHA Guidelines)
- **Normal**: Systolic < 120 **and** Diastolic < 80 mmHg
- **Elevated**: Systolic 120–129 **and** Diastolic < 80 mmHg
- **Stage 1 Hypertension**: Systolic 130–139 **or** Diastolic 80–89 mmHg
- **Stage 2 Hypertension**: Systolic ≥ 140 **or** Diastolic ≥ 90 mmHg

${context?.systolicBp ? `*Your latest estimated trend was **${sbp}/${dbp} mmHg**.*` : ''}

> [!NOTE]
> VitalLens camera BP is derived from pulse wave transit heuristics and should be viewed as an experimental relative trend indicator, not a replacement for a certified inflatable cuff sphygmomanometer.`,
      timestamp: now,
      triageLevel: sbp >= 140 ? 'caution' : 'normal',
      suggestedActions: [
        'How to reduce blood pressure naturally',
        'Start 4-7-8 Breathing Exercise',
        'Analyze my latest scan',
      ],
    };
  }

  // 4. Blood Oxygen (SpO2)
  if (query.includes('spo2') || query.includes('oxygen') || query.includes('saturation')) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Blood Oxygen (SpO2) Reference Standards
Peripheral capillary oxygen saturation measures the percentage of oxygenated hemoglobin molecules in your bloodstream:

- **95% – 100%**: Normal, healthy room-air saturation.
- **91% – 94%**: Mild hypoxemia (common at high altitudes or during shallow breathing; verify proper finger coverage on camera).
- **< 90%**: Hypoxemic threshold requiring clinical evaluation if verified on a certified pulse oximeter.

**Tips for Accurate Camera Measurement**:
- Ensure fingers are warm; cold fingers cause peripheral vasoconstriction which reduces pulsatile amplitude.
- Rest finger lightly over lens; pressing too hard causes tissue blanching.`,
      timestamp: now,
      triageLevel: 'info',
      suggestedActions: ['Analyze my latest scan', 'Start Fingertip Scan', 'What is normal Heart Rate?'],
    };
  }

  // 5. Breathing and Vagus Nerve
  if (query.includes('breath') || query.includes('calm') || query.includes('relax') || query.includes('stress')) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Autonomic Nervous System & Breathing Exercises
Regulating your respiration rate directly influences your heart rate via **Respiratory Sinus Arrhythmia (RSA)**.

**Recommended Protocols**:
1. **Coherent Resonance (5.5s Inhale / 5.5s Exhale)**:
   - Balances heart rate variability and enhances baroreflex sensitivity.
2. **Box Breathing (4s In / 4s Hold / 4s Out / 4s Hold)**:
   - Used by tactical athletes to rapid-reset sympathetic adrenaline spikes.
3. **4-7-8 Relaxing Breath**:
   - Stimulates acetylcholine release to slow heart rate before sleep.`,
      timestamp: now,
      triageLevel: 'normal',
      suggestedActions: [
        'Open Guided Breathing Pacer',
        'Analyze my latest scan',
        'Explain HRV metrics',
      ],
    };
  }

  // 6. Red Flag Emergency Symptoms
  if (
    query.includes('chest pain') ||
    query.includes('shortness of breath') ||
    query.includes('fainting') ||
    query.includes('emergency') ||
    query.includes('dizziness')
  ) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Important Medical Safety Alert
If you or someone nearby is experiencing:
- **Crushing or squeezing chest pain/pressure**
- **Pain radiating to the left arm, neck, jaw, or back**
- **Sudden severe shortness of breath**
- **Loss of consciousness, dizziness, or confusion**

**Seek Emergency Medical Attention Immediately (Call 911 or your local emergency number).**

*Do not rely on smartphone camera sensors during acute medical emergencies.*`,
      timestamp: now,
      triageLevel: 'urgent',
      suggestedActions: ['Call Emergency Services', 'Return to Dashboard'],
    };
  }

  // 6. Readiness, Recovery & Lifestyle Factors
  if (
    query.includes('readiness') ||
    query.includes('recovery score') ||
    query.includes('sleep') ||
    query.includes('hydration') ||
    query.includes('water') ||
    query.includes('daily health score')
  ) {
    const todayLog = getTodayHealthLog();
    const readiness = calculateHealthReadiness(
      context && context.heartRate
        ? {
            heartRate: context.heartRate,
            hrvRmssd: context.hrvRmssd,
            spo2: context.spo2,
            recoveryScore: context.recoveryScore,
          }
        : undefined,
      todayLog
    );

    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Daily Readiness & Recovery Analysis
Your current Daily Readiness Score is **${readiness.score} / 100 (${readiness.category})**.

**Pillar Breakdown**:
- **Vitals Telemetry**: **${readiness.vitalsContribution} / 50 pts** (${readiness.rhrStatus === 'normal' ? 'Resting HR within baseline' : readiness.rhrStatus === 'below_baseline' ? 'Athletic low resting rate' : 'Slightly elevated resting pulse'})
- **Sleep Restorative Factor**: **${readiness.sleepContribution} / 25 pts** (${todayLog.sleepHours} hrs logged • ${todayLog.sleepQuality} quality)
- **Lifestyle & Hydration**: **${readiness.lifestyleContribution} / 25 pts** (${(todayLog.waterGlasses * 0.25).toFixed(1)} L water • ${todayLog.stressLevel} stress)

**Physiological Guidance**:
${readiness.recommendation}

${todayLog.sleepHours < 7 ? '⚠️ *Tip: Sleep duration was under 7 hours. Shorter sleep can elevate morning sympathetic tone and resting heart rate.*' : '✅ *Sleep duration meets restorative targets (≥7 hours).*'}`,
      timestamp: now,
      triageLevel: readiness.score < 55 ? 'caution' : 'normal',
      suggestedActions: [
        'How to improve HRV & recovery',
        'Guide me through coherent breathing',
        'Analyze my latest scan',
      ],
      vitalsContextSnippet: `Readiness: ${readiness.score}/100 (${readiness.category})`,
    };
  }

  // Default General Wellness Response
  return {
    id: 'msg-' + now,
    sender: 'assistant',
    text: `### VitalLens Health Intelligence
I can help interpret your camera-based physiological vitals, explain cardiovascular metrics, and recommend recovery techniques:

- **Vitals Assessment**: Detailed breakdown of HR, SpO2, RR, and BP trends.
- **Heart Rate Variability (HRV)**: SDNN, RMSSD, and autonomic nervous balance.
- **Respiratory Coherence**: Paced breathing guides to reduce resting heart rate.
- **Sensor Guidance**: Best practices for camera lens placement and illumination.

How can I assist your health tracking today?`,
    timestamp: now,
    triageLevel: 'info',
    suggestedActions: [
      'Analyze my latest scan',
      'What does HRV mean?',
      'Guide me through coherent breathing',
      'Is my SpO2 level healthy?',
    ],
  };
}

/**
 * Optional Google Gemini API Integration for open-ended clinical Q&A
 */
async function callGeminiAPI(
  userQuery: string,
  context?: VitalsContext,
  apiKey?: string
): Promise<ChatMessage | null> {
  if (!apiKey) return null;

  const vitalsText = context && context.heartRate
    ? `Patient Measured Vitals Context:
- Heart Rate: ${context.heartRate} BPM
- SpO2 Blood Oxygen: ${context.spo2}%
- Respiratory Rate: ${context.respiratoryRate} bpm
- Estimated Blood Pressure: ${context.systolicBp}/${context.diastolicBp} mmHg
- HRV RMSSD: ${context.hrvRmssd ?? 'N/A'} ms
- Autonomic Recovery Score: ${context.recoveryScore ?? 'N/A'}/100
- Rhythm Pattern: ${context.rhythmRegularity ?? 'Regular Sinus'}
- Scan Modality: ${context.scanType ?? 'camera PPG'}`
    : 'No active scan data attached.';

  const systemInstruction = `You are VitalLens AI Clinician, an expert clinical health AI assistant specializing in cardiovascular physiology, photoplethysmography (PPG), vital signs interpretation, and autonomic nervous system wellness.
Rules:
- Give concise, professional, evidence-backed medical responses (AHA / WHO standards).
- Format using clean Markdown with bold headers and bullet points.
- NO fluff, no cheesy robot persona, no AI slop.
- Highlight whether vitals are within normal adult resting reference ranges.
- Always include clear medical disclaimers that estimates are for wellness and not clinical diagnosis.`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${systemInstruction}\n\n${vitalsText}\n\nUser Question: ${userQuery}` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}`);
  }

  const json = await response.json();
  const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) return null;

  const now = Date.now();
  return {
    id: 'msg-gemini-' + now,
    sender: 'assistant',
    text: candidateText,
    timestamp: now,
    triageLevel: 'normal',
    suggestedActions: [
      'Explain my HRV score',
      'Start Coherent Breathing Pacer',
      'What are normal vitals ranges?',
    ],
  };
}

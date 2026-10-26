/**
 * VitalLens AI Health Assistant & Clinical Reasoning Engine
 *
 * Provides evidence-backed physiological vitals interpretation, cardiovascular guidance,
 * guided breathing recommendations, and symptom triage.
 *
 * Supports Google Gemini API integration (2.5 Flash, 2.0 Flash, 1.5 Flash) with seamless
 * multi-turn dialogue, real-time connection validation, and built-in offline clinical fallback.
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
  isAiGenerated?: boolean;
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

const CANDIDATE_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

/**
 * Clean and sanitize a Gemini API key (remove quotes, Bearer prefix, whitespace, smart quotes)
 */
export function cleanGeminiKey(key?: string): string {
  if (!key) return '';
  return key
    .trim()
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

/**
 * Test & validate a Google Gemini API key by making a lightweight ping to the API
 */
export async function validateGeminiKey(apiKey: string): Promise<{
  success: boolean;
  model?: string;
  error?: string;
  latencyMs?: number;
}> {
  const clean = cleanGeminiKey(apiKey);
  if (!clean || clean.length < 10) {
    return { success: false, error: 'API key is too short or empty.' };
  }

  const startTime = performance.now();
  let lastError = '';

  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${clean}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
          }),
        }
      );

      if (resp.ok) {
        const latencyMs = Math.round(performance.now() - startTime);
        return { success: true, model, latencyMs };
      }

      const errJson = await resp.json().catch(() => null);
      lastError = errJson?.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;

      // If Google explicitly rejected the key as invalid, stop trying other models
      if (
        lastError.toLowerCase().includes('api key not valid') ||
        lastError.toLowerCase().includes('api_key_invalid') ||
        resp.status === 400
      ) {
        return {
          success: false,
          error: 'Invalid API key. Please check that you copied a valid key from Google AI Studio.',
        };
      }
    } catch (e: any) {
      lastError = e?.message || 'Network request failed';
    }
  }

  return { success: false, error: lastError || 'Failed to connect to Google Gemini API.' };
}

/**
 * Generate structured, evidence-based clinical response based on user inquiry, vitals context,
 * and optional live Gemini AI LLM reasoning.
 */
export async function getBotResponse(
  userQuery: string,
  context?: VitalsContext,
  geminiApiKey?: string,
  history?: ChatMessage[]
): Promise<ChatMessage> {
  const query = userQuery.trim();
  const savedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('vitallens_gemini_key') || '' : '';
  const cleanKey = cleanGeminiKey(geminiApiKey || savedKey);

  // 1. If user provided a Gemini API Key, attempt live LLM call with fallbacks
  if (cleanKey.length > 10) {
    try {
      const llmResult = await callGeminiAPI(query, context, cleanKey, history);
      if (llmResult) return llmResult;
    } catch (_err: any) {
      console.warn('Gemini API call failed, falling back to built-in clinical engine:', _err?.message || _err);
    }
  }

  // 2. Built-in High-Precision Clinical Knowledge Engine
  return generateClinicalEngineResponse(query.toLowerCase(), context);
}

/**
 * Call Google Gemini REST API with candidate model fallbacks and multi-turn context
 */
async function callGeminiAPI(
  userQuery: string,
  context?: VitalsContext,
  apiKey?: string,
  history?: ChatMessage[]
): Promise<ChatMessage | null> {
  const cleanKey = cleanGeminiKey(apiKey);
  if (!cleanKey) return null;

  const vitalsText = context && context.heartRate
    ? `Patient Measured Vitals Context:
- Heart Rate: ${context.heartRate} BPM
- SpO2 Blood Oxygen: ${context.spo2 ?? 98}%
- Respiratory Rate: ${context.respiratoryRate ?? 15} bpm
- Estimated Blood Pressure: ${context.systolicBp ?? 118}/${context.diastolicBp ?? 76} mmHg
- HRV RMSSD: ${context.hrvRmssd ? `${context.hrvRmssd} ms` : 'N/A'}
- Autonomic Recovery Score: ${context.recoveryScore ? `${context.recoveryScore}/100` : 'N/A'}
- Cardiac Rhythm: ${context.rhythmRegularity ?? 'Regular Sinus'}
- Scan Modality: ${context.scanType ?? 'camera PPG'}`
    : 'No active scan data attached.';

  const systemInstruction = `You are VitalLens AI Clinician, an expert clinical health AI assistant specializing in cardiovascular physiology, photoplethysmography (PPG), vital signs interpretation, and autonomic nervous system wellness.

Core Clinical Guidelines:
1. Answer the user's specific inquiry directly in the first sentence with clear numbers and clinical reference ranges (AHA / WHO standards).
2. For questions regarding optimal heart rate, explain:
   - Normal adult resting range: 60–100 BPM
   - Optimal resting cardiovascular target: 50–70 BPM
   - Athletic conditioned baseline: 40–60 BPM
   - Low (bradycardia < 60 BPM) vs elevated (tachycardia > 100 BPM)
   - If patient vitals telemetry is attached, compare their actual reading to these standards.
3. Structure your response with clean Markdown: use bold text for key terms and bullet points for lists.
4. Keep answers concise, actionable, empathetic, and evidence-based (typically 2 to 3 short paragraphs).
5. Always remind the user that camera PPG measurements are for wellness screening and lifestyle guidance, not diagnostic substitutes for clinical emergency medical hardware.`;

  // Build conversational turns for Gemini
  const chatContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Include recent conversation history for multi-turn context
  if (history && history.length > 0) {
    const recent = history.slice(-6);
    for (const msg of recent) {
      if (msg.sender === 'user') {
        chatContents.push({
          role: 'user',
          parts: [{ text: msg.text }],
        });
      } else if (msg.sender === 'assistant' && !msg.id.includes('init')) {
        chatContents.push({
          role: 'model',
          parts: [{ text: msg.text }],
        });
      }
    }
  }

  // Attach current user query with vitals telemetry
  const queryWithContext = `${vitalsText}\n\nUser Inquiry: ${userQuery}`;
  chatContents.push({
    role: 'user',
    parts: [{ text: queryWithContext }],
  });

  // Try candidate models in order of capability
  let lastError: Error | null = null;

  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const payload: any = {
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: chatContents,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 800,
          topP: 0.95,
        },
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`Model ${model} returned ${response.status}:`, errorText);
        // If 404 or model not available for this key, fall through to next candidate model
        if (response.status === 404 || response.status === 503) {
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const candidate = json.candidates?.[0];
      const parts = candidate?.content?.parts;
      const candidateText = Array.isArray(parts)
        ? parts.map((p: any) => p.text || '').filter(Boolean).join('\n').trim()
        : '';

      if (!candidateText) {
        continue;
      }

      const now = Date.now();
      const suggestedActions = getSuggestedActionsForQuery(userQuery);

      return {
        id: 'msg-gemini-' + now,
        sender: 'assistant',
        text: candidateText,
        timestamp: now,
        triageLevel: detectTriageLevel(userQuery, candidateText),
        suggestedActions,
        vitalsContextSnippet: `Gemini AI (${model})`,
        isAiGenerated: true,
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  return null;
}

/**
 * Determine dynamic follow-up suggestion chips based on the topic
 */
function getSuggestedActionsForQuery(query: string): string[] {
  const q = query.toLowerCase();
  if (q.includes('heart') || q.includes('pulse') || q.includes('bpm')) {
    return [
      'How to lower resting heart rate',
      'Guide me through coherent breathing',
      'Analyze my latest scan',
      'What does HRV mean?',
    ];
  }
  if (q.includes('pressure') || q.includes('bp') || q.includes('hypertension')) {
    return [
      'How to reduce blood pressure naturally',
      'Start 4-7-8 Breathing Exercise',
      'Analyze my latest scan',
    ];
  }
  if (q.includes('spo2') || q.includes('oxygen')) {
    return [
      'Tips for accurate camera PPG',
      'Analyze my latest scan',
      'What is normal Heart Rate?',
    ];
  }
  if (q.includes('breath') || q.includes('calm') || q.includes('vagus')) {
    return [
      'Start Coherent Breathing Pacer',
      'Explain HRV & vagus nerve',
      'Analyze my latest scan',
    ];
  }
  return [
    'Analyze my latest scan',
    'What heart rate is optimal?',
    'What does HRV mean?',
    'Guide me through coherent breathing',
  ];
}

/**
 * Detect triage severity level from query or content
 */
function detectTriageLevel(query: string, text: string): 'normal' | 'info' | 'caution' | 'urgent' {
  const combined = (query + ' ' + text).toLowerCase();
  if (
    combined.includes('emergency') ||
    combined.includes('chest pain') ||
    combined.includes('call 911') ||
    combined.includes('shortness of breath')
  ) {
    return 'urgent';
  }
  if (combined.includes('stage 2') || combined.includes('hypertension') || combined.includes('hypoxemia')) {
    return 'caution';
  }
  return 'normal';
}

/**
 * Built-in Clinical Expert System (Offline, Private, Zero-Latency)
 */
function generateClinicalEngineResponse(query: string, context?: VitalsContext): ChatMessage {
  const now = Date.now();

  // 1. Red Flag Emergency Symptoms
  if (
    query.includes('chest pain') ||
    query.includes('shortness of breath') ||
    query.includes('fainting') ||
    query.includes('emergency') ||
    query.includes('heart attack') ||
    query.includes('dizziness')
  ) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Medical Safety Alert
If you or someone nearby is experiencing acute symptoms such as:
- Crushing or squeezing chest discomfort or pressure
- Radiating pain to the left arm, shoulder, jaw, neck, or back
- Severe sudden shortness of breath or lightheadedness
- Fainting, confusion, or cold sweats

**Seek Emergency Medical Attention Immediately (Call 911 or your local emergency number).**

> [!WARNING]
> Smartphone camera PPG sensors are designed solely for resting wellness tracking and should never be used in acute medical emergencies.`,
      timestamp: now,
      triageLevel: 'urgent',
      suggestedActions: ['Call Emergency Services', 'Return to Dashboard'],
    };
  }

  // 2. Heart Rate, Pulse, Optimal HR & BPM Guidance
  if (
    query.includes('heart rate') ||
    query.includes('heartrate') ||
    query.includes('pulse') ||
    query.includes('bpm') ||
    query.includes('optimal hr') ||
    query.includes('resting hr') ||
    query.includes('normal hr') ||
    query.includes('tachycardia') ||
    query.includes('bradycardia') ||
    query.includes('beats per minute')
  ) {
    const hr = context?.heartRate;
    let readingContext = '';

    if (hr) {
      let hrAssessment = 'within normal resting parameters';
      if (hr < 60) hrAssessment = 'indicative of athletic conditioning or deep relaxation';
      else if (hr <= 70) hrAssessment = 'within the optimal cardiovascular longevity zone';
      else if (hr <= 80) hrAssessment = 'well within healthy normal limits';
      else if (hr <= 100) hrAssessment = 'normal, but slightly elevated; paced breathing can help calm it';
      else hrAssessment = 'elevated (mild resting tachycardia)';

      readingContext = `\n\n**Your Current Camera Reading**:
Your latest recorded heart rate is **${hr} BPM**, which is ${hrAssessment}.`;
    }

    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Optimal Heart Rate Reference Standards
According to the American Heart Association (AHA) and cardiovascular physiology standards, here is how resting heart rate (RHR) is categorized for adults:

- **Optimal Resting Target**: **50 to 70 BPM** (Associated with peak cardiovascular fitness, high stroke volume, and superior long-term heart health).
- **Standard Normal Range**: **60 to 100 BPM** (The clinical diagnostic baseline for healthy adults at rest).
- **Athletic Baseline**: **40 to 60 BPM** (Conditioned athletes typically develop physiological sinus bradycardia due to strong vagal parasympathetic tone).
- **Elevated / Tachycardia**: **> 100 BPM at rest** (Can be triggered by acute stress, dehydration, caffeine, lack of sleep, or fever).
- **Low / Bradycardia**: **< 60 BPM** (Healthy in athletes; review with a physician if accompanied by fatigue or lightheadedness).

**Exercise Target Training Zones (AHA Guidelines)**:
- **Moderate Aerobic Zone (50%–70% Max)**: \`(220 - Age) × 0.50\` to \`0.70\`
- **Vigorous Cardiovascular Zone (70%–85% Max)**: \`(220 - Age) × 0.70\` to \`0.85\`${readingContext}`,
      timestamp: now,
      triageLevel: hr && (hr > 100 || hr < 45) ? 'caution' : 'normal',
      suggestedActions: [
        'How to lower resting heart rate',
        'Guide me through coherent breathing',
        'Analyze my latest scan',
        'What does HRV mean?',
      ],
      vitalsContextSnippet: hr ? `HR: ${hr} BPM (Optimal: 50-70 BPM)` : undefined,
    };
  }

  // 3. How to lower heart rate / Calm down
  if (
    query.includes('lower heart rate') ||
    query.includes('lower hr') ||
    query.includes('reduce pulse') ||
    query.includes('calm down') ||
    query.includes('slow down heart')
  ) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Evidence-Based Protocols to Lower Heart Rate
You can activate the vagus nerve and parasympathetic system to rapidly reduce heart rate using physiological techniques:

- **Coherent Resonant Breathing**: Inhale slowly for 5.5 seconds through the nose, then exhale smoothly for 5.5 seconds. This stimulates the baroreceptor reflex and lowers pulse within 2 minutes.
- **Electrolyte Hydration**: Drink a glass of water. Mild dehydration reduces blood volume, forcing the heart to beat faster to maintain cardiac output.
- **Cool Facial Splash**: Splashing cool water on your face triggers the **mammalian dive reflex**, causing acetylcholine release that slows sinoatrial nodal firing.
- **Postural Adjustment**: Sit upright with your back supported and uncross your legs to reduce systemic vascular resistance.`,
      timestamp: now,
      triageLevel: 'normal',
      suggestedActions: [
        'Start Coherent Breathing Pacer',
        'What heart rate is optimal?',
        'Analyze my latest scan',
      ],
    };
  }

  // 4. Analyze Latest Scan Query
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
      if (hr < 60) hrStatus = 'Athletic low resting rate';
      else if (hr <= 70) hrStatus = 'Optimal cardiovascular longevity target';
      else if (hr > 100) hrStatus = 'Elevated resting rate (tachycardia)';

      let spo2Status = 'Healthy blood oxygenation (95-100%)';
      if (spo2 < 95) spo2Status = 'Slightly low saturation (verify sensor coverage)';

      let bpStatus = 'Optimal arterial trend (< 120/80 mmHg)';
      if (sbp >= 130 || dbp >= 80) bpStatus = 'Stage 1 elevated trend';
      else if (sbp >= 120) bpStatus = 'Pre-hypertension trend';

      const responseText = `### Clinical Vitals Evaluation
Here is an analysis of your latest camera scan:

- **Heart Rate**: **${hr} BPM** (${hrStatus})
- **Blood Oxygen (SpO2)**: **${spo2}%** (${spo2Status})
- **Respiratory Rate**: **${rr} bpm** (Normal adult baseline: 12–20 bpm)
- **Blood Pressure Trend**: **${sbp} / ${dbp} mmHg** (${bpStatus})
${context.hrvRmssd ? `- **HRV (RMSSD)**: **${context.hrvRmssd} ms** (Autonomic Recovery: **${recovery}%**)` : ''}
${context.rhythmRegularity ? `- **Cardiac Regularity**: **${context.rhythmRegularity}**` : ''}

**Clinical Takeaway**:
Your cardiovascular telemetry reflects a stable resting physiological state with healthy peripheral capillary oxygen saturation.`;

      return {
        id: 'msg-' + now,
        sender: 'assistant',
        text: responseText,
        timestamp: now,
        triageLevel: spo2 < 92 || sbp >= 140 ? 'caution' : 'normal',
        suggestedActions: [
          'What heart rate is optimal?',
          'How to improve HRV & recovery',
          'Guide me through coherent breathing',
        ],
        vitalsContextSnippet: `HR: ${hr} BPM | SpO2: ${spo2}% | BP: ${sbp}/${dbp}`,
      };
    } else {
      return {
        id: 'msg-' + now,
        sender: 'assistant',
        text: `### No Active Scan Loaded
No recent scan record was detected in the active session.

**Next Steps**:
- Run an **18-second Fingertip Scan** or **20-second Face Scan**.
- Tap **"Ask AI Clinician"** on your results summary for instant physiological telemetry interpretation.`,
        timestamp: now,
        triageLevel: 'info',
        suggestedActions: ['Start Fingertip Scan', 'What heart rate is optimal?'],
      };
    }
  }

  // 5. Normal Vitals Reference Overview
  if (
    query.includes('normal range') ||
    query.includes('normal vitals') ||
    query.includes('healthy numbers') ||
    query.includes('are my vitals normal') ||
    query.includes('reference ranges')
  ) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Standard Adult Vitals Reference Ranges (AHA / WHO)
Here is the baseline reference framework for healthy resting adults:

- **Resting Heart Rate**: **60 to 100 BPM** (Optimal target: **50 to 70 BPM**)
- **Blood Oxygen (SpO2)**: **95% to 100%** on room air (Mild hypoxemia below 94%)
- **Blood Pressure**: **< 120 / 80 mmHg** (Pre-hypertension at 120–129 mmHg systolic)
- **Respiratory Rate**: **12 to 20 breaths/min** at rest
- **Heart Rate Variability (RMSSD)**: **30 to 70+ ms** (Higher reflects greater parasympathetic autonomic recovery)`,
      timestamp: now,
      triageLevel: 'info',
      suggestedActions: [
        'Analyze my latest scan',
        'What heart rate is optimal?',
        'How does camera PPG work?',
      ],
    };
  }

  // 6. Camera PPG Technology Explanation
  if (
    query.includes('how does camera') ||
    query.includes('camera ppg') ||
    query.includes('photoplethysmography') ||
    query.includes('how it works')
  ) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### How VitalLens Camera Photoplethysmography (PPG) Works
VitalLens captures real-time physiological vitals using your smartphone camera and flashlight:

- **Transdermal Optical Sensing**: When you place your finger on the camera with the torch illuminated, the light penetrates subcutaneous microvascular beds.
- **Volumetric Pulsatile Modulation**: Each heartbeat pushes a wave of oxygenated blood through capillary loops, altering light absorption at 30 to 60 frames per second.
- **DSP Signal Extraction**: VitalLens applies bandpass filtering, Fast Fourier Transform (FFT) peak detection, and peak-to-peak interval analysis to derive pulse rate, SpO2, and HRV.

**Measurement Best Practices**:
- Warm cold hands prior to scanning (vasoconstriction reduces signal amplitude).
- Rest your finger lightly without pressing firmly to avoid tissue blanching.`,
      timestamp: now,
      triageLevel: 'info',
      suggestedActions: ['Start Fingertip Scan', 'What heart rate is optimal?'],
    };
  }

  // 7. Heart Rate Variability (HRV) & Stress
  if (query.includes('hrv') || query.includes('heart rate variability') || query.includes('recovery')) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Understanding Heart Rate Variability (HRV)
**Heart Rate Variability** measures millisecond-level time differences between consecutive heartbeats (beat-to-beat NN intervals).

**Key Clinical Insights**:
- **High HRV (RMSSD > 50ms)**: Reflects robust parasympathetic vagal tone (the "rest, digest, and repair" nervous branch). Indicates high autonomic recovery and stress tolerance.
- **Low HRV (RMSSD < 25ms)**: Reflects sympathetic dominance ("fight or flight"), often driven by sleep deprivation, intense training fatigue, systemic stress, or oncoming illness.

**Ways to Elevate HRV**:
- **Paced Coherent Respiration**: 5.5 breaths per minute actively entrains heart rate oscillations.
- **Sleep Consistency**: Consistent bedtimes maximize restorative slow-wave deep sleep.
- **Hydration & Electrolytes**: Maintain optimal intracellular fluid balance.`,
      timestamp: now,
      triageLevel: 'info',
      suggestedActions: [
        'Start Coherent Breathing Pacer',
        'What heart rate is optimal?',
        'Analyze my latest scan',
      ],
    };
  }

  // 8. Blood Pressure Guidance
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

${context?.systolicBp ? `*Your latest estimated trend was **${sbp} / ${dbp} mmHg**.*` : ''}

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

  // 9. Blood Oxygen (SpO2)
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
      suggestedActions: [
        'Analyze my latest scan',
        'Start Fingertip Scan',
        'What heart rate is optimal?',
      ],
    };
  }

  // 10. Breathing and Vagus Nerve
  if (query.includes('breath') || query.includes('calm') || query.includes('relax') || query.includes('stress')) {
    return {
      id: 'msg-' + now,
      sender: 'assistant',
      text: `### Autonomic Nervous System & Breathing Protocols
Regulating your respiration rate directly influences your heart rate via **Respiratory Sinus Arrhythmia (RSA)**.

**Recommended Protocols**:
- **Coherent Resonance (5.5s Inhale / 5.5s Exhale)**: Balances heart rate variability and enhances baroreflex sensitivity.
- **Box Breathing (4s In / 4s Hold / 4s Out / 4s Hold)**: Rapidly resets sympathetic adrenaline spikes during acute stress.
- **4-7-8 Relaxing Breath**: Stimulates acetylcholine release to slow heart rate before sleep.`,
      timestamp: now,
      triageLevel: 'normal',
      suggestedActions: [
        'Open Guided Breathing Pacer',
        'What heart rate is optimal?',
        'Analyze my latest scan',
      ],
    };
  }

  // 11. Readiness, Recovery & Lifestyle Factors
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
${readiness.recommendation}`,
      timestamp: now,
      triageLevel: readiness.score < 55 ? 'caution' : 'normal',
      suggestedActions: [
        'What heart rate is optimal?',
        'How to improve HRV & recovery',
        'Guide me through coherent breathing',
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

- **Optimal Heart Rate & Pulse**: Guidance on resting ranges (50–70 BPM optimal, 60–100 BPM normal) and training zones.
- **Vitals Assessment**: Detailed breakdown of HR, SpO2, RR, and BP trends.
- **Heart Rate Variability (HRV)**: SDNN, RMSSD, and autonomic nervous balance.
- **Respiratory Coherence**: Paced breathing guides to reduce resting heart rate.

How can I assist your health tracking today?`,
    timestamp: now,
    triageLevel: 'info',
    suggestedActions: [
      'What heart rate is optimal?',
      'Analyze my latest scan',
      'What does HRV mean?',
      'Guide me through coherent breathing',
    ],
  };
}

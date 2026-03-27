/**
 * SAVIOUR LOCAL MEDICAL AI ENGINE
 * A keyword-matching first-aid knowledge system that works 100% offline.
 * Falls back to Gemini when API key is available.
 */

interface MedicalEntry {
  keywords: string[];
  title: string;
  steps: string[];
  warning?: string;
}

const MEDICAL_KB: MedicalEntry[] = [
  {
    keywords: ['cpr', 'cardiac arrest', 'heart stopped', 'no pulse', 'not breathing', 'unresponsive'],
    title: 'CPR (Cardiopulmonary Resuscitation)',
    steps: [
      'Check the scene is safe before approaching the patient.',
      'Tap the person\'s shoulder and shout "Are you OK?" to check responsiveness.',
      'Call emergency services (or ask someone to) immediately.',
      'Place the person on their back on a firm, flat surface.',
      'Place the heel of one hand on the center of the chest (between the nipples).',
      'Place your other hand on top and interlock your fingers.',
      'Push hard and fast — at least 2 inches deep, 100-120 compressions per minute.',
      'After 30 compressions, tilt the head back, lift the chin, and give 2 rescue breaths.',
      'Continue the cycle of 30 compressions and 2 breaths until help arrives or the person starts breathing.',
      'If an AED is available, turn it on and follow the voice prompts.'
    ],
    warning: 'Do NOT stop CPR until professional help arrives or the person begins breathing on their own.'
  },
  {
    keywords: ['choking', 'choke', 'airway blocked', 'cant breathe', 'food stuck', 'heimlich', 'something stuck in throat'],
    title: 'Choking Emergency',
    steps: [
      'Ask the person "Are you choking?" — if they cannot speak, cough, or breathe, act immediately.',
      'Stand behind the person and wrap your arms around their waist.',
      'Make a fist with one hand and place it just above the navel (belly button).',
      'Grasp the fist with your other hand.',
      'Perform quick, upward abdominal thrusts (Heimlich maneuver).',
      'Repeat thrusts until the object is expelled or the person can breathe.',
      'If the person becomes unconscious, lower them to the ground and begin CPR.',
      'For infants: Place face-down on your forearm, give 5 back blows between shoulder blades, then flip and give 5 chest thrusts.',
      'After clearing the airway, seek medical attention even if the person seems fine.'
    ]
  },
  {
    keywords: ['bleeding', 'blood', 'cut', 'wound', 'laceration', 'gash', 'hemorrhage', 'severe bleeding'],
    title: 'Severe Bleeding Control',
    steps: [
      'Put on gloves or use a clean barrier to protect yourself from bloodborne pathogens.',
      'Apply direct, firm pressure to the wound using a clean cloth, gauze, or clothing.',
      'Do NOT remove the cloth if blood soaks through — add more layers on top.',
      'If bleeding is from a limb, elevate it above the level of the heart.',
      'Apply continuous pressure for at least 15 minutes without lifting to check.',
      'If bleeding does not stop, apply pressure to the nearest pressure point (artery).',
      'For life-threatening limb bleeding, apply a tourniquet 2-3 inches above the wound.',
      'Note the time the tourniquet was applied and communicate this to paramedics.',
      'Keep the patient warm and calm — watch for signs of shock (pale skin, rapid breathing, confusion).'
    ],
    warning: 'A tourniquet should only be used for life-threatening bleeding when direct pressure fails.'
  },
  {
    keywords: ['burn', 'burns', 'scalded', 'scald', 'fire burn', 'hot water', 'chemical burn', 'thermal'],
    title: 'Burn Treatment',
    steps: [
      'Remove the person from the heat source and ensure the scene is safe.',
      'Cool the burn under cool (not cold) running water for at least 20 minutes.',
      'Do NOT use ice, butter, toothpaste, or any home remedies on the burn.',
      'Remove any jewelry or tight clothing near the burn before swelling begins.',
      'Cover the burn loosely with a sterile, non-stick bandage or clean cloth.',
      'Do NOT pop any blisters — they protect against infection.',
      'For chemical burns: Brush off dry chemicals first, then flush with water for 20+ minutes.',
      'For electrical burns: Ensure the power source is disconnected before touching the person.',
      'Give over-the-counter pain relief if the person is conscious and not allergic.',
      'Seek emergency medical care for burns larger than the person\'s palm, or on the face, hands, feet, or genitals.'
    ],
    warning: 'Do NOT apply ice directly to a burn — it can cause frostbite and worsen tissue damage.'
  },
  {
    keywords: ['fracture', 'broken bone', 'broken arm', 'broken leg', 'bone break', 'sprain', 'dislocation', 'swollen limb'],
    title: 'Fracture & Bone Injury',
    steps: [
      'Do NOT attempt to realign or straighten the bone.',
      'Immobilize the injured area — use a splint or padding to prevent movement.',
      'For a makeshift splint, use rigid material (board, magazine) padded with cloth, secured with tape or fabric strips.',
      'Apply ice wrapped in cloth to reduce swelling — 20 minutes on, 20 minutes off.',
      'Elevate the injured limb above heart level if possible.',
      'Check circulation below the injury (pulse, skin color, sensation).',
      'If bone is protruding through skin (open fracture), cover with a sterile dressing — do NOT push it back in.',
      'Monitor for signs of shock: pale skin, rapid breathing, dizziness.',
      'Keep the person warm, still, and calm until professional help arrives.'
    ]
  },
  {
    keywords: ['seizure', 'convulsion', 'epilepsy', 'fit', 'fitting', 'shaking uncontrollably'],
    title: 'Seizure Response',
    steps: [
      'Stay calm — most seizures end on their own within 1-3 minutes.',
      'Clear the area around the person of any hard or sharp objects.',
      'Do NOT hold the person down or try to stop their movements.',
      'Do NOT put anything in their mouth — they cannot swallow their tongue.',
      'Place something soft under their head (jacket, pillow).',
      'Time the seizure — if it lasts more than 5 minutes, call emergency services.',
      'Once the seizure stops, gently roll them onto their side (recovery position).',
      'Stay with them and speak calmly — they may be confused when they wake up.',
      'Do NOT give food or water until fully conscious and alert.',
      'Call emergency services if: first seizure, seizure lasts >5 min, person is pregnant, diabetic, or injured.'
    ]
  },
  {
    keywords: ['heart attack', 'chest pain', 'cardiac', 'heart pain', 'angina', 'heart', 'myocardial'],
    title: 'Heart Attack Response',
    steps: [
      'Call emergency services immediately — time is critical.',
      'Have the person sit down and rest in a comfortable position (often semi-upright).',
      'Loosen any tight clothing around the neck and chest.',
      'If the person is not allergic, give them an aspirin (325mg) to chew slowly.',
      'If prescribed nitroglycerin is available, help them take it as directed.',
      'Monitor their breathing and pulse continuously.',
      'If the person becomes unconscious and stops breathing, begin CPR immediately.',
      'If an AED is available, use it — follow the device prompts.',
      'Keep the person calm and reassured — anxiety worsens heart conditions.',
      'Note the time symptoms started and communicate this to paramedics.'
    ],
    warning: 'Heart attack symptoms in women may differ: jaw pain, nausea, extreme fatigue, back pain instead of chest pain.'
  },
  {
    keywords: ['stroke', 'face drooping', 'arm weak', 'speech difficulty', 'slurred speech', 'paralysis one side'],
    title: 'Stroke Response (FAST)',
    steps: [
      'Use FAST to identify a stroke:',
      'F — Face: Ask them to smile. Does one side of the face droop?',
      'A — Arms: Ask them to raise both arms. Does one arm drift downward?',
      'S — Speech: Ask them to repeat a simple phrase. Is speech slurred or strange?',
      'T — Time: If you observe ANY of these signs, call emergency services IMMEDIATELY.',
      'Note the exact time symptoms first appeared — this is critical for treatment.',
      'Do NOT give the person any food, drink, or medication.',
      'Have them lie down with their head slightly elevated.',
      'If unconscious but breathing, place them in the recovery position.',
      'If they stop breathing, begin CPR immediately.'
    ],
    warning: 'Every minute counts with a stroke. Brain tissue dies rapidly without blood flow.'
  },
  {
    keywords: ['poison', 'poisoning', 'ingested', 'swallowed', 'toxic', 'overdose', 'drug overdose', 'chemical ingestion'],
    title: 'Poisoning / Overdose',
    steps: [
      'Call Poison Control or emergency services immediately.',
      'Try to identify what was ingested, how much, and when.',
      'Do NOT induce vomiting unless specifically told to by Poison Control.',
      'If the person is conscious, rinse their mouth with water (do not swallow).',
      'If poison is on skin or eyes, flush with cool running water for 15-20 minutes.',
      'If the person is unconscious but breathing, place them in the recovery position.',
      'If they stop breathing, begin CPR (avoid mouth-to-mouth if the poison is on their lips — use a barrier).',
      'Save any containers, pills, or substances to show paramedics.',
      'Do NOT give activated charcoal unless directed by medical professionals.',
      'Monitor and record vital signs while waiting for help.'
    ]
  },
  {
    keywords: ['allergy', 'allergic reaction', 'anaphylaxis', 'epipen', 'swelling', 'hives', 'throat closing', 'bee sting', 'nut allergy'],
    title: 'Allergic Reaction / Anaphylaxis',
    steps: [
      'Call emergency services immediately if signs of severe reaction (anaphylaxis).',
      'Signs: difficulty breathing, swelling of face/throat, widespread hives, dizziness, rapid pulse.',
      'If the person has an EpiPen (epinephrine auto-injector), help them use it immediately.',
      'Inject into outer thigh — can be given through clothing. Hold for 10 seconds.',
      'Have the person lie down and elevate their legs (unless having trouble breathing — then sit upright).',
      'Loosen tight clothing.',
      'If no improvement in 5-15 minutes and a second EpiPen is available, use it.',
      'If the person stops breathing, begin CPR.',
      'Do NOT give oral medication if the person is having trouble swallowing.',
      'Even if symptoms improve after EpiPen, emergency medical care is still needed.'
    ],
    warning: 'Anaphylaxis can be fatal within minutes. Use the EpiPen FIRST, then call for help.'
  },
  {
    keywords: ['drowning', 'submersion', 'water rescue', 'near drowning', 'pulled from water'],
    title: 'Drowning / Water Emergency',
    steps: [
      'Get the person out of the water safely — use a reaching aid if possible. Do NOT jump in unless trained.',
      'Call emergency services immediately.',
      'Check for breathing. If not breathing, begin CPR immediately.',
      'Do NOT attempt to drain water from lungs — begin chest compressions right away.',
      'If the person vomits, turn them on their side to clear the airway.',
      'Continue CPR until the person starts breathing or paramedics arrive.',
      'Remove wet clothing and cover with warm blankets to prevent hypothermia.',
      'Even if the person recovers and seems fine, seek medical attention — secondary drowning can occur hours later.',
      'Monitor breathing closely for the next 24 hours.'
    ]
  },
  {
    keywords: ['snake bite', 'spider bite', 'scorpion', 'insect bite', 'animal bite', 'dog bite', 'bite'],
    title: 'Bite & Sting Emergency',
    steps: [
      'Move away from the animal/insect to prevent further bites.',
      'Call emergency services for venomous bites (snake, spider, scorpion).',
      'Keep the bitten area below the level of the heart.',
      'Remove any jewelry or tight clothing near the bite before swelling.',
      'Gently clean the wound with soap and water.',
      'Apply a clean bandage. For snake bites, use a pressure immobilization bandage if trained.',
      'Do NOT cut the wound, try to suck out venom, or apply a tourniquet.',
      'Do NOT apply ice directly to the bite.',
      'Try to remember the color, shape, and size of the animal for identification.',
      'Monitor for signs of allergic reaction (difficulty breathing, swelling, hives).',
      'For animal bites (dog, cat): wash thoroughly and seek medical care for rabies evaluation.'
    ]
  },
  {
    keywords: ['pregnancy', 'labor', 'contractions', 'pregnant', 'baby coming', 'water broke', 'delivery', 'childbirth'],
    title: 'Emergency Childbirth / Pregnancy',
    steps: [
      'Call emergency services immediately.',
      'Help the mother lie down on a clean surface. Place pillows under her back if possible.',
      'Do NOT try to delay the delivery — if the baby is coming, let it happen naturally.',
      'Wash your hands thoroughly if time permits.',
      'As the baby\'s head appears, support it gently — do NOT pull.',
      'Check if the umbilical cord is around the baby\'s neck. If so, gently slip it over the head.',
      'Once delivered, wrap the baby in a clean, warm towel and place on the mother\'s chest.',
      'Do NOT cut the umbilical cord — wait for paramedics.',
      'If the baby is not crying, gently rub the back or flick the soles of the feet.',
      'Keep both mother and baby warm. Monitor the mother for heavy bleeding.'
    ],
    warning: 'Do NOT attempt to deliver a breech baby (feet first). Call emergency services and wait.'
  },
  {
    keywords: ['heat stroke', 'heat exhaustion', 'overheating', 'sunstroke', 'hyperthermia', 'too hot'],
    title: 'Heat Stroke / Heat Exhaustion',
    steps: [
      'Move the person to a cool, shaded area immediately.',
      'Call emergency services if body temperature is above 104°F (40°C) or person is confused.',
      'Remove excess clothing.',
      'Cool the person rapidly: apply ice packs to armpits, neck, and groin.',
      'Fan the person while misting skin with cool water.',
      'If conscious and able to swallow, give small sips of cool water.',
      'Do NOT give alcohol or caffeinated beverages.',
      'If the person becomes unconscious, place in recovery position.',
      'Monitor body temperature and continue cooling until it drops below 101°F (38.3°C).'
    ]
  },
  {
    keywords: ['hypothermia', 'too cold', 'freezing', 'frostbite', 'exposure', 'cold water'],
    title: 'Hypothermia / Cold Emergency',
    steps: [
      'Move the person to a warm, dry area. Handle them gently.',
      'Call emergency services for severe hypothermia (confusion, loss of consciousness, no shivering).',
      'Remove any wet clothing and replace with dry layers and blankets.',
      'Warm the core first — chest, neck, head, and groin. Avoid warming extremities first.',
      'Apply warm (not hot) compresses to the neck, chest, and groin.',
      'If conscious, give warm (not hot) beverages — no alcohol or caffeine.',
      'Do NOT rub or massage the extremities — this can cause cardiac arrest.',
      'If no pulse or not breathing, begin CPR.',
      'For frostbite: Do NOT rub frostbitten areas. Warm in lukewarm water (100-104°F / 37-40°C).'
    ]
  },
  {
    keywords: ['asthma', 'asthma attack', 'cant breathe', 'wheezing', 'inhaler', 'difficulty breathing', 'breathless', 'shortness of breath'],
    title: 'Asthma Attack / Breathing Difficulty',
    steps: [
      'Help the person sit upright — do NOT lay them down.',
      'Help them find and use their rescue inhaler (usually blue). Shake it, then 1 puff every 30–60 seconds, up to 10 puffs.',
      'If no inhaler is available, call emergency services immediately.',
      'Keep them calm — anxiety worsens breathing difficulty.',
      'Loosen any tight clothing around the chest and neck.',
      'Encourage slow, deep breaths — in through the nose, out through pursed lips.',
      'If symptoms do not improve after the inhaler, call emergency services.',
      'If the person becomes unconscious and stops breathing, begin CPR.',
      'Do NOT give any other medication unless they are prescribed.'
    ]
  },
  {
    keywords: ['diabetes', 'low blood sugar', 'hypoglycemia', 'diabetic emergency', 'sugar low', 'insulin'],
    title: 'Diabetic Emergency',
    steps: [
      'Help the person sit or lie down.',
      'If conscious and able to swallow, give them fast-acting sugar: juice, regular soda, candy, glucose tablets.',
      'Do NOT give diet drinks — they contain no sugar.',
      'Wait 15 minutes, then recheck — give more sugar if not improving.',
      'If the person becomes unconscious, do NOT try to give food or drink.',
      'Place unconscious person in recovery position and call emergency services.',
      'If they have a glucagon kit and you are trained, administer it.',
      'Monitor breathing and be prepared to perform CPR if needed.',
      'If unsure whether blood sugar is high or low, give sugar — it won\'t cause significant harm in an emergency.'
    ]
  },
  {
    keywords: ['panic attack', 'anxiety attack', 'hyperventilating', 'panic', 'anxiety', 'can\'t calm down'],
    title: 'Panic Attack / Anxiety Crisis',
    steps: [
      'Move the person to a quiet, calm space if possible.',
      'Speak slowly and in a calm, reassuring voice.',
      'Help them with controlled breathing: breathe in for 4 counts, hold for 4, out for 4.',
      'Grounding technique: Ask them to name 5 things they see, 4 they can touch, 3 they hear, 2 they smell, 1 they taste.',
      'Remind them that panic attacks are temporary and they are safe.',
      'Do NOT dismiss their feelings — validate that their experience is real.',
      'Help them focus on something concrete: count objects, describe surroundings.',
      'Stay with them until the episode passes (usually 10-20 minutes).',
      'If chest pain is present and you are unsure if it\'s a panic attack or heart attack, call emergency services.'
    ]
  },
  {
    keywords: ['concussion', 'head injury', 'hit head', 'head trauma', 'skull'],
    title: 'Head Injury / Concussion',
    steps: [
      'Call emergency services for severe head injuries.',
      'Keep the person still — do NOT move them if a spinal injury is possible.',
      'If bleeding from the scalp, apply gentle pressure with a clean cloth.',
      'Apply ice wrapped in cloth to reduce swelling.',
      'Monitor consciousness — ask simple questions (name, date, location).',
      'Do NOT give any medication (especially blood thinners like aspirin).',
      'Watch for danger signs: repeated vomiting, seizures, worsening headache, unusual behavior, clear fluid from nose/ears.',
      'Do NOT let them fall asleep for the first few hours — check on them regularly.',
      'If unconscious but breathing, stabilize head and neck and place in recovery position.',
      'Seek medical attention even for mild head injuries — symptoms can be delayed.'
    ]
  },
  {
    keywords: ['electric shock', 'electrocution', 'electrical', 'lightning strike'],
    title: 'Electrical Injury',
    steps: [
      'Do NOT touch the person if they are still in contact with the electrical source.',
      'Turn off the power source if safely possible, or use a non-conductive object (dry wood, rubber) to separate them.',
      'Call emergency services immediately.',
      'Once safe to touch, check for breathing and pulse.',
      'If not breathing, begin CPR immediately.',
      'Look for two burn marks — entry and exit wounds. Cover with sterile dressings.',
      'Treat for shock: lay flat, elevate legs, keep warm.',
      'Do NOT apply water to electrical burns unless the power source is confirmed off.',
      'Monitor heart rhythm — electrical injuries can cause delayed cardiac problems.'
    ]
  }
];

/**
 * Scores how well a user message matches a knowledge base entry.
 */
function scoreMatch(message: string, entry: MedicalEntry): number {
  const lower = message.toLowerCase();
  let score = 0;
  for (const keyword of entry.keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      score += keyword.split(' ').length; // Multi-word matches score higher
    }
  }
  return score;
}

/**
 * Formats a matched entry into a conversational response.
 */
function formatResponse(entry: MedicalEntry): string {
  let response = `🚨 ${entry.title}\n\n`;
  entry.steps.forEach((step, i) => {
    response += `${i + 1}. ${step}\n`;
  });
  if (entry.warning) {
    response += `\n⚠️ WARNING: ${entry.warning}`;
  }
  return response;
}

/**
 * General fallback responses for generic medical queries.
 */
const GENERAL_RESPONSES: Record<string, string> = {
  'hello': 'HelpX online. I am your emergency medical assistant. Describe your emergency or ask about first-aid procedures like CPR, choking, burns, fractures, seizures, or any other medical situation.',
  'hi': 'HelpX here. Tell me what\'s happening — describe the emergency and I\'ll provide immediate first-aid guidance.',
  'help': 'I can help with: CPR, Choking, Severe Bleeding, Burns, Fractures, Seizures, Heart Attacks, Strokes, Poisoning, Allergic Reactions, Drowning, Bites, Pregnancy Emergencies, Heat/Cold emergencies, Asthma, Diabetic emergencies, Head injuries, and more.\n\nDescribe your situation and I\'ll provide step-by-step instructions.',
  'thank': 'Stay safe. Remember — in a real emergency, always call professional emergency services. I\'m here whenever you need first-aid guidance.',
  'thanks': 'You\'re welcome. Stay calm and follow the steps. Professional help should always be your primary resource in emergencies.',
};

/**
 * Main function: finds the best matching medical advice for a user query.
 */
export function getLocalMedicalResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase().trim();

  // Check general responses first
  for (const [trigger, response] of Object.entries(GENERAL_RESPONSES)) {
    if (lower.includes(trigger)) {
      return response;
    }
  }

  // Score all knowledge base entries
  const scored = MEDICAL_KB.map(entry => ({
    entry,
    score: scoreMatch(userMessage, entry)
  }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    // Return best match
    let response = formatResponse(scored[0].entry);
    
    // If there are related topics, mention them
    if (scored.length > 1) {
      const related = scored.slice(1, 3).map(s => s.entry.title).join(', ');
      response += `\n\n📋 Related topics: ${related}`;
    }
    
    return response;
  }

  // Fallback: no match found
  return `I understand you need help. While I couldn't find a specific match for your query, here are general emergency guidelines:\n
1. Stay calm and assess the situation for safety.
2. Call emergency services (ambulance/police) immediately if the situation is life-threatening.
3. Do NOT move an injured person unless they are in immediate danger.
4. Check for breathing and pulse — begin CPR if needed.
5. Control any visible bleeding with direct pressure.
6. Keep the person warm and comfortable until help arrives.\n
You can ask me about specific emergencies like: CPR, choking, bleeding, burns, fractures, seizures, heart attacks, strokes, poisoning, allergic reactions, drowning, bites, pregnancy, asthma, diabetic emergencies, or head injuries.`;
}

/**
 * Simulates streaming response for the local AI, yielding chunks.
 */
export async function* streamLocalResponse(userMessage: string): AsyncGenerator<{ text: string }> {
  const fullResponse = getLocalMedicalResponse(userMessage);
  const words = fullResponse.split(' ');
  
  // Simulate streaming by yielding a few words at a time
  let accumulated = '';
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(' ');
    accumulated += (accumulated ? ' ' : '') + chunk;
    yield { text: chunk };
    // Small delay to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}

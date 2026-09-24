import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Supported Gemini models with automatic fallback if a model experiences high demand or temporary 503
const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
];

async function generateContentWithModelFallback(
  client: GoogleGenAI,
  requestConfig: {
    contents: any;
    config?: any;
  }
) {
  let lastError: any = null;
  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: requestConfig.contents,
        config: requestConfig.config,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.error?.code || '503';
      console.info(`Model ${model} temporarily unavailable (status: ${status}), attempting fallback model...`);
      // Brief jitter backoff before fallback attempt
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw lastError;
}

/**
 * Heuristic fallback for Forge Path interpretation when offline or API key is not configured
 */
function fallbackInterpretPath(
  userGoal: string,
  history?: Array<{ role: string; content: string }>,
  playerContext?: any,
  currentPath?: any
) {
  const userMessages = (history || []).filter((m) => m.role === 'user');
  const raw = (userGoal || '').trim() || (userMessages.length > 0 ? userMessages[userMessages.length - 1].content : 'Personal Pursuit');
  const lower = raw.toLowerCase();

  const isRemoveAll =
    lower.includes('remove all') ||
    lower.includes('delete all') ||
    lower.includes('clear all') ||
    lower.includes('remove everything') ||
    lower.includes('start over and remove');

  const isRemoval =
    !isRemoveAll &&
    (lower.includes('remove') ||
    lower.includes('take out') ||
    lower.includes('delete') ||
    lower.includes("don't want") ||
    lower.includes('stop doing'));

  const isReplacement =
    lower.includes('replace') ||
    lower.includes('start over') ||
    lower.includes('forget my current') ||
    lower.includes('abandon') ||
    lower.includes('make it entirely');

  // Handle explicit removal in fallback
  if (isRemoval && currentPath) {
    const existingSkills: string[] = Array.isArray(currentPath.skillConcepts) ? currentPath.skillConcepts : [];
    const removedSkillConcepts: string[] = [];
    for (const sc of existingSkills) {
      const scLower = sc.toLowerCase();
      if (
        (lower.includes('japan') && scLower.includes('japan')) ||
        (lower.includes('language') && scLower.includes('language')) ||
        (lower.includes('program') && (scLower.includes('program') || scLower.includes('code') || scLower.includes('algorithm') || scLower.includes('software'))) ||
        (lower.includes('draw') && (scLower.includes('draw') || scLower.includes('gesture') || scLower.includes('art') || scLower.includes('anatomy') || scLower.includes('illustration'))) ||
        (lower.includes('climb') && (scLower.includes('climb') || scLower.includes('grip') || scLower.includes('mountain') || scLower.includes('hangboard')))
      ) {
        removedSkillConcepts.push(sc);
      }
    }

    const existingObjectives: string[] = Array.isArray(currentPath.learningObjectives) ? currentPath.learningObjectives : [];
    const removedLearningObjectives: string[] = [];
    for (const lo of existingObjectives) {
      const loLower = lo.toLowerCase();
      if (
        (lower.includes('japan') && loLower.includes('japan')) ||
        (lower.includes('conversation') && loLower.includes('conversation')) ||
        (lower.includes('program') && (loLower.includes('program') || loLower.includes('algorithm') || loLower.includes('code') || loLower.includes('software'))) ||
        (lower.includes('draw') && (loLower.includes('draw') || loLower.includes('art') || loLower.includes('figure'))) ||
        (lower.includes('climb') && (loLower.includes('climb') || loLower.includes('mountain')))
      ) {
        removedLearningObjectives.push(lo);
      }
    }

    const remainingSkills = existingSkills.filter((s) => !removedSkillConcepts.includes(s));
    const remainingObjectives = existingObjectives.filter((o) => !removedLearningObjectives.includes(o));

    const reply = removedSkillConcepts.length > 0
      ? `Understood. I have updated your path to remove ${removedSkillConcepts.join(', ')} while keeping your remaining crafts and hard-earned progress intact.`
      : `Understood. I have reviewed your request and prepared the requested path update.`;

    const structuredPath = {
      pathName: currentPath.name || 'Personal Pursuit',
      description: currentPath.description || 'Dedicated craft and daily discipline.',
      domain: currentPath.domain || 'custom_domain',
      focus: currentPath.focus || 'Core Disciplines',
      skillConcepts: remainingSkills,
      learningObjectives: remainingObjectives,
      reasoning: 'Updated to remove the requested discipline while preserving your remaining mastery pursuits.',
      mutation: 'remove' as const,
      removeAllSkills: false,
      addedSkillConcepts: [],
      removedSkillConcepts,
      addedLearningObjectives: [],
      removedLearningObjectives,
      isCustom: true,
    };

    return {
      reply,
      pathData: structuredPath,
      data: structuredPath,
      reasoning: structuredPath.reasoning,
      mutation: 'remove' as const,
      removeAllSkills: false,
      addedSkillConcepts: [],
      removedSkillConcepts,
      addedLearningObjectives: [],
      removedLearningObjectives,
      readyToApply: true,
    };
  }

  const mutation: 'expand' | 'remove' | 'remove_all_skills' | 'replace' = isRemoveAll
    ? 'remove_all_skills'
    : isReplacement
    ? 'replace'
    : 'expand';
  const removeAllSkills = isRemoveAll;

  // If this is just the first very short turn and has minimal detail, ask a follow-up
  if (userMessages.length <= 1 && raw.split(/\s+/).length <= 3 && !lower.includes('and') && !lower.includes(',')) {
    if (lower.includes('japan') || lower.includes('language')) {
      return {
        reply: 'What are you mainly hoping to achieve with language mastery — conversational fluency, reading native literature, cultural immersion, or professional proficiency?',
        readyToApply: false,
      };
    }
    if (lower.includes('draw') || lower.includes('art')) {
      return {
        reply: 'What do you hope to master in visual art — anatomical construction, gesture sketching, narrative illustration, or digital concept art?',
        readyToApply: false,
      };
    }
    if (lower.includes('code') || lower.includes('program')) {
      return {
        reply: 'What direction in engineering calls to you — robust backend architectures, distributed systems, algorithms, or end-to-end applications?',
        readyToApply: false,
      };
    }
  }

  // Broad Life Path interpretation for multi-disciplinary goals
  const hasGuitar = lower.includes('guitar');
  const hasYoga = lower.includes('yoga');
  const hasCoding = lower.includes('code') || lower.includes('software') || lower.includes('program') || lower.includes('developer');
  const hasLanguage = lower.includes('japan') || lower.includes('language') || lower.includes('spanish');
  const hasPhysical = lower.includes('climb') || lower.includes('mountain') || lower.includes('strong') || lower.includes('workout') || lower.includes('fitness') || lower.includes('body');
  const hasArt = lower.includes('draw') || lower.includes('art') || lower.includes('sketch') || lower.includes('paint');
  const hasStory = lower.includes('story') || lower.includes('write') || lower.includes('narrative') || lower.includes('book') || lower.includes('novel');
  const hasFortitude = lower.includes('fortitude') || lower.includes('discipline') || lower.includes('mental') || lower.includes('willpower') || lower.includes('resilience');

  const multiDomainCount = [hasGuitar, hasYoga, hasCoding, hasLanguage, hasPhysical, hasArt, hasStory, hasFortitude].filter(Boolean).length;

  let title = 'Personal Pursuit';
  let slug = 'craftsmanship';
  let focus = 'Core Foundations';
  let skillConcepts: string[] = [];
  let learningObjectives: string[] = [];
  let masteryOutcomes: any[] = [];
  let questArchetypes: any[] = [];
  let reasoning = 'Synthesized as an overarching Life Path to cultivate structured, long-term mastery.';

  if (hasGuitar && hasYoga) {
    title = 'Acoustic Mastery & Mindful Flow';
    slug = 'guitar_yoga';
    focus = 'Acoustic Guitar & Mindful Yoga Practice';
    skillConcepts = [
      'Acoustic Guitar',
      'Yoga Practice',
    ];
    learningObjectives = [
      'Master fundamental chord shapes, finger placement, and clean tone production',
      'Build progressive strumming rhythms and fluid chord transitions',
      'Cultivate intentional breath control, spinal alignment, and foundational flows',
      'Integrate daily restorative movement with focused musical deliberate practice',
    ];
    masteryOutcomes = [
      {
        id: 'mo_gtr_chords',
        domain: 'guitar',
        skillConcept: 'Acoustic Guitar',
        outcome: 'Switch cleanly between foundational open chords (E minor, C, G, D, A) in continuous rhythm',
        measurableCapability: 'Perform 60 clean chord transitions in 2 minutes without string buzzing or rhythm pauses',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
      {
        id: 'mo_yga_flow',
        domain: 'yoga',
        skillConcept: 'Yoga Practice',
        outcome: 'Execute a continuous 20-minute Sun Salutation flow with synchronous diaphragmatic breath',
        measurableCapability: 'Complete 5 rounds of Surya Namaskar A and B with controlled transitions and steady posture alignment',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
    ];
    questArchetypes = [
      {
        id: 'qa_gtr_chords',
        domain: 'guitar',
        skillConcept: 'Acoustic Guitar',
        masteryOutcome: 'Switch cleanly between foundational open chords in continuous rhythm',
        questType: 'drill',
        purpose: 'Build left-hand fingertip calluses and fret-to-fret muscle memory',
        progressionRole: 'Foundational chord change agility',
      },
      {
        id: 'qa_yga_salutation',
        domain: 'yoga',
        skillConcept: 'Yoga Practice',
        masteryOutcome: 'Execute a continuous Sun Salutation flow with synchronous breath',
        questType: 'fundamentals',
        purpose: 'Develop thoracic mobility and breath-linked kinetic transitions',
        progressionRole: 'Foundational mobility and breath synchronization',
      },
    ];
    reasoning = 'A balanced lifestyle path combining expressive musical craftsmanship on the guitar with mindful somatic alignment in yoga.';
  } else if (hasGuitar) {
    title = 'Acoustic Guitar Craftsmanship';
    slug = 'guitar';
    focus = 'Fretboard Mechanics & Rhythm Foundations';
    skillConcepts = [
      'Acoustic Guitar Fundamentals',
      'Open Chords & Smooth Transitions',
      'Rhythm Strumming & Timing',
      'Fingerstyle Precision',
      'Song Repertoire Practice',
    ];
    learningObjectives = [
      'Master instrument posture, tuning, and clean tone mechanics',
      'Transition smoothly across common open chord progressions',
      'Maintain steady meter across varied syncopated strumming patterns',
    ];
    masteryOutcomes = [
      {
        id: 'mo_gtr_open',
        domain: 'guitar',
        skillConcept: 'Acoustic Guitar Fundamentals',
        outcome: 'Execute clean open chords with zero unwanted dampening',
        measurableCapability: 'Play major and minor open chords cleanly for 15 minutes',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
    ];
    questArchetypes = [
      {
        id: 'qa_gtr_drill',
        domain: 'guitar',
        skillConcept: 'Acoustic Guitar Fundamentals',
        masteryOutcome: 'Execute clean open chords with zero unwanted dampening',
        questType: 'drill',
        purpose: 'Build left-hand finger independence and fretboard precision',
        progressionRole: 'Foundational chord transitions',
      },
    ];
    reasoning = 'Focused on daily deliberate guitar practice, rhythm calibration, and progressive repertoire.';
  } else if (hasYoga) {
    title = 'Mindful Yoga & Kinetic Balance';
    slug = 'yoga';
    focus = 'Asana Foundations & Diaphragmatic Breath';
    skillConcepts = [
      'Foundational Asanas & Posture Alignment',
      'Diaphragmatic Breath & Pranayama',
      'Vinyasa Flows & Transitions',
      'Balance & Joint Mobility',
      'Restorative Integration',
    ];
    learningObjectives = [
      'Establish grounded, aligned foundational asanas',
      'Synchronize steady nasal breathing with dynamic flows',
      'Build core stability, hip mobility, and mindful composure',
    ];
    masteryOutcomes = [
      {
        id: 'mo_yga_align',
        domain: 'yoga',
        skillConcept: 'Foundational Asanas & Posture Alignment',
        outcome: 'Maintain correct structural alignment across standing and balance postures',
        measurableCapability: 'Hold Warrior II and Tree Pose with steady breath for 60 seconds per side',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
    ];
    questArchetypes = [
      {
        id: 'qa_yga_drill',
        domain: 'yoga',
        skillConcept: 'Foundational Asanas & Posture Alignment',
        masteryOutcome: 'Maintain correct structural alignment across standing postures',
        questType: 'fundamentals',
        purpose: 'Train stability and postural proprioception',
        progressionRole: 'Foundational somatic alignment',
      },
    ];
    reasoning = 'A dedicated path to cultivate somatic awareness, flexibility, and steady composure through daily yoga practice.';
  } else if (multiDomainCount >= 2) {
    title = "The Polymath's Citadel";
    slug = 'universal_craft';
    focus = 'Polymath Disciplines & Physical Power';
    skillConcepts = [
      hasArt ? 'Gesture Drawing & 3D Figure Construction' : 'Visual Observation & Design',
      hasStory ? 'Scene Structure & Conflict Escalation' : 'Narrative Architecture & Subtext',
      hasPhysical ? 'Mountain Conditioning & Grip Endurance' : 'Physical Strength & Aerobic Power',
      hasFortitude ? 'Monotask Deep Work & Distraction Resistance' : 'Psychological Resilience & Focus',
      hasCoding ? 'Software Architecture & Algorithmic Problem Solving' : hasLanguage ? 'Language Immersion & Spaced Retention' : 'Deliberate Craft Practice',
    ];
    learningObjectives = [
      'Draw recognizable figures with expressive gesture and solid 3D perspective',
      'Draft and revise compelling narrative scenes with tension and subtext',
      'Build aerobic uphill stamina and tendon durability for mountain ascents',
      'Sustain 45-minute unbroken deep work blocks against friction and distraction',
    ];

    masteryOutcomes = [
      {
        id: 'mo_poly_drawing',
        domain: 'drawing',
        skillConcept: 'Gesture Drawing & 3D Figure Construction',
        outcome: 'Construct dynamic figures and objects from observation and imagination',
        measurableCapability: 'Draw 10 recognizable figures from reference using gesture, proportion, and 3D construction',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
      {
        id: 'mo_poly_story',
        domain: 'storytelling',
        skillConcept: 'Scene Structure & Conflict Escalation',
        outcome: 'Construct short narrative scenes with rising conflict, subtext, and clear resolution',
        measurableCapability: 'Draft a 400-word scene where character tension escalates over three distinct beats',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
      {
        id: 'mo_poly_climb',
        domain: 'climbing',
        skillConcept: 'Mountain Conditioning & Grip Endurance',
        outcome: 'Develop aerobic endurance, lower-body uphill work capacity, and grip stamina',
        measurableCapability: 'Maintain conversational nasal breathing on 15% incline or low traverse for 30 minutes',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
      {
        id: 'mo_poly_fortitude',
        domain: 'mental_fortitude',
        skillConcept: 'Monotask Deep Work & Distraction Resistance',
        outcome: 'Maintain unbroken concentration on high-friction tasks without distraction',
        measurableCapability: 'Complete 45 continuous minutes of focused execution with zero browser or device interruptions',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
    ];

    questArchetypes = [
      {
        id: 'qa_drw_gesture',
        domain: 'drawing',
        skillConcept: 'Gesture Drawing & 3D Figure Construction',
        masteryOutcome: 'Construct dynamic figures and objects from observation and imagination',
        questType: 'drill',
        purpose: 'Develop fluid observation, line of action, and proportional landmarks',
        progressionRole: 'Foundational daily speed and rhythm calibration',
      },
      {
        id: 'qa_drw_form',
        domain: 'drawing',
        skillConcept: 'Gesture Drawing & 3D Figure Construction',
        masteryOutcome: 'Construct dynamic figures and objects from observation and imagination',
        questType: 'technique',
        purpose: 'Block in planar shifts and 3D volume without superficial contours',
        progressionRole: 'Intermediate structural form building',
      },
      {
        id: 'qa_sty_scene',
        domain: 'storytelling',
        skillConcept: 'Scene Structure & Conflict Escalation',
        masteryOutcome: 'Construct short narrative scenes with rising conflict, subtext, and clear resolution',
        questType: 'creation',
        purpose: 'Draft focused dramatic conflict with escalating stakes',
        progressionRole: 'Core creative scene execution',
      },
      {
        id: 'qa_sty_analysis',
        domain: 'storytelling',
        skillConcept: 'Scene Structure & Conflict Escalation',
        masteryOutcome: 'Construct short narrative scenes with rising conflict, subtext, and clear resolution',
        questType: 'analysis',
        purpose: 'Deconstruct scene turn-points and subtext in masterworks',
        progressionRole: 'Deep structural craft study',
      },
      {
        id: 'qa_clb_conditioning',
        domain: 'climbing',
        skillConcept: 'Mountain Conditioning & Grip Endurance',
        masteryOutcome: 'Develop aerobic endurance, lower-body uphill work capacity, and grip stamina',
        questType: 'conditioning',
        purpose: 'Build aerobic base and tendon durability with progressive overload',
        progressionRole: 'Long-term summit readiness and endurance baseline',
      },
      {
        id: 'qa_clb_footwork',
        domain: 'climbing',
        skillConcept: 'Mountain Conditioning & Grip Endurance',
        masteryOutcome: 'Develop aerobic endurance, lower-body uphill work capacity, and grip stamina',
        questType: 'drill',
        purpose: 'Master silent, deliberate toe placements on low wall routes',
        progressionRole: 'Technical foot precision reducing upper body fatigue',
      },
      {
        id: 'qa_mfr_sprint',
        domain: 'mental_fortitude',
        skillConcept: 'Monotask Deep Work & Distraction Resistance',
        masteryOutcome: 'Maintain unbroken concentration on high-friction tasks without distraction',
        questType: 'drill',
        purpose: 'Train cognitive endurance and resistance to digital impulses',
        progressionRole: 'Daily willpower and focus retention foundation',
      },
    ];

    reasoning = 'A unified life pursuit synthesizing creative mastery, narrative craft, physical grit, and unwavering focus into a singular, balanced path.';
  } else if (hasCoding) {
    title = 'Software Systems Architecture';
    slug = 'software_engineering';
    focus = 'Core Algorithms & Scalable Systems';
    skillConcepts = [
      'Programming Foundations & Syntax',
      'Data Structures & Algorithms',
      'System Architecture & Design',
      'Hands-On Project Building',
      'Testing, Debugging & Optimization',
    ];
    learningObjectives = [
      'Build end-to-end full-stack applications and resilient tools',
      'Master problem solving and algorithmic reasoning',
      'Contribute to open source and production-grade architectures',
    ];
    masteryOutcomes = [
      {
        id: 'mo_swe_algo',
        domain: 'software_engineering',
        skillConcept: 'Data Structures & Algorithms',
        outcome: 'Solve non-trivial algorithmic problems with optimal time and space complexity',
        measurableCapability: 'Implement and analyze graph, tree, and dynamic programming solutions cleanly in code',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
      {
        id: 'mo_swe_arch',
        domain: 'software_engineering',
        skillConcept: 'System Architecture & Design',
        outcome: 'Design and deploy modular, production-ready services with clean interfaces',
        measurableCapability: 'Build and unit-test a scalable backend API with persistent storage and robust error handling',
        prerequisiteOutcomes: ['mo_swe_algo'],
        priority: 'core',
      },
    ];
    questArchetypes = [
      {
        id: 'qa_swe_drill',
        domain: 'software_engineering',
        skillConcept: 'Data Structures & Algorithms',
        masteryOutcome: 'Solve non-trivial algorithmic problems with optimal time and space complexity',
        questType: 'drill',
        purpose: 'Practice algorithmic pattern recognition under timed conditions',
        progressionRole: 'Algorithmic agility and computational speed',
      },
      {
        id: 'qa_swe_proj',
        domain: 'software_engineering',
        skillConcept: 'System Architecture & Design',
        masteryOutcome: 'Design and deploy modular, production-ready services with clean interfaces',
        questType: 'project',
        purpose: 'Implement concrete feature modules with automated test coverage',
        progressionRole: 'Production engineering craftsmanship',
      },
    ];
    reasoning = 'Designed to cultivate principled software craftsmanship, algorithmic rigor, and end-to-end product architecture.';
  } else if (hasLanguage) {
    title = 'Language & Cultural Polymath';
    slug = 'japanese';
    focus = 'Core Vocabulary & Conversational Fluency';
    skillConcepts = [
      'Core Vocabulary & SRS Drills',
      'Grammar & Sentence Patterns',
      'Listening Comprehension & Immersion',
      'Speaking & Pronunciation Practice',
      'Reading Native Literature',
    ];
    learningObjectives = [
      'Attain high-frequency vocabulary retention and sentence mastery',
      'Speak comfortably in daily conversations and native dialogue',
      'Read authentic native literature, articles, and cultural works',
    ];
    masteryOutcomes = [
      {
        id: 'mo_lang_vocab',
        domain: 'japanese',
        skillConcept: 'Core Vocabulary & SRS Drills',
        outcome: 'Retain and recall 1,500+ high-frequency vocabulary items and grammatical structures',
        measurableCapability: 'Complete daily SRS review session maintaining 90%+ recall accuracy across target cards',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
    ];
    questArchetypes = [
      {
        id: 'qa_lang_srs',
        domain: 'japanese',
        skillConcept: 'Core Vocabulary & SRS Drills',
        masteryOutcome: 'Retain and recall 1,500+ high-frequency vocabulary items and grammatical structures',
        questType: 'drill',
        purpose: 'Reinforce active recall intervals for essential words',
        progressionRole: 'Long-term lexical memory consolidation',
      },
    ];
    reasoning = 'Focused on progressive immersion, daily retention routines, and comfortable real-world communication.';
  } else if (hasPhysical) {
    title = 'Mountaineer & Kinetic Athlete';
    slug = 'climbing';
    focus = 'Grip Endurance & Functional Core Strength';
    skillConcepts = [
      'Grip Strength & Hangboard Drills',
      'Scapular & Shoulder Stability',
      'Core Tension & Body Levers',
      'Dynamic Footwork & Kinetic Balance',
      'Aerobic Stamina & Mountain Conditioning',
    ];
    learningObjectives = [
      'Attain exceptional power-to-weight body tension and pull power',
      'Master advanced technical movement and technical climbing routes',
      'Sustain intense outdoor expeditions and high-altitude endurance',
    ];
    masteryOutcomes = [
      {
        id: 'mo_clb_endurance',
        domain: 'climbing',
        skillConcept: 'Aerobic Stamina & Mountain Conditioning',
        outcome: 'Develop aerobic endurance, lower-body uphill work capacity, and grip stamina',
        measurableCapability: 'Maintain conversational pace on 15% incline treadmill with 20lb pack for 30 minutes',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
      {
        id: 'mo_clb_finger',
        domain: 'climbing',
        skillConcept: 'Grip Strength & Hangboard Drills',
        outcome: 'Build finger tendon durability and forearm work capacity',
        measurableCapability: 'Complete 3 sets of 7/3 repeaters on 20mm edge at bodyweight without form breakdown',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
    ];
    questArchetypes = [
      {
        id: 'qa_clb_ruck',
        domain: 'climbing',
        skillConcept: 'Aerobic Stamina & Mountain Conditioning',
        masteryOutcome: 'Develop aerobic endurance, lower-body uphill work capacity, and grip stamina',
        questType: 'conditioning',
        purpose: 'Build continuous uphill aerobic base and leg work capacity',
        progressionRole: 'Cardiovascular summit conditioning',
      },
      {
        id: 'qa_clb_hang',
        domain: 'climbing',
        skillConcept: 'Grip Strength & Hangboard Drills',
        masteryOutcome: 'Build finger tendon durability and forearm work capacity',
        questType: 'drill',
        purpose: 'Strengthen finger tendons with structured interval loading',
        progressionRole: 'Tendon conditioning and grip endurance',
      },
    ];
    reasoning = 'Balances pure physical power, tendon durability, and aerobic stamina for summit objectives.';
  } else if (hasArt) {
    title = 'Visual Artist & Illustrator';
    slug = 'drawing';
    focus = 'Gesture, Form & Anatomy';
    skillConcepts = [
      'Gesture & Rhythm',
      'Form & 3D Construction',
      'Perspective Grids & Spatial Depth',
      'Anatomy & Head Planes',
      'Value, Shading & Dramatic Light',
    ];
    learningObjectives = [
      'Establish fluid drawing confidence and dynamic observation',
      'Construct complex scenes and human figures from imagination',
      'Complete original portfolio projects and narrative illustrations',
    ];
    masteryOutcomes = [
      {
        id: 'mo_drw_gesture',
        domain: 'drawing',
        skillConcept: 'Gesture & Rhythm',
        outcome: 'Construct dynamic figures and forms from observation and imagination',
        measurableCapability: 'Draw 15 gesture poses in 15 minutes capturing line of action and weight without contour tracing',
        prerequisiteOutcomes: [],
        priority: 'core',
      },
      {
        id: 'mo_drw_planes',
        domain: 'drawing',
        skillConcept: 'Anatomy & Head Planes',
        outcome: 'Construct facial planes and human heads with accurate lighting and proportions',
        measurableCapability: 'Block in front and 3/4 Asaro head planar shifts with clear core shadows in 25 minutes',
        prerequisiteOutcomes: ['mo_drw_gesture'],
        priority: 'core',
      },
    ];
    questArchetypes = [
      {
        id: 'qa_drw_storm',
        domain: 'drawing',
        skillConcept: 'Gesture & Rhythm',
        masteryOutcome: 'Construct dynamic figures and forms from observation and imagination',
        questType: 'drill',
        purpose: 'Eliminate hesitation and establish fluid observation mechanics',
        progressionRole: 'Foundational gesture fluidity',
      },
      {
        id: 'qa_drw_head',
        domain: 'drawing',
        skillConcept: 'Anatomy & Head Planes',
        masteryOutcome: 'Construct facial planes and human heads with accurate lighting and proportions',
        questType: 'technique',
        purpose: 'Study planar geometry and lighting form boundaries',
        progressionRole: 'Intermediate anatomy and volumetric lighting',
      },
    ];
    reasoning = 'Structures your creative development from mechanical foundational drills to imaginative storytelling.';
  } else {
    title = raw.length > 0 ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Personal Pursuit';
    slug = lower.replace(/[^a-z0-9]+/g, '_').slice(0, 30) || 'custom_path';
    focus = 'Core Fundamentals & Daily Discipline';
    skillConcepts = [
      `${title} Fundamentals`,
      `${title} Mechanics & Execution`,
      `${title} Intermediate Practice`,
      `${title} Creative Projects`,
      `${title} Advanced Mastery`,
    ];
    learningObjectives = [
      `Establish a daily discipline in ${title}`,
      `Build core technical confidence and execution consistency`,
      `Complete progressive milestones and personal projects`,
    ];
    masteryOutcomes = [
      {
        id: `mo_${slug}_foundations`,
        domain: slug,
        skillConcept: `${title} Fundamentals`,
        outcome: `Execute core fundamental tasks in ${title} with deliberate consistency`,
        measurableCapability: `Complete 25-minute focused execution session targeting primary ${title} mechanics`,
        prerequisiteOutcomes: [],
        priority: 'core',
      },
    ];
    questArchetypes = [
      {
        id: `qa_${slug}_drill`,
        domain: slug,
        skillConcept: `${title} Fundamentals`,
        masteryOutcome: `Execute core fundamental tasks in ${title} with deliberate consistency`,
        questType: 'drill',
        purpose: `Build muscle memory and execution precision in ${title}`,
        progressionRole: 'Foundational consistency and technical habit',
      },
    ];
    reasoning = `A focused long-term path designed to guide daily deliberate practice and progressive mastery in ${title}.`;
  }

  const structuredPath = {
    pathName: title,
    description: `Devote disciplined daily effort to mastering ${title} through deliberate practice and progressive overload.`,
    domain: slug,
    focus,
    skillConcepts,
    learningObjectives,
    masteryOutcomes,
    questArchetypes,
    reasoning,
    mutation,
    removeAllSkills,
    addedSkillConcepts: skillConcepts,
    removedSkillConcepts: [],
    addedLearningObjectives: learningObjectives,
    removedLearningObjectives: [],
    isCustom: true,
  };

  return {
    reply: `I have synthesized the **${title}** Forge Path. It unites your long-term focus around **${focus}** with core disciplines: ${skillConcepts.slice(0, 3).join(', ')}. You can review and apply this path below to align your daily quests.`,
    pathData: structuredPath,
    data: structuredPath,
    reasoning,
    mutation,
    removeAllSkills,
    addedSkillConcepts: skillConcepts,
    removedSkillConcepts: [],
    addedLearningObjectives: learningObjectives,
    removedLearningObjectives: [],
    readyToApply: true,
  };
}

/**
 * Heuristic fallback for Daily Intent interpretation when offline or API key is not configured
 */
function fallbackInterpretDailyIntent(userPrompt: string, context?: any, history?: Array<{ role: string; content: string }>) {
  const prompt = (userPrompt || '').toLowerCase();
  let availableMinutes: number | undefined;

  const minMatch = prompt.match(/(\d+)\s*(?:mins?|minutes?|m\b)/i);
  if (minMatch) {
    const parsed = parseInt(minMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 5 && parsed <= 480) {
      availableMinutes = parsed;
    }
  } else if (prompt.includes('two hour') || prompt.includes('2 hour') || prompt.includes('120 min')) {
    availableMinutes = 120;
  } else if (prompt.includes('half hour') || prompt.includes('30 min')) {
    availableMinutes = 30;
  } else if (prompt.includes('hour') || prompt.includes('60 min')) {
    availableMinutes = 60;
  } else if (prompt.includes('quick') || prompt.includes('15 min') || prompt.includes('short')) {
    availableMinutes = 15;
  } else if (prompt.includes('45 min')) {
    availableMinutes = 45;
  } else if (prompt.includes('90 min')) {
    availableMinutes = 90;
  }

  let energyPreference: 'low' | 'moderate' | 'high' | 'peak' = 'moderate';
  if (prompt.includes('tired') || prompt.includes('exhausted') || prompt.includes('low energy') || prompt.includes('sick') || prompt.includes('burnt out') || prompt.includes('gentle') || prompt.includes('drained')) {
    energyPreference = 'low';
  } else if (prompt.includes('hyped') || prompt.includes('high energy') || prompt.includes('ready to grind') || prompt.includes('intense') || prompt.includes('strong') || prompt.includes('great')) {
    energyPreference = 'high';
  } else if (prompt.includes('peak') || prompt.includes('maximum') || prompt.includes('beast mode')) {
    energyPreference = 'peak';
  }

  let difficultyPreference: 'easy' | 'moderate' | 'challenging' | 'elite' = 'moderate';
  if (energyPreference === 'low' || prompt.includes('light') || prompt.includes('easy') || prompt.includes('gentle')) {
    difficultyPreference = 'easy';
  } else if (energyPreference === 'high' || prompt.includes('hard') || prompt.includes('challenge')) {
    difficultyPreference = 'challenging';
  } else if (energyPreference === 'peak') {
    difficultyPreference = 'elite';
  }

  const avoidRecentlyRepeatedActivities = prompt.includes('repeat') || prompt.includes('bored') || prompt.includes('different') || prompt.includes('fresh') || prompt.includes('variety');
  const noveltyPreference: 'low' | 'moderate' | 'high' = avoidRecentlyRepeatedActivities ? 'high' : 'moderate';

  const preferredDomains: string[] = [];
  const deprioritizedDomains: string[] = [];

  // Check for deprioritized domains
  if (prompt.includes('bored of drawing') || prompt.includes("don't give me drawing") || prompt.includes('avoid drawing') || prompt.includes('no drawing')) {
    deprioritizedDomains.push('drawing');
  } else if (prompt.includes('draw') || prompt.includes('art') || prompt.includes('sketch')) {
    preferredDomains.push('drawing');
  }

  if (prompt.includes('no climbing') || prompt.includes('skip workout') || prompt.includes('no physical')) {
    deprioritizedDomains.push('climbing');
  } else if (prompt.includes('climb') || prompt.includes('walk') || prompt.includes('hike') || prompt.includes('fitness') || prompt.includes('workout') || prompt.includes('physical')) {
    preferredDomains.push('climbing');
  }

  if (prompt.includes('japan') || prompt.includes('language')) {
    preferredDomains.push('japanese');
  }

  if (prompt.includes('read') || prompt.includes('code') || prompt.includes('study') || prompt.includes('meditat') || prompt.includes('focus')) {
    preferredDomains.push('mental_fortitude');
  }

  if (prompt.includes('write') || prompt.includes('story') || prompt.includes('journal')) {
    preferredDomains.push('storytelling');
  }

  const preferredActivityTypes: ('practical' | 'study' | 'creation' | 'drill' | 'reflection')[] = [];
  if (prompt.includes('practical') || prompt.includes('hands-on') || prompt.includes('workout') || prompt.includes('exercise') || prompt.includes('physical')) preferredActivityTypes.push('practical');
  if (prompt.includes('study') || prompt.includes('read') || prompt.includes('learn') || prompt.includes('theory')) preferredActivityTypes.push('study');
  if (prompt.includes('create') || prompt.includes('make') || prompt.includes('project') || prompt.includes('draw')) preferredActivityTypes.push('creation');
  if (prompt.includes('drill') || prompt.includes('reps') || prompt.includes('practice')) preferredActivityTypes.push('drill');
  if (prompt.includes('reflect') || prompt.includes('mindful') || prompt.includes('journal')) preferredActivityTypes.push('reflection');

  if (preferredActivityTypes.length === 0) {
    preferredActivityTypes.push('practical', 'drill');
  }

  const structuredIntent = {
    availableMinutes,
    energyPreference,
    difficultyPreference,
    preferredDomains,
    deprioritizedDomains,
    targetSkills: [],
    preferredActivityTypes,
    noveltyPreference,
    avoidRecentlyRepeatedActivities,
    notes: `Adapted for today${availableMinutes ? ` with a ${availableMinutes}-minute time budget` : ''}${energyPreference === 'low' ? ' and low-energy pacing' : ''}.`,
  };

  const prefSummary = preferredDomains.length > 0 ? `prioritizing ${preferredDomains.join(' and ')}` : '';
  const depSummary = deprioritizedDomains.length > 0 ? `deprioritizing ${deprioritizedDomains.join(', ')}` : '';
  const parts = [prefSummary, depSummary, availableMinutes ? `around ${availableMinutes} minutes` : ''].filter(Boolean);

  return {
    reply: `Understood. I have calibrated today's quest adaptation${parts.length > 0 ? ` (${parts.join(', ')})` : ''} with ${energyPreference} energy pacing. You can apply this adaptation below.`,
    intentData: structuredIntent,
    data: structuredIntent,
    readyToApply: true,
  };
}

// Quality Gate Validator for Titles
const GENERIC_TITLE_PATTERNS = [
  /^personal pursuit/i,
  /^deliberate practice/i,
  /^deep practice/i,
  /^technical fundamentals drill/i,
  /^mastery benchmark challenge/i,
  /^masterwork horizon/i,
  /^landmark capstone project/i,
  /^creative synthesis/i,
  /^skill calibration/i,
  /^contextual application/i,
  /^milestone sprint/i,
  /:\s*deliberate practice/i,
  /:\s*technical fundamentals drill/i,
  /:\s*mastery benchmark challenge/i,
  /:\s*masterwork horizon/i,
  /:\s*landmark capstone project/i,
  /:\s*creative synthesis/i,
  /:\s*skill calibration/i,
  /:\s*contextual application/i,
  /:\s*milestone sprint/i,
];

export function isGenericTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return true;
  const trimmed = title.trim();
  if (trimmed.length < 3) return true;
  for (const pattern of GENERIC_TITLE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

// Vague action phrases to reject
const VAGUE_ACTION_PHRASES = [
  /^(practice|study|work on|improve|train|develop|focus on|execute)\s+(drawing|art|sketching|storytelling|writing|climbing|bouldering|focus|discipline|mental fortitude|fundamentals|skills|mastery|deliberate practice|technique|form)(\s+today)?\.?$/i,
  /^practice drawing\.?$/i,
  /^study storytelling\.?$/i,
  /^work on climbing\.?$/i,
  /^improve focus\.?$/i,
  /^train fundamentals\.?$/i,
  /^practice deliberate execution\.?$/i,
  /^practice deliberate practice\.?$/i,
  /^work on your skills\.?$/i,
  /^develop mastery\.?$/i,
  /^work on fundamentals\.?$/i,
];

export function isConcreteAction(action: string): boolean {
  if (!action || typeof action !== 'string') return false;
  const trimmed = action.trim();
  if (trimmed.length < 12) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;

  for (const pattern of VAGUE_ACTION_PHRASES) {
    if (pattern.test(trimmed)) return false;
  }

  // Concrete action should normally contain quantity/duration, specific technique, specific object, constraint, or measurable output
  const hasQuantityOrTime = /\d+|(minute|min|sec|hour|rep|set|page|word|pose|meter|km|mile|interval|tempo|round|cycle)s?/i.test(trimmed);
  const hasSpecificTechniqueOrObject = /(gesture|contour|perspective|asaro|loomis|shading|anatomy|dialogue|scene|chapter|subtext|traverse|hangboard|crimp|dyno|boulder|monotask|sigh|ruck|incline|sprint|thumbnail|grid|audit|code|function|test|algorithm|syntax|kanji|vocab|card|reader|push-up|squat|mobility|plank|breath|meditat)/i.test(trimmed);

  return hasQuantityOrTime || hasSpecificTechniqueOrObject;
}

/**
 * Heuristic craft-specific quest concept generator when Gemini is offline or unavailable
 */
function generateFallbackQuestConcepts(
  forgePath: any,
  targetCount: number = 15,
  dailyIntent?: any,
  activeSkills: any[] = [],
  highestUnlockedForgeBand: number = 1,
  refreshNonce?: number | string,
  forceRefresh: boolean = false,
  questHistory?: any
): any[] {
  const safeHighestBand = Math.max(1, Math.min(6, typeof highestUnlockedForgeBand === 'number' ? highestUnlockedForgeBand : 1));
  const safeActiveSkills = Array.isArray(activeSkills) ? activeSkills.filter((s) => s && (s.name || s.id)) : [];

  // =========================================================================
  // RULE 1: If Active Skills are supplied, treat them as the strict CLOSED SET!
  // Do NOT infer or detect domains from path name, skillConcepts, or keywords.
  // Quests MUST belong ONLY to the activeSkills.
  // =========================================================================
  if (safeActiveSkills.length > 0) {
    const pool: any[] = [];
    const goalTracks: any[] = Array.isArray(forgePath?.goalTracks) ? forgePath.goalTracks : [];

    // Craft-specific specialized templates for known active skills
    const SPECIFIC_SKILL_TEMPLATES: Record<string, any[]> = {
      muay_thai: [
        {
          title: 'Muay Thai Roundhouse & Teep Kick Mechanics',
          description: 'Perform 50 rear roundhouse kicks on a heavy bag or shadowboxing with full hip turnover, followed by 50 lead teep kicks focusing on foot placement and chambering.',
          action: 'Execute 50 rear roundhouse kicks and 50 lead teeps focusing on hip drive and balance',
          completionCriteria: '100 total kicks completed with full hip rotation and defensive guard return',
          questType: 'drill',
          activityType: 'practical',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 20,
        },
        {
          title: 'Muay Thai Heavy Bag / Shadowboxing 3-Round Cadence',
          description: 'Execute three 3-minute rounds of controlled shadowboxing or bag work combining 1-2 punch combinations with body kicks, maintaining tight high-guard posture throughout.',
          action: 'Complete 3 rounds of 3 minutes shadowboxing or bag combinations with 1-minute rest',
          completionCriteria: '3 full rounds completed with continuous movement and upright Thai stance',
          questType: 'fundamentals',
          activityType: 'practical',
          difficultyHint: 'moderate',
          estimatedDurationMinutes: 20,
        },
        {
          title: 'Muay Thai Guard & Footwork Pivot Mechanics',
          description: 'Isolate orthodox/southpaw footwork pivots and checking drills. Execute 40 switch-checks and 40 step-pivots off incoming attack angles with hands glued to temples.',
          action: 'Drill 40 switch-checks and 40 defensive pivots with high guard integrity',
          completionCriteria: '80 total defensive repetitions logged with balanced footwork return',
          questType: 'drill',
          activityType: 'drill',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 15,
        },
        {
          title: 'Muay Thai Clinch Knee & Balance Cadence',
          description: 'Work collar tie clinch pummeling and step-through skip knees for 15 continuous minutes against a bag or shadow stance with upright posture.',
          action: 'Drill 15 minutes of continuous clinch knee strikes and balance re-centering',
          completionCriteria: '15 continuous minutes completed with stable head control and hip extension',
          questType: 'technique',
          activityType: 'drill',
          difficultyHint: 'moderate',
          estimatedDurationMinutes: 15,
        },
      ],
      forex: [
        {
          title: 'Forex Key Support & Resistance Level Mapping',
          description: 'Open clean charts on 3 major currency pairs. Mark the weekly and daily key supply/demand zones and annotate where price action reacted historically.',
          action: 'Mark and annotate major daily and weekly support/resistance levels on 3 pairs',
          completionCriteria: 'Written chart notes with 3 major pairs annotated with key confluence zones',
          questType: 'drill',
          activityType: 'study',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 20,
        },
        {
          title: 'Forex Multi-Timeframe Trend & Confluence Analysis',
          description: 'Select your primary currency pair. Perform top-down technical analysis from 4H down to 15M, identifying prevailing trend direction and order flow.',
          action: 'Conduct top-down multi-timeframe analysis from 4-hour to 15-minute chart',
          completionCriteria: 'Documented trend bias with at least 2 confirming technical indicators logged',
          questType: 'fundamentals',
          activityType: 'practical',
          difficultyHint: 'moderate',
          estimatedDurationMinutes: 25,
        },
        {
          title: 'Forex Risk-to-Reward Trade Execution & Journal Audit',
          description: 'Review your last 5 trade setups or simulated entries. Calculate exact risk-to-reward ratios and verify strict compliance with a maximum 1-2% risk model.',
          action: 'Calculate R:R and risk percentages for 5 setups and log in trading journal',
          completionCriteria: '5 setups audited in journal with risk percentage and stop-loss rationale recorded',
          questType: 'study',
          activityType: 'reflection',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 20,
        },
        {
          title: 'Forex Economic Calendar & News Volatility Prep',
          description: 'Audit the upcoming high-impact economic releases (CPI, NFP, interest rates) and document planned execution windows and risk mitigation protocols.',
          action: 'Review economic calendar and document planned trading windows around red-folder news',
          completionCriteria: 'Risk mitigation protocol documented for all high-impact events this week',
          questType: 'fundamentals',
          activityType: 'study',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 15,
        },
      ],
      cello: [
        {
          title: 'Cello Open String Bow Distribution & Tone Isolation',
          description: 'Practice 15 minutes of full-bow open string strokes on C, G, D, and A strings. Maintain a straight bow path perpendicular to the strings with consistent weight and speed.',
          action: 'Execute 15 minutes of slow open string bowing focusing on tone resonance',
          completionCriteria: '15 continuous minutes completed with pure sustained tone and steady bow stroke',
          questType: 'fundamentals',
          activityType: 'practical',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 15,
        },
        {
          title: 'Cello First Position Intonation & Scale Study',
          description: 'Play two-octave major scales in first position with a drone pitch or tuner. Focus on finger spacing, left-hand thumb relaxation, and ringing harmonics.',
          action: 'Practice two-octave scales in first position matching pitch with a reference drone',
          completionCriteria: 'Two full octave scales played with accurate pitch intonation on all strings',
          questType: 'drill',
          activityType: 'drill',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 20,
        },
        {
          title: 'Cello Left Hand Finger Weight & Shifting Preparation',
          description: 'Isolate left-hand finger mechanics with silent finger drops and light shifting exercises between 1st and 4th position without squeezing the neck.',
          action: 'Perform 10 minutes of finger weight drops and relaxed arm shifting drills',
          completionCriteria: '10 minutes logged with relaxed left thumb and smooth arm-led position shifts',
          questType: 'technique',
          activityType: 'drill',
          difficultyHint: 'moderate',
          estimatedDurationMinutes: 20,
        },
        {
          title: 'Cello Etude Phrase Phrasing & Dynamic Shaping',
          description: 'Take 8 to 16 measures of your current practice etude or repertoire piece. Work slowly with a metronome, shaping dynamics and bow speed for expressive clarity.',
          action: 'Practice 16 measures of repertoire with metronome and deliberate dynamic shaping',
          completionCriteria: 'Target passage performed 3 consecutive times with clean rhythm and dynamic expression',
          questType: 'drill',
          activityType: 'practical',
          difficultyHint: 'moderate',
          estimatedDurationMinutes: 25,
        },
      ],
    };

    // 1. First check if any goalTracks correspond to the active skills
    safeActiveSkills.forEach((skill, sIdx) => {
      const sId = skill.id;
      const sName = skill.name || 'Skill';
      const sDomain = (skill.domain || sName.toLowerCase().replace(/[^a-z0-9_]+/g, '_')).slice(0, 30);
      const normalizedKey = sName.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const skillBand = Math.max(1, Math.min(safeHighestBand, skill.currentStage || 1));

      // Check matching goal tracks
      const matchingGt = goalTracks.find(
        (gt) => (gt.skillId && gt.skillId === sId) || (gt.name && gt.name.toLowerCase() === sName.toLowerCase())
      );

      const skillPool: any[] = [];

      // A. Concrete actions from matching Goal Track or Skill
      const combinedActions: string[] = [
        ...(Array.isArray(matchingGt?.concreteActions) ? matchingGt.concreteActions : []),
        ...(Array.isArray(skill?.concreteActions) ? skill.concreteActions : []),
      ];
      combinedActions.forEach((act: string, aIdx: number) => {
        if (typeof act === 'string' && act.trim() && !isGenericTitle(act)) {
          skillPool.push({
            title: act.trim(),
            description: `Execute curriculum task for ${sName}: ${act.trim()}. Focus on foundational mechanics and consistency.`,
            domain: sDomain,
            skillConcept: sName,
            action: act.trim(),
            completionCriteria: `Complete ${act.trim()} with deliberate precision and focus`,
            questType: aIdx === 0 ? 'drill' : 'fundamentals',
            masteryOutcome: matchingGt?.milestoneGoal || skill?.milestoneGoal || `Master ${sName} core capability`,
            activityType: 'drill',
            difficultyHint: 'easy',
            estimatedDurationMinutes: 20,
            progressionStage: 'beginner',
            prerequisiteConcepts: [],
            goalTrackId: matchingGt?.id || skill.goalTrackId,
            skillId: sId,
            questBand: skillBand,
            band: skillBand,
            rationale: `Directly targets ${sName} foundational practice in your path.`,
          });
        }
      });

      // B. Capabilities from matching Goal Track or Skill
      const combinedCapabilities: string[] = [
        ...(Array.isArray(matchingGt?.capabilities) ? matchingGt.capabilities : []),
        ...(Array.isArray(skill?.capabilities) ? skill.capabilities : []),
      ];
      combinedCapabilities.slice(0, 3).forEach((cap: string) => {
        if (typeof cap === 'string' && cap.trim()) {
          const trimmedCap = cap.trim();
          skillPool.push({
            title: `${sName}: ${trimmedCap} Form & Precision`,
            description: `Isolate and drill ${trimmedCap} in ${sName}. Focus on consistent execution and technical mechanics.`,
            domain: sDomain,
            skillConcept: sName,
            action: `Drill ${trimmedCap} in ${sName} for 20 minutes focusing on form and mechanics`,
            completionCriteria: `20 minutes of deliberate ${trimmedCap} practice completed with form notes`,
            questType: 'drill',
            masteryOutcome: `Execute ${trimmedCap} with technical precision`,
            activityType: 'drill',
            difficultyHint: 'moderate',
            estimatedDurationMinutes: 20,
            progressionStage: 'beginner',
            prerequisiteConcepts: [],
            goalTrackId: matchingGt?.id || skill.goalTrackId,
            skillId: sId,
            questBand: skillBand,
            band: skillBand,
            rationale: `Develops core ${trimmedCap} capability in ${sName}.`,
          });
        }
      });

      // C. Specialized templates if matching known craft domains
      const matchedTemplateKey = Object.keys(SPECIFIC_SKILL_TEMPLATES).find((k) =>
        normalizedKey.includes(k) || k.includes(normalizedKey) || sDomain.includes(k)
      );

      if (matchedTemplateKey && SPECIFIC_SKILL_TEMPLATES[matchedTemplateKey]) {
        SPECIFIC_SKILL_TEMPLATES[matchedTemplateKey].forEach((tmpl) => {
          skillPool.push({
            ...tmpl,
            domain: sDomain,
            skillConcept: sName,
            skillId: sId,
            goalTrackId: matchingGt?.id || skill.goalTrackId,
            questBand: skillBand,
            band: skillBand,
            progressionStage: 'beginner',
            prerequisiteConcepts: [],
            rationale: `Foundational practice drill in ${sName}.`,
          });
        });
      }

      // D. High-craft core practice templates tailored to this exact skill
      skillPool.push(
        {
          title: `${sName} Foundational Mechanics Drill`,
          description: `Execute 20 minutes of deliberate fundamental practice isolating core technical form and basic mechanics in ${sName}.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Practice 20 minutes of foundational technique in ${sName} with deliberate focus`,
          completionCriteria: `20 continuous minutes logged with strict adherence to foundational technique`,
          questType: 'fundamentals',
          masteryOutcome: `Execute core fundamental mechanics in ${sName} with consistency`,
          activityType: 'practical',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 20,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Reinforces foundational mechanics and automaticity in ${sName}.`,
        },
        {
          title: `${sName} Technical Precision & Repetition Drill`,
          description: `Perform 3 sets of 10 clean mechanical repetitions isolating the primary technical movement in ${sName} with zero rushed reps.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Complete 3 sets of 10 precision repetitions of primary ${sName} mechanics`,
          completionCriteria: `3 full sets logged with strict form and zero tension`,
          questType: 'drill',
          masteryOutcome: `Develop technical precision and consistency in ${sName}`,
          activityType: 'practical',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 20,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Builds muscle memory and mechanical consistency in ${sName}.`,
        },
        {
          title: `${sName} Half-Speed Form & Alignment Audit`,
          description: `Execute key movement patterns or routines in ${sName} at half-speed, auditing and correcting micro-errors in form, tension, and balance.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Execute 15 minutes of slow-motion / half-speed technique audit in ${sName}`,
          completionCriteria: `15 minutes completed with 2 specific form corrections noted and applied`,
          questType: 'technique',
          masteryOutcome: `Cultivate bodily awareness and posture self-correction in ${sName}`,
          activityType: 'study',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 15,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Removes parasitic tension and detects hidden execution flaws in ${sName}.`,
        },
        {
          title: `${sName} 25-Minute Structured Focus Session`,
          description: `Set a 25-minute timer and engage in uninterrupted, single-task deliberate practice on your current ${sName} study or exercise.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Execute 25 minutes of continuous deliberate practice in ${sName} with all distractions silenced`,
          completionCriteria: `25 minutes completed with verified focus notes or tangible execution logged`,
          questType: 'drill',
          masteryOutcome: `Develop sustained deliberate focus in ${sName}`,
          activityType: 'drill',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 25,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Builds steady practice habits and cognitive endurance in ${sName}.`,
        },
        {
          title: `${sName} Core Phrasing & Transition Sequence`,
          description: `Practice linking two foundational techniques in ${sName} into a continuous, seamless transition sequence with smooth rhythmic pacing.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Drill continuous transition between 2 core ${sName} movements for 20 minutes`,
          completionCriteria: `20 minutes logged with smooth, continuous transitions`,
          questType: 'fundamentals',
          masteryOutcome: `Achieve fluid transitions and phrasing in ${sName}`,
          activityType: 'practical',
          difficultyHint: 'moderate',
          estimatedDurationMinutes: 20,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Connects isolated mechanical drills into natural procedural sequences in ${sName}.`,
        },
        {
          title: `${sName} Core Technique Analysis & Form Review`,
          description: `Analyze your execution of a key technique or concept in ${sName}. Document 2 specific areas for refinement and drill the correction 10 times.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Analyze key ${sName} technique, log 2 refinement points, and execute 10 corrective reps`,
          completionCriteria: `Written self-critique recorded with 10 deliberate corrective repetitions performed`,
          questType: 'technique',
          masteryOutcome: `Accurately self-assess and refine technique in ${sName}`,
          activityType: 'study',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 15,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Cultivates critical self-correction and technical precision in ${sName}.`,
        },
        {
          title: `${sName} Weak-Point Isolation & Mechanics Repair`,
          description: `Identify your single highest-friction technical bottleneck in ${sName} and drill deliberate corrective reps for 20 minutes.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Drill 20 minutes isolating your primary technical bottleneck in ${sName}`,
          completionCriteria: `20 minutes completed focusing exclusively on the identified weak point`,
          questType: 'drill',
          masteryOutcome: `Overcome friction points and bad habits in ${sName}`,
          activityType: 'drill',
          difficultyHint: 'moderate',
          estimatedDurationMinutes: 20,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Directly targets and repairs execution friction points in ${sName}.`,
        },
        {
          title: `${sName} Masterwork Reference Analysis`,
          description: `Study a masterwork or high-level recorded demonstration of ${sName}. Annotate 3 specific technical cues and test them immediately in short practice.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Study master reference in ${sName} and apply 3 annotated cues to short practice`,
          completionCriteria: `3 technical cues documented and tested in practical execution`,
          questType: 'technique',
          masteryOutcome: `Extract technical insights from elite demonstrations of ${sName}`,
          activityType: 'study',
          difficultyHint: 'easy',
          estimatedDurationMinutes: 15,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Anchors deliberate practice to high-standard reference models in ${sName}.`,
        },
        {
          title: `${sName} Stage ${skillBand} Applied Execution Sprint`,
          description: `Execute 30 minutes of applied production and active execution in ${sName}, applying your stage competencies to direct practice.`,
          domain: sDomain,
          skillConcept: sName,
          action: `Execute 30 minutes of applied production in ${sName} toward core competence`,
          completionCriteria: `30 continuous minutes completed with demonstrable output logged`,
          questType: 'application',
          masteryOutcome: `Apply ${sName} fundamentals to real production scenarios`,
          activityType: 'creation',
          difficultyHint: 'moderate',
          estimatedDurationMinutes: 30,
          progressionStage: 'beginner',
          prerequisiteConcepts: [],
          goalTrackId: matchingGt?.id || skill.goalTrackId,
          skillId: sId,
          questBand: skillBand,
          band: skillBand,
          rationale: `Bridges technical drills to authentic application in ${sName}.`,
        }
      );

      // If refreshNonce or forceRefresh is present, prioritize items not in active roster and rotate
      if (refreshNonce !== undefined || forceRefresh) {
        const activeTitles = new Set(
          (questHistory?.activeQuestTitles || []).map((t: string) => t.toLowerCase().trim())
        );
        const nonActive = skillPool.filter((c) => !activeTitles.has(c.title.toLowerCase().trim()));
        const candidateSource = nonActive.length >= 2 ? nonActive : skillPool;

        const offset = Math.abs(typeof refreshNonce === 'number' ? refreshNonce : (String(refreshNonce).charCodeAt(0) || 7) + sIdx) % candidateSource.length;
        const rotated = [...candidateSource.slice(offset), ...candidateSource.slice(0, offset)];
        pool.push(...rotated);
      } else {
        pool.push(...skillPool);
      }
    });

    // Ensure every concept in pool strictly adheres to:
    // 1) Belongs to an active skill
    // 2) Band is clamped between 1 and safeHighestBand (never 0, never > safeHighestBand)
    const sanitizedPool = pool.map((c) => {
      const b = Math.max(1, Math.min(safeHighestBand, c.questBand || 1));
      return {
        ...c,
        questBand: b,
        band: b,
      };
    });

    return sanitizedPool.slice(0, Math.max(targetCount, safeActiveSkills.length * 4));
  }

  const pathDomain = (forgePath?.domain || 'general').toLowerCase();
  const pathName = forgePath?.name || 'Personal Pursuit';
  const masteryOutcomes: any[] = Array.isArray(forgePath?.masteryOutcomes) ? forgePath.masteryOutcomes : [];
  const questArchetypes: any[] = Array.isArray(forgePath?.questArchetypes) ? forgePath.questArchetypes : [];

  // Collect domains represented in this path
  const detectedDomains = new Set<string>();
  if (pathDomain && pathDomain !== 'universal_craft' && pathDomain !== 'general') {
    detectedDomains.add(pathDomain);
  }
  masteryOutcomes.forEach((mo) => {
    if (mo.domain) detectedDomains.add(mo.domain.toLowerCase());
  });
  questArchetypes.forEach((qa) => {
    if (qa.domain) detectedDomains.add(qa.domain.toLowerCase());
  });

  // Also check pathName and skillConcepts
  const nameAndSkills = `${pathName} ${(forgePath?.skillConcepts || []).join(' ')}`.toLowerCase();
  if (nameAndSkills.includes('draw') || nameAndSkills.includes('art') || nameAndSkills.includes('sketch') || nameAndSkills.includes('illustration')) detectedDomains.add('drawing');
  if (nameAndSkills.includes('story') || nameAndSkills.includes('write') || nameAndSkills.includes('narrative') || nameAndSkills.includes('author')) detectedDomains.add('storytelling');
  if (nameAndSkills.includes('climb') || nameAndSkills.includes('mountain') || nameAndSkills.includes('fitness') || nameAndSkills.includes('ruck')) detectedDomains.add('climbing');
  if (nameAndSkills.includes('fortitude') || nameAndSkills.includes('focus') || nameAndSkills.includes('discipline') || nameAndSkills.includes('resilience')) detectedDomains.add('mental_fortitude');
  if (nameAndSkills.includes('code') || nameAndSkills.includes('software') || nameAndSkills.includes('engineer') || nameAndSkills.includes('programming')) detectedDomains.add('software_engineering');
  if (nameAndSkills.includes('japan') || nameAndSkills.includes('language') || nameAndSkills.includes('nihongo')) detectedDomains.add('japanese');

  if (detectedDomains.size === 0) {
    detectedDomains.add(pathDomain || 'craftsmanship');
  }

  const DOMAIN_CONCEPT_TEMPLATES: Record<string, any[]> = {
    drawing: [
      {
        title: '60-Second Gesture Storm',
        description: 'Draw 15 quick gesture poses in 15 minutes using timed reference models. Focus on the line of action and dynamic weight rather than anatomical contour.',
        domain: 'drawing',
        skillConcept: 'Gesture & Rhythm',
        action: 'Draw 15 rapid figure gestures from 60-second photo references',
        completionCriteria: '15 gesture poses drawn capturing line of action and key proportional landmarks',
        questType: 'drill',
        masteryOutcome: 'Construct dynamic figures and objects from observation and imagination',
        activityType: 'drill',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 15,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Builds rapid structural observation, fluid arm movement, and line confidence.',
      },
      {
        title: 'Planes of the Head & Asaro Model',
        description: 'Draw the front and 3/4 view of the Asaro head, blocking in major planar shifts and cast shadows without blending.',
        domain: 'drawing',
        skillConcept: 'Anatomy & Head Planes',
        action: 'Block in planar angle shifts and core shadows on front and 3/4 head angles',
        completionCriteria: 'Front and 3/4 Asaro planar shifts drawn with clear light/shadow boundaries',
        questType: 'technique',
        masteryOutcome: 'Construct facial planes and human heads with accurate lighting and proportions',
        activityType: 'study',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 25,
        progressionStage: 'intermediate',
        prerequisiteConcepts: ['Gesture & Rhythm'],
        rationale: 'Develops 3D volumetric comprehension of the skull under direct directional light.',
      },
      {
        title: 'Two-Point Perspective Interior Grid',
        description: 'Construct a two-point perspective room box grid with horizon line and eye-level vanishing points, placing 3 volumetric furniture blocks inside.',
        domain: 'drawing',
        skillConcept: 'Perspective Grids & Spatial Depth',
        action: 'Plot horizon line and two vanishing points, then construct three 3D furniture volumes in perspective',
        completionCriteria: 'Room grid constructed with converging orthogonal lines and 3 grounded 3D forms',
        questType: 'fundamentals',
        masteryOutcome: 'Construct volumetric perspective spaces and environments from imagination',
        activityType: 'creation',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 30,
        progressionStage: 'intermediate',
        prerequisiteConcepts: ['Form & 3D Construction'],
        rationale: 'Solidifies spatial depth and prevents ungrounded floating objects in scene compositions.',
      },
      {
        title: 'Thumbnail 6 Scene Compositions',
        description: 'Draw 6 rectangular thumbnail compositions (approx 2x3 inches each) testing camera angles, foreground framing, and focal point values.',
        domain: 'drawing',
        skillConcept: 'Visual Observation & Design',
        action: 'Draw 6 thumbnail frames testing distinct camera angles and tonal contrast',
        completionCriteria: '6 finished thumbnail compositions with clear focal point and value hierarchy',
        questType: 'creation',
        masteryOutcome: 'Design compelling visual narrative compositions with strong focal hierarchy',
        activityType: 'creation',
        difficultyHint: 'challenging',
        estimatedDurationMinutes: 35,
        progressionStage: 'intermediate',
        prerequisiteConcepts: ['Perspective Grids & Spatial Depth'],
        rationale: 'Trains visual storytelling and value composition prior to investing time in finished art.',
      },
    ],
    storytelling: [
      {
        title: 'Three-Beat Conflict Escalation Scene',
        description: 'Write a 400-word scene where two characters argue over a hidden object. Each character must make three tactical moves that escalate tension without shouting.',
        domain: 'storytelling',
        skillConcept: 'Scene Structure & Conflict Escalation',
        action: 'Draft a 400-word dialogue and action scene featuring three distinct tension escalation beats',
        completionCriteria: '400 words written with rising conflict, clear subtext, and a shift in character power dynamics',
        questType: 'creation',
        masteryOutcome: 'Construct short narrative scenes with rising conflict, subtext, and clear resolution',
        activityType: 'creation',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 25,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Sharpens dramatic pacing, subtextual friction, and character agency in compressed scenes.',
      },
      {
        title: 'Dialogue Subtext & Power Inversion',
        description: 'Draft a 300-word dialogue exchange where what the characters want is completely different from what they say out loud, ending with a reversal of leverage.',
        domain: 'storytelling',
        skillConcept: 'Scene Structure & Conflict Escalation',
        action: 'Write a 300-word dialogue scene with covert motivations and a power shift',
        completionCriteria: '300 words with zero on-the-nose exposition and an observable reversal of leverage',
        questType: 'technique',
        masteryOutcome: 'Construct short narrative scenes with rising conflict, subtext, and clear resolution',
        activityType: 'creation',
        difficultyHint: 'challenging',
        estimatedDurationMinutes: 30,
        progressionStage: 'intermediate',
        prerequisiteConcepts: ['Scene Structure & Conflict Escalation'],
        rationale: 'Teaches how to convey emotional stakes without relying on melodramatic dialogue.',
      },
      {
        title: 'Masterwork Narrative Beat Decomposition',
        description: 'Analyze the opening scene of a published short story or chapter. Annotate the inciting beat, character stakes, obstacles, and the turn-point.',
        domain: 'storytelling',
        skillConcept: 'Narrative Architecture & Subtext',
        action: 'Read and annotate the opening chapter of a masterwork, identifying the five key structural beats',
        completionCriteria: 'Annotated structural breakdown highlighting turn-point and status shifts',
        questType: 'analysis',
        masteryOutcome: 'Analyze narrative structure and apply dramatic principles to original work',
        activityType: 'study',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 25,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Reveals structural patterns used by world-class writers to hook readers immediately.',
      },
      {
        title: '25-Minute Distraction-Free Writing Sprint',
        description: 'Set a 25-minute timer, open a blank document, and write continuously on your current narrative arc without pausing to edit or backspace.',
        domain: 'storytelling',
        skillConcept: 'Scene Structure & Conflict Escalation',
        action: 'Draft narrative prose continuously for 25 minutes without self-censorship or revision',
        completionCriteria: 'At least 350 words produced in a single uninterrupted writing sprint',
        questType: 'drill',
        masteryOutcome: 'Generate raw first-draft narrative momentum on command',
        activityType: 'creation',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 25,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Separates drafting from editing to defeat writer block and build daily creative output.',
      },
    ],
    climbing: [
      {
        title: 'Silent Feet Traverse Circuit',
        description: 'Traverse low on the bouldering wall or foot-placement board for 10 continuous minutes without making sound when placing toes on footholds. Reset if a foot smacks or scrapes.',
        domain: 'climbing',
        skillConcept: 'Mountain Conditioning & Grip Endurance',
        action: 'Traverse 10 minutes placing toes silently on footholds without foot noise',
        completionCriteria: '10 continuous minutes of silent footwork completed with strict body tension',
        questType: 'drill',
        masteryOutcome: 'Develop aerobic endurance, lower-body uphill work capacity, and grip stamina',
        activityType: 'drill',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 15,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Eliminates sloppy foot placement, teaches hip rotation, and dramatically reduces grip fatigue.',
      },
      {
        title: '7/3 Repeaters Hangboard Protocol',
        description: 'Complete 3 sets of 6 reps (7 seconds hang, 3 seconds rest) on 20mm edge at bodyweight. Rest 3 minutes between sets. Maintain strict open-crimp or half-crimp form.',
        domain: 'climbing',
        skillConcept: 'Grip Strength & Hangboard Drills',
        action: 'Execute 3 sets of 7s hang / 3s rest repeaters on 20mm edge with engaged shoulders',
        completionCriteria: '3 complete repeater sets logged with zero form breakdown or elbow collapse',
        questType: 'conditioning',
        masteryOutcome: 'Build finger tendon durability and forearm work capacity',
        activityType: 'practical',
        difficultyHint: 'challenging',
        estimatedDurationMinutes: 20,
        progressionStage: 'intermediate',
        prerequisiteConcepts: ['Mountain Conditioning & Grip Endurance'],
        rationale: 'Builds cellular work capacity in the flexor digitorum muscles and strengthens finger pulleys.',
      },
      {
        title: '15% Incline Ruck Tempo Climb',
        description: 'Walk on a 15% incline treadmill or steep trail with a 20lb pack. Maintain conversational nasal breathing pace continuously for 30 minutes.',
        domain: 'climbing',
        skillConcept: 'Mountain Conditioning & Grip Endurance',
        action: 'Walk with 20lb pack on 15% incline for 30 minutes maintaining strict nasal breathing',
        completionCriteria: '30 continuous minutes completed at 15% incline with 20lb pack without stopping',
        questType: 'conditioning',
        masteryOutcome: 'Develop aerobic endurance, lower-body uphill work capacity, and grip stamina',
        activityType: 'practical',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 30,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Builds foundational Zone 2 aerobic base and lower-body durability necessary for high-altitude ascents.',
      },
      {
        title: 'Hover Hands & Body Tension Drill',
        description: 'Climb 4 boulder problems 1-2 grades below maximum. Before grabbing each handhold, hover your hand 2 inches above the hold for a deliberate 2-second pause.',
        domain: 'climbing',
        skillConcept: 'Dynamic Movement & Kinetic Balance',
        action: 'Climb 4 routes with a 2-second hover pause before latching each handhold',
        completionCriteria: '4 routes completed with 2-second static hover pauses on every movement',
        questType: 'technique',
        masteryOutcome: 'Master core tension, deadpoints, and kinetic balance on steep terrain',
        activityType: 'drill',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 25,
        progressionStage: 'intermediate',
        prerequisiteConcepts: ['Silent Feet Traverse Circuit'],
        rationale: 'Forces complete weight distribution onto the feet and eliminates rushed, desperate lunges.',
      },
    ],
    mental_fortitude: [
      {
        title: 'Zero-Distraction Monotask Sprint',
        description: 'Select your single highest-friction task for today. Set a 45-minute timer, close all unrelated browser tabs and silence notifications, and work uninterrupted until the chime.',
        domain: 'mental_fortitude',
        skillConcept: 'Monotask Deep Work & Distraction Resistance',
        action: 'Execute your primary hard task for 45 continuous minutes with all digital alerts muted',
        completionCriteria: '45 minutes uninterrupted execution logged with zero window switches or phone checks',
        questType: 'drill',
        masteryOutcome: 'Maintain unbroken concentration on high-friction tasks without distraction',
        activityType: 'drill',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 45,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Strengthens prefrontal focus retention and builds tolerance against task-switching impulses.',
      },
      {
        title: 'Evening Friction & Avoidance Audit',
        description: 'Review your day and identify the single moment of strongest cognitive resistance or avoidance. Document what triggered the impulse and what protocol you will use next time.',
        domain: 'mental_fortitude',
        skillConcept: 'Psychological Resilience & Focus',
        action: 'Document a 5-minute written audit of daily resistance triggers and cognitive avoidance',
        completionCriteria: 'Written log identifying 1 avoidance trigger, immediate physiological reaction, and counter-action',
        questType: 'reflection',
        masteryOutcome: 'Develop psychological resilience and objective awareness under friction',
        activityType: 'reflection',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 10,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Converts unconscious procrastination into conscious self-calibration.',
      },
      {
        title: 'Cold Reset & Physiological Sigh Protocol',
        description: 'When experiencing stress or midday cognitive fatigue, perform 5 cycles of physiological sighs (double inhale through nose, long exhale through mouth) followed by a 60-second cold water facial plunge.',
        domain: 'mental_fortitude',
        skillConcept: 'Psychological Resilience & Focus',
        action: 'Perform 5 physiological sigh breath cycles followed by a 60-second cold water splash reset',
        completionCriteria: '5 breath cycles and cold reset performed with heart rate normalized',
        questType: 'fundamentals',
        masteryOutcome: 'Regulate autonomic nervous system response during high-stress states',
        activityType: 'practical',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 10,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Activates parasympathetic nervous system response to instantly restore executive focus.',
      },
    ],
    software_engineering: [
      {
        title: 'Algorithmic Graph Traversal Timed Drill',
        description: 'Implement BFS and DFS from scratch on an adjacency list representation. Annotate the time and space complexity and verify on 3 test graph cases.',
        domain: 'software_engineering',
        skillConcept: 'Data Structures & Algorithms',
        action: 'Write and test BFS and DFS implementations from scratch in code',
        completionCriteria: 'Both algorithms passing edge cases (cycles, disconnected graphs) in under 20 minutes',
        questType: 'drill',
        masteryOutcome: 'Solve non-trivial algorithmic problems with optimal time and space complexity',
        activityType: 'drill',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 25,
        progressionStage: 'intermediate',
        prerequisiteConcepts: [],
        rationale: 'Builds reflexive pattern recognition for graph and tree search mechanics.',
      },
      {
        title: 'Clean API Endpoint & Unit Test Suite',
        description: 'Implement a REST or RPC endpoint with strict schema validation, clear HTTP status responses, and comprehensive unit tests covering edge cases.',
        domain: 'software_engineering',
        skillConcept: 'System Architecture & Design',
        action: 'Implement endpoint handler and write automated unit test suite',
        completionCriteria: 'Endpoint implemented with 100% test pass rate covering happy path and 2 failure modes',
        questType: 'project',
        masteryOutcome: 'Design and deploy modular, production-ready services with clean interfaces',
        activityType: 'creation',
        difficultyHint: 'challenging',
        estimatedDurationMinutes: 45,
        progressionStage: 'intermediate',
        prerequisiteConcepts: ['Data Structures & Algorithms'],
        rationale: 'Enforces clean code architecture, defensive input handling, and test-driven reliability.',
      },
    ],
    japanese: [
      {
        title: '50-Card High-Frequency SRS Recall Sprint',
        description: 'Review 50 flashcards in your active SRS deck. Read each target sentence aloud at natural native speed before revealing the answer.',
        domain: 'japanese',
        skillConcept: 'Core Vocabulary & SRS Drills',
        action: 'Review 50 SRS cards reading target sentences aloud at native conversational cadence',
        completionCriteria: '50 cards completed with 90%+ accuracy and spoken verbal articulation',
        questType: 'drill',
        masteryOutcome: 'Retain and recall 1,500+ high-frequency vocabulary items and grammatical structures',
        activityType: 'drill',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 15,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Reinforces long-term spaced memory consolidation and verbal muscle memory.',
      },
      {
        title: 'Native Article Sentence Mining',
        description: 'Read 2 pages of a native article or graded reader. Extract 3 unfamiliar grammatical patterns or high-utility vocabulary words and write down their context sentences.',
        domain: 'japanese',
        skillConcept: 'Core Vocabulary & SRS Drills',
        action: 'Read native Japanese text and mine 3 authentic sentences for active study',
        completionCriteria: '3 authentic sentences extracted with grammatical notes and dictionary definitions',
        questType: 'study',
        masteryOutcome: 'Read authentic native literature, articles, and cultural works',
        activityType: 'study',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 25,
        progressionStage: 'intermediate',
        prerequisiteConcepts: ['Core Vocabulary & SRS Drills'],
        rationale: 'Transitions passive reading comprehension into active contextual acquisition.',
      },
    ],
    fitness: [
      {
        title: '3-Round Calisthenic Volume Circuit',
        description: 'Perform 3 rounds of 10 push-ups, 15 bodyweight squats, and a 30-second plank with 60 seconds rest between rounds.',
        domain: 'fitness',
        skillConcept: 'Calisthenics & Strength Foundations',
        action: 'Complete 3 rounds of 10 push-ups, 15 squats, and 30s plank with strict form',
        completionCriteria: '3 full rounds completed with controlled tempo and zero form breakdown',
        questType: 'drill',
        masteryOutcome: 'Develop baseline relative strength and core endurance',
        activityType: 'practical',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 20,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Builds foundational upper body, lower body, and core endurance.',
      },
    ],
    walking: [
      {
        title: '30-Minute Fast-Paced Aerobic Ruck/Walk',
        description: 'Maintain a brisk conversational pace (above 5 km/h) for 30 continuous minutes on varied elevation terrain.',
        domain: 'walking',
        skillConcept: 'Aerobic Base & Endurance',
        action: 'Walk 30 continuous minutes outdoors at brisk pace without stopping',
        completionCriteria: '30 minutes logged with continuous movement and target heart rate zone 2',
        questType: 'drill',
        masteryOutcome: 'Sustain aerobic output and active recovery base',
        activityType: 'practical',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 30,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Builds cardiovascular mitochondria without central nervous system fatigue.',
      },
    ],
    reading: [
      {
        title: '25-Page Deep Reading & Margin Synthesis',
        description: 'Read 25 pages of non-fiction or source literature with pen in hand. Write 3 synthesis notes in the margins capturing core theses.',
        domain: 'reading',
        skillConcept: 'Deep Reading & Analytical Synthesis',
        action: 'Read 25 pages and annotate 3 concise margin synthesis notes',
        completionCriteria: '25 pages completed with 3 actionable concept summaries recorded',
        questType: 'study',
        masteryOutcome: 'Extract and synthesize high-density knowledge from complex texts',
        activityType: 'study',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 35,
        progressionStage: 'intermediate',
        prerequisiteConcepts: [],
        rationale: 'Transforms passive reading into active mental schema construction.',
      },
    ],
    faith_meditation: [
      {
        title: '15-Minute Contemplative Silence & Box Breathing',
        description: 'Sit in an upright posture with eyes closed. Perform 4-4-4-4 box breathing for 15 uninterrupted minutes with phone placed in another room.',
        domain: 'faith_meditation',
        skillConcept: 'Contemplative Stillness & Breath Control',
        action: 'Perform 15 minutes of uninterrupted seated box breathing and contemplative silence',
        completionCriteria: '15 continuous minutes completed with stable upright posture',
        questType: 'fundamentals',
        masteryOutcome: 'Cultivate sustained mental stillness and emotional equilibrium',
        activityType: 'reflection',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 15,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: 'Restores attention control and lowers baseline cortisol levels.',
      },
    ],
  };

  const pool: any[] = [];
  // Priority 0: If Forge Path defines curriculum goalTracks, extract concrete actions directly!
  const goalTracks: any[] = Array.isArray(forgePath?.goalTracks) ? forgePath.goalTracks : [];
  goalTracks.forEach((gt) => {
    const dom = (gt.domain || pathDomain || 'craftsmanship').toLowerCase();
    detectedDomains.add(dom);
    if (Array.isArray(gt.concreteActions) && gt.concreteActions.length > 0) {
      gt.concreteActions.forEach((act: string, aIdx: number) => {
        if (typeof act === 'string' && act.trim()) {
          pool.push({
            title: act.trim(),
            description: `Execute curriculum task: ${act.trim()}. Focus on developing Stage ${gt.currentStage || 1} (${gt.stageName || 'Foundations'}) capabilities.`,
            domain: dom,
            skillConcept: gt.stageName || `${gt.name || dom} Practice`,
            action: act.trim(),
            completionCriteria: `Complete ${act.trim()} with strict focus and deliberate execution`,
            questType: aIdx === 0 ? 'drill' : 'fundamentals',
            masteryOutcome: gt.milestoneGoal || gt.stagePurpose || `Master Stage ${gt.currentStage || 1} capability`,
            activityType: 'drill',
            difficultyHint: gt.currentStage === 1 ? 'easy' : 'moderate',
            estimatedDurationMinutes: gt.currentStage === 1 ? 15 : 25,
            progressionStage: gt.currentStage === 1 ? 'beginner' : gt.currentStage <= 3 ? 'intermediate' : 'advanced',
            prerequisiteConcepts: [],
            goalTrackId: gt.id,
            rationale: `Directly targets ${gt.stageName || 'curriculum'} capability in your ${gt.name || dom} track.`,
          });
        }
      });
    }
  });

  Array.from(detectedDomains).forEach((dom) => {
    const templates = DOMAIN_CONCEPT_TEMPLATES[dom];
    if (templates && templates.length > 0) {
      pool.push(...templates);
    }
  });

  if (pool.length < targetCount) {
    const rawTitle = pathName || '';
    const fallbackTitle = rawTitle && !rawTitle.toLowerCase().includes('personal pursuit')
      ? rawTitle
      : (pathDomain && pathDomain !== 'universal_craft' && pathDomain !== 'general'
          ? (pathDomain.charAt(0).toUpperCase() + pathDomain.slice(1).replace(/_/g, ' '))
          : 'Craft');
    pool.push(
      {
        title: `${fallbackTitle} 30-Minute Targeted Production Sprint`,
        description: `Work uninterrupted for 30 minutes to complete one tangible draft, sketch, route, or chapter in ${fallbackTitle}.`,
        domain: pathDomain || 'craftsmanship',
        skillConcept: `${fallbackTitle} Production`,
        action: `Execute 30 minutes of uninterrupted craft production in ${fallbackTitle} with all notifications silenced`,
        completionCriteria: `30 continuous minutes logged with a concrete work artifact produced`,
        questType: 'drill',
        masteryOutcome: `Produce tangible output in ${fallbackTitle} with deliberate consistency`,
        activityType: 'drill',
        difficultyHint: 'moderate',
        estimatedDurationMinutes: 30,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: `Builds execution momentum and removes friction in ${fallbackTitle}.`,
      },
      {
        title: `${fallbackTitle} Core Mechanical Precision Drill`,
        description: `Execute 3 sets of 10 targeted mechanical repetitions isolating the primary technique in ${fallbackTitle}.`,
        domain: pathDomain || 'craftsmanship',
        skillConcept: `${fallbackTitle} Mechanics`,
        action: `Execute 3 sets of 10 deliberate practice repetitions isolating core mechanics`,
        completionCriteria: `3 sets completed with strict focus on form and zero rushed repetitions`,
        questType: 'fundamentals',
        masteryOutcome: `Execute core fundamental mechanics in ${fallbackTitle} with deliberate consistency`,
        activityType: 'practical',
        difficultyHint: 'easy',
        estimatedDurationMinutes: 20,
        progressionStage: 'beginner',
        prerequisiteConcepts: [],
        rationale: `Builds automaticity in foundational ${fallbackTitle} mechanics.`,
      }
    );
  }

  return pool.slice(0, targetCount);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Interpret User Forge Path Endpoint (supports multi-turn conversational messages array & playerContext)
  app.post('/api/gemini/interpret-path', async (req, res) => {
    try {
      const { userGoal, messages, currentPath, playerContext } = req.body;
      const effectiveGoal = userGoal || (messages && messages.length > 0 ? messages[messages.length - 1].content : '');

      if (!effectiveGoal && (!messages || messages.length === 0)) {
        return res.status(400).json({ error: 'userGoal or messages is required' });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.json(fallbackInterpretPath(effectiveGoal, messages, playerContext, currentPath));
      }

      let conversationContext = '';
      if (messages && Array.isArray(messages) && messages.length > 0) {
        conversationContext = messages
          .map((m: any) => `${m.role === 'user' ? 'Seeker' : 'Forge Life Path Guide'}: ${m.content}`)
          .join('\n');
      } else {
        conversationContext = `Seeker: ${effectiveGoal}`;
      }

      const currentPathContext = currentPath
        ? `Current Active Path: ${currentPath.name} (${currentPath.domain || 'custom'}) - Focus: ${currentPath.focus || 'General'}
Existing Skills on Path: ${(currentPath.skillConcepts || []).join(', ')}
Existing Learning Objectives: ${(currentPath.learningObjectives || []).join('; ')}`
        : 'Current Active Path: None';

      let playerSummary = '';
      if (playerContext) {
        const parts: string[] = [];
        if (playerContext.name) parts.push(`Character Name: ${playerContext.name}`);
        if (playerContext.level) parts.push(`Level: ${playerContext.level}`);
        if (playerContext.lifeClass) parts.push(`Life Class: ${playerContext.lifeClass}`);
        if (playerContext.primaryGoal) parts.push(`Primary Goal: ${playerContext.primaryGoal}`);
        if (playerContext.goals && playerContext.goals.length > 0) parts.push(`Goals: ${playerContext.goals.join('; ')}`);
        if (playerContext.interests && playerContext.interests.length > 0) parts.push(`Interests: ${playerContext.interests.join(', ')}`);
        if (playerContext.currentSkills && playerContext.currentSkills.length > 0) parts.push(`Existing Skills: ${playerContext.currentSkills.join(', ')}`);
        if (playerContext.currentHabits && playerContext.currentHabits.length > 0) parts.push(`Active Habits: ${playerContext.currentHabits.join(', ')}`);
        if (playerContext.activeDestinies && playerContext.activeDestinies.length > 0) parts.push(`Active Destinies: ${playerContext.activeDestinies.join(', ')}`);
        if (parts.length > 0) {
          playerSummary = `Existing Player Profile & State:\n${parts.map((p) => `- ${p}`).join('\n')}\n`;
        }
      }

      const prompt = `You are the Forge Life Path Guide — a wise, motivating, disciplined character mentor in a dark luxury life RPG.
The seeker is conversing with you to define or refine their Forge Path (their overarching craft, discipline, or major long-term pursuit).

${currentPathContext}
${playerSummary}
Conversation History:
${conversationContext}

CRITICAL RULES & LIFE PATH ARCHITECTURE:
1. LIFE PATH IS BROAD:
   - A Life Path represents the player's overarching long-term direction, NOT a single micro-task or narrow hobby.
   - Do NOT turn every individual interest into a separate Life Path.
   - If the seeker lists multiple interests (e.g., "I want to learn programming, Japanese, get stronger, and eventually climb mountains"), synthesize a UNIFIED, broad Life Path (such as "Universal Craftsmanship", "Polymath Disciplinarian", or "Digital Architect & Mountaineer") with cohesive skill concepts spanning their desired crafts.
   - Do NOT restrict yourself to a hardcoded list of Life Paths. Return a creative, authentic, inspiring title.

2. FORGE PATH MUTATION INTENT (CRITICAL):
   Gemini must determine whether the seeker's intent is EXPAND, REMOVE, or REPLACE:

   - EXPAND:
     The seeker wants to add another discipline, skill, goal, or area while keeping the existing Forge Path, OR adjust focus/priority.
     Examples:
     - "I also want to learn Japanese."
     - "Add mountaineering to my path."
     - "I want to learn drawing too."
     - "Can we include programming as well?"
     - "I want to focus more on Japanese." (Priority shift, NOT removal)
     Set "mutation": "expand". Provide "addedSkillConcepts" for the new skills being introduced.

   - REMOVE:
     The seeker EXPLICITLY wants an existing skill, discipline, objective, or area removed from the Forge Path.
     Examples:
     - "Remove Japanese from my path."
     - "I don't want drawing anymore."
     - "Take programming out of my Forge Path."
     - "Remove the Japanese conversation objective."
     Set "mutation": "remove". Provide "removedSkillConcepts" listing the exact concepts/disciplines to remove, and "removedLearningObjectives" listing corresponding objectives if any.

   - REMOVE_ALL_SKILLS:
     The seeker explicitly wants ALL currently existing Forge Path skills/disciplines removed.
     This is different from REMOVE, which removes only named skills.
     This operation clears the current Forge Path skill/goal-track set before applying any newly requested skills.
     Example:
     "Remove all skills. I want to learn guitar and yoga."
     Set "mutation": "remove_all_skills".
     Set "removeAllSkills": true.
     The resulting path must contain only the newly requested skills/Goal Tracks.
     Do not preserve old current Goal Tracks.
     Historical persistent Skill records are not deleted. They are reconciled as inactive after the new Forge Path is applied.

   - REPLACE:
     The seeker EXPLICITLY wants to abandon the existing direction and start over with a different Forge Path.
     Examples:
     - "Forget my current path and make it entirely about mountaineering."
     - "Replace my Forge Path with software engineering."
     - "I want to start over with drawing."
     Set "mutation": "replace". Provide the full new path in skillConcepts and learningObjectives.

   IMPORTANT MUTATION RULES:
   - OMISSION IS NOT REMOVAL: If the user says "I want to focus more on Japanese", do NOT interpret the omission of programming as a request to remove programming. That is a focus/priority change, not removal.
   - Do NOT interpret every new hobby as replace.
   - But explicit language such as:
     "remove all skills"
     "delete all my skills"
     "clear all my current skills"
     "remove everything I'm currently learning"
     "start over and remove all my current skills"
     must produce:
     "mutation": "remove_all_skills"
     "removeAllSkills": true
     If the same message says e.g. "Remove all skills because I want to learn how to play the guitar and learn yoga", then the returned structure must contain "mutation": "remove_all_skills", "removeAllSkills": true, and the NEW skillConcepts / goalTracks should represent Guitar and Yoga (not the old skills).
   - If user intent is ambiguous, return "mutation": "expand" as the safe default.
   - Never return "remove", "remove_all_skills", or "replace" unless explicitly requested with clear removal or replacement language.

3. DO NOT ASK TO RE-ENTER KNOWN DATA:
   - Use the existing player profile, current skills, and habits already provided in the context above.
   - Never prompt the seeker to manually re-enter information the application already knows.

4. CONVERSATIONAL BEHAVIOR:
   - If the seeker gave a brief, ambiguous single-word/short statement (e.g. "I want to do art"), ask a concise, natural follow-up question to clarify their direction, and set "readyToApply": false.
   - If the seeker provided sufficient vision or responded to follow-ups, synthesize their broad Life Path with "readyToApply": true.
   - NEVER present multiple-choice questionnaires, numbered options, or rigid lists for the seeker to pick from. Communicate naturally as an elite mentor.
   - In the "reasoning" field, provide a concise 1-2 sentence explanation of WHY this broad Life Path unites their goals and background.

5. SKILL CONCEPTS AND LEARNING OBJECTIVES QUALITY (CRITICAL MANDATE):
   - skillConcepts MUST be CONCRETE, TRAINABLE DISCIPLINES within that path:
     * NOT abstract academic jargon.
     * NOT vague slogans.
     * NOT broad multi-discipline pseudo-scientific categories.
     * BANNED EXAMPLES:
       - DO NOT output "Anatomical Conditioning & Muscular Hypertrophy"
       - DO NOT output "Visual Narrative Architecture"
       - DO NOT output "Deep Work & Cognitive Retention"
       - DO NOT output "Stoic Contemplation & Mental Resilience"
       - DO NOT output "Endurance & High-Altitude Preparedness"
     * CONCRETE DISCIPLINE EXAMPLES:
       - If path is "Rock Climber":
         "Finger Strength & Hangboard Mechanics", "Footwork Precision & Body Tension", "Dynamic Movement & Deadpoints", "Route Reading & Mental Composure", "Aerobic Endurance & Pump Management"
       - If path is "Manga Artist":
         "Gesture Drawing & Figure Construction", "Perspective & Background Grids", "Comic Paneling & Visual Pacing", "Inking & Line Weight Control", "Character Expression & Facial Planes"
       - If path is "Novelist":
         "Scene Structure & Conflict Escalation", "Dialogue Rhythm & Subtext", "Sensory Details & Worldbuilding", "Pacing & Chapter Cliffhangers", "Character Voice & Flaws"
       - If path is "Software Engineer":
         "Data Structures & Algorithmic Problem Solving", "System Architecture & API Design", "Testing, Debugging & Profiling", "Concurrent & Distributed Programming", "Clean Code & Refactoring Patterns"
       - If path is "Mountaineer / Hiker":
         "Weighted Pack & Incline Rucking", "Stair Climbing & Elevation Conditioning", "Trail Navigation & Route Pacing", "High-Altitude Breathwork & Recovery", "Cold Weather Camp & Gear Discipline"
   - learningObjectives MUST represent concrete, verifiable milestones of mastery or capability within that path.
     * BAD: "Develop complete mastery over personal fitness and wisdom."
     * GOOD: "Execute 15-minute gesture drawing sets with anatomical accuracy", "Complete 5.11b / V5 routes with silent, deliberate footwork", "Draft and revise a complete 4,000-word short story chapter", "Build and benchmark a production-ready concurrent service".

6. MASTERY OUTCOMES & QUEST ARCHETYPES DECOMPOSITION (v60 MANDATE):
   - Decompose the Forge Path into structured mastery outcomes and quest archetypes.
   - The system distinguishes:
     * LIFE PATH → broad unifying direction (e.g., "The Polymath's Citadel", "Universal Craftsmanship")
     * MASTERY OUTCOME → what the player must eventually be capable of demonstrating (e.g., "Draw recognizable figures from reference using gesture, proportion, and 3D construction")
     * QUEST ARCHETYPE → the kind of training method that develops that capability (e.g., 'fundamentals', 'drill', 'technique', 'study', 'application', 'creation', 'analysis', 'conditioning', 'assessment', 'project', 'reflection', 'real_world')
   - CRITICAL MULTI-DOMAIN RULE:
     DO NOT collapse underlying domains into only "universal_craft" or "personal_pursuit"!
     Even if pathName is broad (e.g. "The Polymath's Citadel"), every mastery outcome and quest archetype MUST specify its real, concrete domain (e.g. "drawing", "storytelling", "climbing", "mental_fortitude", "software_engineering").
   - For each masteryOutcome, provide:
     * id: unique string (e.g. "mo_drw_gesture", "mo_clb_endurance")
     * domain: concrete craft domain
     * skillConcept: matching one of the skillConcepts
     * outcome: clear statement of acquired capability
     * measurableCapability: observable demonstration criteria
     * prerequisiteOutcomes: array of outcome IDs that precede this
     * priority: "core" | "supporting"
   - For each questArchetype, provide:
     * id: unique string (e.g. "qa_drw_gesture_drill", "qa_clb_ruck_cond")
     * domain: concrete craft domain
     * skillConcept: matching one of the skillConcepts
     * masteryOutcome: target outcome description
     * questType: one of 'fundamentals' | 'drill' | 'technique' | 'study' | 'application' | 'creation' | 'analysis' | 'conditioning' | 'assessment' | 'project' | 'reflection' | 'real_world'
     * purpose: why this activity develops the capability
     * progressionRole: how it advances player capability

7. SPECIFICATION:
   - reply: Conversational response as the mentor.
   - pathName: Inspiring, memorable title (e.g., "Universal Craftsmanship", "Software Systems Architecture", "Anatomy & Graphic Narrative").
   - description: 1-2 sentence inspiring description of what forging this path entails.
   - domain: Concise lowercase snake_case domain slug (e.g., "universal_craft", "software_engineering", "drawing", "climbing", "polymath").
   - focus: Primary overarching focus area.
   - mutation: "expand" | "remove" | "remove_all_skills" | "replace".
   - removeAllSkills: boolean (true if the seeker explicitly requests removing all current skills).
   - addedSkillConcepts: Array of strings representing newly added skills/concepts (for expand, replace, or remove_all_skills).
   - removedSkillConcepts: Array of strings representing explicitly removed skills/concepts (for remove).
   - addedLearningObjectives: Array of strings representing newly added learning objectives.
   - removedLearningObjectives: Array of strings representing explicitly removed learning objectives (for remove).
   - skillConcepts: Array of 4 to 6 concrete, trainable disciplines essential for this path (strictly adhering to Rule 5; for remove_all_skills, contains ONLY the newly requested disciplines).
   - learningObjectives: Array of 3 to 5 clear, concrete mastery milestones (strictly adhering to Rule 5).
   - masteryOutcomes: Array of 3 to 6 decomposed mastery outcomes with concrete domains.
   - questArchetypes: Array of 4 to 8 ideal training methods with concrete domains and archetype types.
   - reasoning: Concise explanation of why this path was tailored for them.
   - readyToApply: boolean (true if synthesized and ready for player confirmation; false if asking a follow-up question).`;

      const response = await generateContentWithModelFallback(client, {
        contents: prompt,
        config: {
          systemInstruction: 'You are the Forge Life Path Guide — a wise, motivating character development mentor. Maintain full multi-turn conversational context. Converse naturally without rigid questionnaires. Understand that Life Paths are broad unifying directions. Support explicit EXPAND, REMOVE, REMOVE_ALL_SKILLS, and REPLACE mutation intents with safe EXPAND default. CRITICAL: Ensure skillConcepts are concrete, trainable disciplines and learningObjectives are tangible mastery milestones. Decompose into concrete masteryOutcomes and questArchetypes with real underlying domains (do not collapse everything into universal_craft). Ask follow-ups when ambiguous, or synthesize a complete structured path with reasoning and mutation intent when ready.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              pathName: { type: Type.STRING },
              description: { type: Type.STRING },
              domain: { type: Type.STRING },
              focus: { type: Type.STRING },
              mutation: {
                type: Type.STRING,
                enum: ['expand', 'remove', 'remove_all_skills', 'replace'],
              },
              removeAllSkills: {
                type: Type.BOOLEAN,
              },
              addedSkillConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              removedSkillConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              addedLearningObjectives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              removedLearningObjectives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              skillConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              learningObjectives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              masteryOutcomes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    skillConcept: { type: Type.STRING },
                    outcome: { type: Type.STRING },
                    measurableCapability: { type: Type.STRING },
                    prerequisiteOutcomes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    priority: {
                      type: Type.STRING,
                      enum: ['core', 'supporting'],
                    },
                  },
                  required: ['id', 'domain', 'skillConcept', 'outcome', 'measurableCapability', 'priority'],
                },
              },
              questArchetypes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    skillConcept: { type: Type.STRING },
                    masteryOutcome: { type: Type.STRING },
                    questType: {
                      type: Type.STRING,
                      enum: [
                        'fundamentals',
                        'drill',
                        'technique',
                        'study',
                        'application',
                        'creation',
                        'analysis',
                        'conditioning',
                        'assessment',
                        'project',
                        'reflection',
                        'real_world',
                      ],
                    },
                    purpose: { type: Type.STRING },
                    progressionRole: { type: Type.STRING },
                  },
                  required: ['id', 'domain', 'skillConcept', 'masteryOutcome', 'questType', 'purpose', 'progressionRole'],
                },
              },
              reasoning: { type: Type.STRING },
              readyToApply: { type: Type.BOOLEAN },
            },
            required: ['reply', 'pathName', 'description', 'domain', 'focus', 'skillConcepts', 'learningObjectives', 'reasoning', 'readyToApply', 'mutation'],
          },
        },
      });

      const text = response.text;
      if (!text) {
        return res.json(fallbackInterpretPath(effectiveGoal, messages, playerContext, currentPath));
      }

      const parsed = JSON.parse(text);
      parsed.domain = (parsed.domain || 'custom_domain').toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30);

      const rawMutation = parsed.mutation;
      const mutation: 'expand' | 'remove' | 'remove_all_skills' | 'replace' =
        rawMutation === 'remove_all_skills' || rawMutation === 'remove' || rawMutation === 'replace' || rawMutation === 'expand'
          ? rawMutation
          : 'expand';

      const removeAllSkills = Boolean(parsed.removeAllSkills || mutation === 'remove_all_skills');

      const addedSkillConcepts = Array.isArray(parsed.addedSkillConcepts) ? parsed.addedSkillConcepts : [];
      const removedSkillConcepts = Array.isArray(parsed.removedSkillConcepts) ? parsed.removedSkillConcepts : [];
      const addedLearningObjectives = Array.isArray(parsed.addedLearningObjectives) ? parsed.addedLearningObjectives : [];
      const removedLearningObjectives = Array.isArray(parsed.removedLearningObjectives) ? parsed.removedLearningObjectives : [];

      const masteryOutcomes = Array.isArray(parsed.masteryOutcomes)
        ? parsed.masteryOutcomes.map((mo: any, idx: number) => ({
            id: typeof mo.id === 'string' && mo.id ? mo.id : `mo_${idx}`,
            domain: (mo.domain || parsed.domain || 'general').toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30),
            skillConcept: String(mo.skillConcept || parsed.focus || 'Core Skill').slice(0, 100),
            outcome: String(mo.outcome || '').slice(0, 200),
            measurableCapability: String(mo.measurableCapability || '').slice(0, 250),
            prerequisiteOutcomes: Array.isArray(mo.prerequisiteOutcomes) ? mo.prerequisiteOutcomes.map(String) : [],
            priority: mo.priority === 'supporting' ? 'supporting' : 'core',
          }))
        : [];

      const questArchetypes = Array.isArray(parsed.questArchetypes)
        ? parsed.questArchetypes.map((qa: any, idx: number) => ({
            id: typeof qa.id === 'string' && qa.id ? qa.id : `qa_${idx}`,
            domain: (qa.domain || parsed.domain || 'general').toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30),
            skillConcept: String(qa.skillConcept || parsed.focus || 'Core Skill').slice(0, 100),
            masteryOutcome: String(qa.masteryOutcome || '').slice(0, 200),
            questType: [
              'fundamentals',
              'drill',
              'technique',
              'study',
              'application',
              'creation',
              'analysis',
              'conditioning',
              'assessment',
              'project',
              'reflection',
              'real_world',
            ].includes(qa.questType)
              ? qa.questType
              : 'drill',
            purpose: String(qa.purpose || '').slice(0, 200),
            progressionRole: String(qa.progressionRole || '').slice(0, 200),
          }))
        : [];

      const structuredPath = {
        pathName: parsed.pathName,
        description: parsed.description,
        domain: parsed.domain,
        focus: parsed.focus,
        skillConcepts: parsed.skillConcepts,
        learningObjectives: parsed.learningObjectives,
        masteryOutcomes,
        questArchetypes,
        reasoning: parsed.reasoning || 'Synthesized as an overarching Life Path aligned with your long-term ambitions.',
        mutation,
        removeAllSkills,
        addedSkillConcepts,
        removedSkillConcepts,
        addedLearningObjectives,
        removedLearningObjectives,
        isCustom: true,
      };

      return res.json({
        data: structuredPath,
        reply: parsed.reply,
        pathData: structuredPath,
        reasoning: structuredPath.reasoning,
        mutation,
        removeAllSkills,
        addedSkillConcepts,
        removedSkillConcepts,
        addedLearningObjectives,
        removedLearningObjectives,
        readyToApply: parsed.readyToApply ?? true,
      });
    } catch (err: any) {
      console.info('Gemini models temporarily unavailable, seamlessly activating Forge deterministic path guide.');
      const effectiveGoal = req.body?.userGoal || (req.body?.messages && req.body.messages.length > 0 ? req.body.messages[req.body.messages.length - 1].content : '');
      const fallback = fallbackInterpretPath(effectiveGoal, req.body?.messages, req.body?.playerContext, req.body?.currentPath);
      return res.json(fallback);
    }
  });

  // Interpret Daily Quest Intent Endpoint (supports conversational messages array or single userPrompt)
  app.post('/api/gemini/interpret-daily-intent', async (req, res) => {
    try {
      const { userPrompt, messages, context } = req.body;
      const effectivePrompt = userPrompt || (messages && messages.length > 0 ? messages[messages.length - 1].content : '');

      if (!effectivePrompt && (!messages || messages.length === 0)) {
        return res.status(400).json({ error: 'userPrompt or messages is required' });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.json(fallbackInterpretDailyIntent(effectivePrompt, context, messages));
      }

      let conversationContext = '';
      if (messages && Array.isArray(messages) && messages.length > 0) {
        conversationContext = messages
          .map((m: any) => `${m.role === 'user' ? 'Seeker' : 'Forge Adaptation Oracle'}: ${m.content}`)
          .join('\n');
      } else {
        conversationContext = `Seeker: ${effectivePrompt}`;
      }

      const contextSummary = context
        ? `Player Context:
- Active Forge Path: ${context.forgePathName || 'General Development'} (${context.forgePathDomain || 'general'})
- Current Focus: ${context.currentFocus || 'General Growth'}
- Key Skills: ${(context.skills || []).join(', ')}
- Recent Completed Quests: ${(context.recentQuestTitles || []).slice(0, 6).join(', ')}`
        : '';

      const prompt = `You are the Forge Daily Adaptation Oracle — an empathetic, precise quest adaptation guide in a dark luxury life RPG.
The seeker is speaking naturally about their daily physical/mental circumstances, energy level, time budget, or focus preferences to adapt today's quests.

${contextSummary}

Conversation / Daily Input:
${conversationContext}

CRITICAL RULES:
1. Do NOT require the player to provide structured forms or fill out fields. Infer all constraints purely from their natural language.
2. Examples of natural inference:
   - "I've only got about an hour tonight. I'm pretty tired from work, and honestly I'm bored of drawing. I'd rather do some Japanese and something physical."
     -> availableMinutes: 60, energyPreference: 'low', deprioritizedDomains: ['drawing'], preferredDomains: ['japanese', 'climbing'], avoidRecentlyRepeatedActivities: true.
   - "I've got two hours tonight and I'm feeling great. I want something challenging."
     -> availableMinutes: 120, energyPreference: 'high', difficultyPreference: 'challenging'.
3. Conversational Reply: Provide a concise 1-2 sentence reply summarizing what you understood and how today's quests are adapted.
4. Extract structured constraints for the Adaptive Progression Engine (APE):
   - reply: 1-2 sentence conversational acknowledgment and summary.
   - availableMinutes: Time budget in minutes (integer between 10 and 480), or null if unmentioned.
   - energyPreference: 'low' | 'moderate' | 'high' | 'peak' based on fatigue or readiness.
   - difficultyPreference: 'easy' | 'moderate' | 'challenging' | 'elite'.
   - preferredDomains: Array of domain strings to emphasize today.
   - deprioritizedDomains: Array of domain strings to deprioritize or avoid today.
   - targetSkills: Array of skill names or concepts to specifically target.
   - preferredActivityTypes: Array of ('practical' | 'study' | 'creation' | 'drill' | 'reflection').
   - noveltyPreference: 'low' | 'moderate' | 'high'.
   - avoidRecentlyRepeatedActivities: Boolean (true if user expressed boredom, fatigue, or asked for fresh tasks).
   - notes: Brief 1-sentence note summarizing how today's quests are adapted for this session.
   - readyToApply: boolean (true if constraints are clear to apply).`;

      const response = await generateContentWithModelFallback(client, {
        contents: prompt,
        config: {
          systemInstruction: 'You are the Forge Daily Adaptation Oracle — an empathetic, precise quest adaptation guide. Maintain full multi-turn conversational context, converse with the seeker, and extract exact constraints into structured JSON adhering strictly to the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              availableMinutes: { type: Type.INTEGER },
              energyPreference: { type: Type.STRING },
              difficultyPreference: { type: Type.STRING },
              preferredDomains: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              deprioritizedDomains: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              targetSkills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              preferredActivityTypes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              noveltyPreference: { type: Type.STRING },
              avoidRecentlyRepeatedActivities: { type: Type.BOOLEAN },
              notes: { type: Type.STRING },
              readyToApply: { type: Type.BOOLEAN },
            },
            required: ['reply', 'preferredDomains', 'deprioritizedDomains', 'targetSkills', 'preferredActivityTypes', 'avoidRecentlyRepeatedActivities', 'notes', 'readyToApply'],
          },
        },
      });

      const text = response.text;
      if (!text) {
        return res.json(fallbackInterpretDailyIntent(effectivePrompt, context, messages));
      }

      const parsed = JSON.parse(text);
      if (parsed.availableMinutes !== undefined && parsed.availableMinutes !== null) {
        parsed.availableMinutes = Math.max(5, Math.min(480, Math.round(parsed.availableMinutes)));
      }

      const structuredIntent = {
        availableMinutes: parsed.availableMinutes,
        energyPreference: parsed.energyPreference || 'moderate',
        difficultyPreference: parsed.difficultyPreference || 'moderate',
        preferredDomains: parsed.preferredDomains || [],
        deprioritizedDomains: parsed.deprioritizedDomains || [],
        targetSkills: parsed.targetSkills || [],
        preferredActivityTypes: parsed.preferredActivityTypes || ['practical', 'drill'],
        noveltyPreference: parsed.noveltyPreference || 'moderate',
        avoidRecentlyRepeatedActivities: Boolean(parsed.avoidRecentlyRepeatedActivities),
        notes: parsed.notes || `Adapted based on: "${effectivePrompt.slice(0, 80)}"`,
      };

      return res.json({
        reply: parsed.reply,
        intentData: structuredIntent,
        data: structuredIntent,
        readyToApply: parsed.readyToApply ?? true,
      });
    } catch (err: any) {
      console.info('Gemini models temporarily unavailable, seamlessly activating Forge deterministic daily adaptation.');
      const effectivePrompt = req.body?.userPrompt || (req.body?.messages && req.body.messages.length > 0 ? req.body.messages[req.body.messages.length - 1].content : '');
      const fallback = fallbackInterpretDailyIntent(effectivePrompt, req.body?.context, req.body?.messages);
      return res.json(fallback);
    }
  });

  // Generate Intelligent Quest Concepts Endpoint (Driven by Forge Path & Player Context)
  app.post('/api/gemini/generate-quest-concepts', async (req, res) => {
    const {
      forgePath,
      playerContext,
      questHistory,
      dailyIntent,
      count,
      activeSkills = [],
      highestUnlockedForgeBand = 1,
      refreshSeed,
      refreshNonce,
      forceRefresh = false,
    } = req.body || {};
    const targetCount = Math.max(8, Math.min(30, typeof count === 'number' ? count : 20));
    const safeHighestBand = Math.max(1, Math.min(6, typeof highestUnlockedForgeBand === 'number' ? highestUnlockedForgeBand : 1));
    const safeActiveSkills = Array.isArray(activeSkills) ? activeSkills.filter((s: any) => s && (s.name || s.id)) : [];
    const effectiveRefreshNonce = refreshNonce !== undefined ? refreshNonce : refreshSeed;

    try {
      if (!forgePath || !forgePath.domain || !forgePath.name) {
        return res.status(400).json({ error: 'forgePath with name and domain is required', concepts: [] });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.json({
          concepts: generateFallbackQuestConcepts(forgePath, targetCount, dailyIntent, safeActiveSkills, safeHighestBand, effectiveRefreshNonce, Boolean(forceRefresh), questHistory),
          source: 'fallback_offline',
        });
      }

      const pathDomain = (forgePath.domain || 'general').toLowerCase().trim();
      const pathName = forgePath.name.trim();
      const pathFocus = forgePath.focus || 'General Mastery';
      const pathDesc = forgePath.description || 'Dedicated mastery path.';
      const skillConcepts = Array.isArray(forgePath.skillConcepts) ? forgePath.skillConcepts : [];
      const learningObjectives = Array.isArray(forgePath.learningObjectives) ? forgePath.learningObjectives : [];
      const masteryOutcomes = Array.isArray(forgePath.masteryOutcomes) ? forgePath.masteryOutcomes : [];
      const questArchetypes = Array.isArray(forgePath.questArchetypes) ? forgePath.questArchetypes : [];
      const goalTracks = Array.isArray(forgePath.goalTracks) ? forgePath.goalTracks : [];

      const targetPerSkill = safeActiveSkills.length > 0
        ? Math.max(3, Math.ceil(targetCount / safeActiveSkills.length))
        : 5;

      const activeSkillsSummary = safeActiveSkills.length > 0
        ? `AUTHORITATIVE ACTIVE SKILLS (STRICT CLOSED SET):
The player has active skills strictly defined as:
${safeActiveSkills.map((s: any, idx: number) => `${idx + 1}. "${s.name}" (ID: "${s.id}", Domain: "${s.domain || s.name.toLowerCase().replace(/[^a-z0-9_]+/g, '_')}") - Stage: ${s.currentStage || 1}`).join('\n')}

CRITICAL ACTIVE SKILL CONSTRAINTS:
- The daily quest concepts MUST ONLY belong to these active skills: ${safeActiveSkills.map((s: any) => s.name).join(', ')}.
- You MUST NOT generate quests for Drawing, Climbing, Storytelling, Mental Fortitude, generic Fitness, or any other discipline unless explicitly listed above.
- Every quest concept MUST set "skillId" to the EXACT ID of the corresponding active skill (${safeActiveSkills.map((s: any) => `"${s.id}"`).join(', ')}).
- Every quest concept MUST set "questBand" to an integer between 1 and ${safeHighestBand}. Quest Band 0 is IMPOSSIBLE. No Band 2+ quests are permitted when Forge Mastery Band is 1.

DISTRIBUTION INSTRUCTION:
Generate concepts across every supplied Active Skill.
Do not concentrate concepts in only one Skill.
Target approximately ${targetPerSkill} distinct concepts per Active Skill (${safeActiveSkills.map((s: any) => `"${s.name}"`).join(', ')}).
Every Active Skill must receive multiple distinct concepts.
The final roster will target approximately two quests per Active Skill.`
        : '';

      const previousRosterStr = (questHistory?.activeQuestTitles && questHistory.activeQuestTitles.length > 0)
        ? `REFRESHED QUESTS TO EXCLUDE:
The user has refreshed these specific quests:
${questHistory.activeQuestTitles.map((t: string) => `- "${t}"`).join('\n')}
Do NOT return these quests or trivial variations of them.
Provide fresh curriculum actions for the player's active skills.`
        : '';

      const refreshSection = (forceRefresh || effectiveRefreshNonce !== undefined)
        ? `REFRESH SESSION (EXPLICIT USER REROLL):
Refresh Nonce / Entropy Seed: ${effectiveRefreshNonce}

${previousRosterStr}

DIVERSITY & NOVELTY INSTRUCTIONS:
- Generate a materially different set of valid quest concepts from the same curriculum.
- Explore different sub-skills, isolated mechanics, alternative training methods, or complementary drills within each Active Skill.
- Do NOT simply reproduce the previous active roster.
- NOTE: The refresh nonce is an internal system seed — NEVER include the nonce string or random numbers in quest titles or descriptions.`
        : '';

      const goalTracksSummary = goalTracks.length > 0
        ? `Independent Curriculum Tracks & Active Stages:
${goalTracks.map((gt: any) => `- [Track: ${gt.name || gt.domain} (ID: ${gt.id || `gt_${gt.domain}`}) - Domain: ${gt.domain}]
  * Current Stage ${gt.currentStage || 1}: "${gt.stageName || 'Fundamentals'}"
  * Stage Purpose: ${gt.stagePurpose || 'Foundational capability acquisition'}
  * Capabilities Developed: ${(gt.capabilities || []).join(', ')}
  * Concrete Action Benchmarks: ${(gt.concreteActions || []).join('; ')}`).join('\n')}`
        : '';

      const masteryOutcomesSummary = masteryOutcomes.length > 0
        ? `Target Mastery Outcomes (What player must eventually be capable of):
${masteryOutcomes.map((mo: any) => `- [${mo.domain || pathDomain}] ${mo.outcome} (Measurable capability: ${mo.measurableCapability})`).join('\n')}`
        : '';

      const questArchetypesSummary = questArchetypes.length > 0
        ? `Quest Archetypes & Training Methods:
${questArchetypes.map((qa: any) => `- [${qa.domain || pathDomain} / ${qa.questType}] ${qa.purpose} (Advances: ${qa.masteryOutcome})`).join('\n')}`
        : '';

      const playerSummary = playerContext
        ? `Player Current Status:
- Player Level: ${playerContext.level || 1}
- Tracked Skills: ${(playerContext.skills || []).map((s: any) => `${s.name || 'Skill'} (Lvl ${s.level || 1})`).join(', ') || 'None yet'}
- Primary Stats: ${(playerContext.stats || []).map((st: any) => `${st.statId}: Lvl ${st.level || 1}`).join(', ') || 'None yet'}`
        : '';

      const historySummary = questHistory
        ? `Quest History & Repetition Protection:
- Recently Completed Quests: ${(questHistory.recentCompletedTitles || []).slice(0, 10).join(', ') || 'None'}
- Active Quests in Roster: ${(questHistory.activeQuestTitles || []).slice(0, 8).join(', ') || 'None'}
- Repetition Rule: Create novel, varied exercises; avoid duplicate concepts or identical titles to recent history.`
        : '';

      const dailySummary = dailyIntent
        ? `Today's Real-World Adaptation (Temporary Daily Context):
- Note / Prompt: "${dailyIntent.userPrompt || dailyIntent.notes || 'Default daily calibration'}"
- Available Time Budget: ${dailyIntent.availableMinutes ? `${dailyIntent.availableMinutes} minutes` : 'Standard'}
- Energy Level: ${dailyIntent.energyPreference || 'moderate'}
- Difficulty Target: ${dailyIntent.difficultyPreference || 'moderate'}
- Preferred Domains: ${(dailyIntent.preferredDomains || []).join(', ') || 'None'}
- Deprioritized Domains: ${(dailyIntent.deprioritizedDomains || []).join(', ') || 'None'}
- Target Skills: ${(dailyIntent.targetSkills || []).join(', ') || 'None'}
- Preferred Activity Types: ${(dailyIntent.preferredActivityTypes || []).join(', ') || 'practical, drill'}
- Avoid Repeated Activities: ${dailyIntent.avoidRecentlyRepeatedActivities ? 'YES - high novelty required' : 'Standard'}`
        : '';

      const prompt = `Generate a rich pool of approximately ${targetCount} intelligent, domain-specific quest concepts for the player's active Forge Path.

Forge Path Profile:
- Path Name: ${pathName}
- Domain: ${pathDomain}
- Primary Focus: ${pathFocus}
- Description: ${pathDesc}
- Core Skill Concepts: ${skillConcepts.join(', ') || 'Core Foundations'}
- Learning Objectives: ${learningObjectives.join(', ') || 'Mastery consistency'}

${refreshSection}

${activeSkillsSummary}

${goalTracksSummary}

${masteryOutcomesSummary}

${questArchetypesSummary}

${playerSummary}

${historySummary}

${dailySummary}

CRITICAL v79 ARCHITECTURAL MANDATES:
1. THE TWO-PART CONTENT STRUCTURE (TITLE + EXPLANATION):
   - Every Quest concept will be presented to the player with exactly TWO content elements:
     1) TITLE: Answers "What Quest is this?" (e.g., "Planes of the Head & Asaro Model", "Silent Feet Bouldering Traverse", "Three-Beat Escalation Scene").
     2) EXPLANATION (the "description" field): Answers "What is this Quest about, and what do I actually need to do?"
        * It MUST be a single, complete, highly readable and actionable paragraph.
        * It MUST tell the player what to do, how to do it, any constraints, and how to verify completion.
        * It must NOT be generic motivational filler (do NOT say "Practice your skills for 20 minutes").
        * Do NOT generate a separate "reason" or "rationale" field.
   - Ground every quest in the player's active skills and the specific craft action.

2. THE CORE HIERARCHY:
   - LIFE PATH → broad unifying identity (e.g. "${pathName}")
   - MASTERY OUTCOME → what the player must eventually be capable of demonstrating (e.g. "Draw recognizable figures from observation using gesture and construction")
   - QUEST TYPE / TRAINING METHOD → the activity method that develops that capability ('fundamentals' | 'drill' | 'technique' | 'study' | 'application' | 'creation' | 'analysis' | 'conditioning' | 'assessment' | 'project' | 'reflection' | 'real_world')
   - QUEST → one concrete, observable action the player can complete today.

2. WHAT EXACTLY DOES THE PLAYER DO?
   - Every single quest concept MUST have:
     * action: a concise, clear description of the physical, digital, or mechanical action being executed (e.g. "Draw 15 quick gesture poses in 15 minutes using timed reference models").
     * completionCriteria: the tangible observable condition or output that marks completion (e.g. "15 finished gesture sketches with clear lines of action and proportional landmarks").
     * questType: one of 'fundamentals' | 'drill' | 'technique' | 'study' | 'application' | 'creation' | 'analysis' | 'conditioning' | 'assessment' | 'project' | 'reflection' | 'real_world'.
     * masteryOutcome: which specific mastery outcome or capability this quest develops.
     * progressionStage: 'beginner' | 'intermediate' | 'advanced'.
   - STRICTLY PROHIBIT phrases like "Personal Pursuit", "Deliberate Practice", "Skill Calibration" as standalone titles or descriptions unless accompanied by a concrete craft action.

3. MULTI-DOMAIN INTEGRITY & CURRICULUM TRACKS:
   - Generate balanced quest concepts across ALL provided active skills.
   - For each active skill or goal track, generate quests specifically calibrated to the player's CURRENT STAGE.
   - Include the "goalTrackId" corresponding to the track's ID for track-specific quests.
   - Every concept's "domain" field MUST indicate its real craft domain.

4. NO META-PLANNING:
   - STRICTLY FORBIDDEN:
     * "Plan your training schedule"
     * "Audit your goals"
     * "Reflect on your motivation"
     * "Gather drawing materials"
     * "Research climbing gyms"
   Every quest must involve actual craft, training, practice, or execution.

5. CRAFT EXECUTION BENCHMARKS (GOOD VS BAD):
   - DRAWING:
     * BAD: Title: "Drawing Deliberate Practice" | Description: "Spend 25 minutes practicing drawing fundamentals to build consistency."
     * GOOD: Title: "60-Second Gesture Storm" | Action: "Draw 15 quick gesture poses in 15 minutes using timed photo references" | Criteria: "15 gesture poses drawn capturing line of action"
   - CLIMBING:
     * BAD: Title: "Climbing Endurance Training" | Description: "Train endurance to improve overall climbing performance."
     * GOOD: Title: "Silent Feet Traverse Circuit" | Action: "Traverse low on the bouldering wall for 10 minutes without making sound when placing your toes" | Criteria: "10 continuous minutes completed with silent toe placements"
   - STORYTELLING:
     * BAD: Title: "Creative Writing Session" | Description: "Write fiction to practice storytelling."
     * GOOD: Title: "Three-Beat Conflict Escalation Scene" | Action: "Draft a 400-word dialogue scene where two characters argue over a hidden object" | Criteria: "400 words written with three tension escalation beats and subtext"
   - MENTAL FORTITUDE / DISCIPLINE:
     * BAD: Title: "Mindset Calibration" | Description: "Practice mental discipline and focus."
     * GOOD: Title: "Zero-Distraction Monotask Sprint" | Action: "Execute your single highest-friction task for 45 continuous minutes with all digital alerts muted" | Criteria: "45 minutes uninterrupted execution with zero tab switches"

6. PROGRESSION SPECTRUM:
   - Quick targeted drills (5-15 mins)
   - Focused practice sessions (20-30 mins)
   - Deep application / creation projects (45-60 mins)
   - If Today's Adaptation has a strict time budget (e.g. 15, 30 mins), ensure a healthy portion of concepts match that window.

7. STRICT SEPARATION OF CONCERNS:
   - NEVER generate XP rewards, player stats, levels, or progression values. Supply only concept intelligence. APE engine handles all mechanics.`;

      const response = await generateContentWithModelFallback(client, {
        contents: prompt,
        config: {
          systemInstruction: "You are the Forge Quest Intelligence Oracle — an elite progression architect in a dark luxury life RPG. Generate authentic, craft-specific practice and learning quest concepts for the player's Forge Path and active skills. Every quest MUST describe a REAL, ACTIONABLE TASK with a TANGIBLE COMPLETION CONDITION. NEVER generate meta-planning or vague placeholder tasks like 'Deliberate Practice'. Ground each quest in a specific active skill and mastery outcome. Supply content intelligence only. Do not reason about game rewards or XP.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concepts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    skillConcept: { type: Type.STRING },
                    skillId: { type: Type.STRING },
                    questBand: { type: Type.INTEGER },
                    learningObjective: { type: Type.STRING },
                    activityType: { type: Type.STRING },
                    difficultyHint: { type: Type.STRING },
                    estimatedDurationMinutes: { type: Type.INTEGER },
                    rationale: { type: Type.STRING },
                    questType: { type: Type.STRING },
                    masteryOutcome: { type: Type.STRING },
                    action: { type: Type.STRING },
                    completionCriteria: { type: Type.STRING },
                    progressionStage: { type: Type.STRING },
                    goalTrackId: { type: Type.STRING },
                    prerequisiteConcepts: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    'title',
                    'description',
                    'domain',
                    'skillConcept',
                    'skillId',
                    'activityType',
                    'difficultyHint',
                    'estimatedDurationMinutes',
                    'questType',
                    'action',
                    'completionCriteria',
                  ],
                },
              },
            },
            required: ['concepts'],
          },
        },
      });

      const text = response.text;
      if (!text) {
        return res.json({
          concepts: generateFallbackQuestConcepts(forgePath, targetCount, dailyIntent, safeActiveSkills, safeHighestBand, effectiveRefreshNonce, Boolean(forceRefresh), questHistory),
          source: 'fallback_heuristic',
        });
      }

      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.concepts) || parsed.concepts.length === 0) {
        return res.json({
          concepts: generateFallbackQuestConcepts(forgePath, targetCount, dailyIntent, safeActiveSkills, safeHighestBand, effectiveRefreshNonce, Boolean(forceRefresh), questHistory),
          source: 'fallback_heuristic',
        });
      }

      const VALID_QUEST_TYPES = [
        'fundamentals',
        'drill',
        'technique',
        'study',
        'application',
        'creation',
        'analysis',
        'conditioning',
        'assessment',
        'project',
        'reflection',
        'real_world',
      ];

      const validatedConcepts = parsed.concepts
        .filter((c: any) => {
          if (!c || typeof c !== 'object') return false;
          if (typeof c.title !== 'string' || !c.title.trim()) return false;
          if (typeof c.description !== 'string' || !c.description.trim()) return false;
          // Action is mandatory: REJECT if missing, empty, or not a string
          if (typeof c.action !== 'string' || !c.action.trim()) return false;
          // CompletionCriteria is mandatory: REJECT if missing, empty, or not a string
          if (typeof c.completionCriteria !== 'string' || !c.completionCriteria.trim()) return false;
          // Quality Gate: Reject generic titles
          if (isGenericTitle(c.title)) return false;
          // Quality Gate: Reject non-concrete / vague actions
          if (!isConcreteAction(c.action)) return false;
          return true;
        })
        .map((c: any) => {
          const rawDuration = typeof c.estimatedDurationMinutes === 'number' ? c.estimatedDurationMinutes : 25;
          const estimatedDurationMinutes = Math.max(5, Math.min(240, Math.round(rawDuration)));
          const rawDiff = (c.difficultyHint || 'moderate').toLowerCase();
          const difficultyHint = ['easy', 'moderate', 'challenging', 'elite'].includes(rawDiff)
            ? rawDiff
            : 'moderate';
          const rawAct = (c.activityType || 'practical').toLowerCase();
          const activityType = ['practical', 'study', 'creation', 'drill', 'reflection'].includes(rawAct)
            ? rawAct
            : 'practical';

          const rawQuestType = (c.questType || '').toLowerCase().trim();
          const questType = VALID_QUEST_TYPES.includes(rawQuestType) ? rawQuestType : 'drill';

          const action = c.action.trim().slice(0, 300);
          const completionCriteria = c.completionCriteria.trim().slice(0, 250);

          const masteryOutcome = typeof c.masteryOutcome === 'string' && c.masteryOutcome.trim()
            ? c.masteryOutcome.trim().slice(0, 200)
            : undefined;

          const rawStage = (c.progressionStage || '').toLowerCase().trim();
          const progressionStage = ['beginner', 'intermediate', 'advanced'].includes(rawStage)
            ? rawStage
            : 'intermediate';

          const prerequisiteConcepts = Array.isArray(c.prerequisiteConcepts)
            ? c.prerequisiteConcepts.map((p: any) => String(p).trim()).filter(Boolean).slice(0, 5)
            : [];

          // Strict skillId resolution:
          let resolvedSkillId = typeof c.skillId === 'string' && c.skillId.trim() ? c.skillId.trim() : undefined;
          let matchedSkill: any = null;

          if (safeActiveSkills.length > 0) {
            // For NEW AI-generated skill quests:
            // - c.skillId MUST exist
            // - c.skillId MUST exactly match one of safeActiveSkills[].id
            // If it does not: REJECT THE CONCEPT.
            // Do NOT infer the Skill from: title, description, domain, skillConcept, keywords.
            if (!resolvedSkillId) {
              return null;
            }
            matchedSkill = safeActiveSkills.find((s: any) => s.id === resolvedSkillId);
            if (!matchedSkill) {
              return null;
            }

            // Validate goalTrackId against skillId
            if (typeof c.goalTrackId === 'string' && c.goalTrackId.trim()) {
              const gtId = c.goalTrackId.trim();
              const matchingTrack = goalTracks.find((gt: any) => gt.id === gtId);
              if (matchingTrack) {
                // If the track explicitly links to a skill, it must match resolvedSkillId
                if (matchingTrack.skillId && matchingTrack.skillId !== resolvedSkillId) {
                  return null;
                }
                // If matchedSkill has an explicit goalTrackId, it must match gtId
                if (matchedSkill.goalTrackId && matchedSkill.goalTrackId !== gtId) {
                  return null;
                }
                // Check for domain conflict
                if (matchingTrack.domain && matchedSkill.domain) {
                  const gtDom = matchingTrack.domain.toLowerCase().trim();
                  const sDom = matchedSkill.domain.toLowerCase().trim();
                  if (gtDom !== sDom && !gtDom.includes(sDom) && !sDom.includes(gtDom)) {
                    return null;
                  }
                }
                // Check for name conflict
                if (matchingTrack.name && matchedSkill.name) {
                  const gtName = matchingTrack.name.toLowerCase().trim();
                  const sName = matchedSkill.name.toLowerCase().trim();
                  if (gtName !== sName && !gtName.includes(sName) && !sName.includes(gtName)) {
                    return null;
                  }
                }
              }
            }
          }

          // Band validation: clamp strictly between 1 and safeHighestBand
          const rawBand = typeof c.questBand === 'number' ? c.questBand : (typeof c.band === 'number' ? c.band : 1);
          const questBand = Math.max(1, Math.min(safeHighestBand, Math.round(rawBand)));

          return {
            title: c.title.trim().slice(0, 120),
            description: c.description.trim().slice(0, 500),
            domain: (c.domain || pathDomain).toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30),
            skillConcept: (c.skillConcept || pathFocus).trim().slice(0, 80),
            skillId: resolvedSkillId,
            questBand,
            band: questBand,
            learningObjective: typeof c.learningObjective === 'string' && c.learningObjective.trim()
              ? c.learningObjective.trim().slice(0, 150)
              : undefined,
            activityType,
            difficultyHint,
            estimatedDurationMinutes,
            rationale: typeof c.rationale === 'string' && c.rationale.trim()
              ? c.rationale.trim().slice(0, 250)
              : undefined,
            questType,
            masteryOutcome,
            action,
            completionCriteria,
            progressionStage,
            goalTrackId: typeof c.goalTrackId === 'string' && c.goalTrackId.trim() ? c.goalTrackId.trim() : undefined,
            prerequisiteConcepts,
          };
        })
        .filter(Boolean);

      if (validatedConcepts.length === 0) {
        return res.json({
          concepts: generateFallbackQuestConcepts(forgePath, targetCount, dailyIntent, safeActiveSkills, safeHighestBand, effectiveRefreshNonce, Boolean(forceRefresh), questHistory),
          source: 'fallback_heuristic',
        });
      }

      // If active skills exist, ensure each active skill has at least 2 candidates
      let finalConcepts = [...validatedConcepts];
      let supplementedCount = 0;
      if (safeActiveSkills.length > 0) {
        const fallbackList = generateFallbackQuestConcepts(forgePath, targetCount, dailyIntent, safeActiveSkills, safeHighestBand, effectiveRefreshNonce, Boolean(forceRefresh), questHistory);
        safeActiveSkills.forEach((skill: any) => {
          const skillMatches = finalConcepts.filter((c: any) => c.skillId === skill.id);
          if (skillMatches.length < 2) {
            const skillFallbacks = fallbackList.filter((fc: any) => fc.skillId === skill.id && !finalConcepts.some((c: any) => c.title.toLowerCase() === fc.title.toLowerCase()));
            const toAdd = skillFallbacks.slice(0, 3 - skillMatches.length);
            finalConcepts.push(...toAdd);
            supplementedCount += toAdd.length;
          }
        });
      }

      console.log(`[API Quest Concepts]
- Total returned concepts: ${finalConcepts.length} (Gemini validated: ${validatedConcepts.length}, Supplemented Fallback: ${supplementedCount})
- Source: gemini
- Active skills: ${safeActiveSkills.length}
- Refresh Nonce / Seed: ${effectiveRefreshNonce ?? 'None'}
- Force Refresh: ${Boolean(forceRefresh)}
- Distribution: ${safeActiveSkills.map((s: any) => `${s.name}: ${finalConcepts.filter((c: any) => c.skillId === s.id).length}`).join(', ')}`);

      return res.json({
        concepts: finalConcepts,
        count: finalConcepts.length,
        source: 'gemini',
      });
    } catch (err: any) {
      console.info('Gemini quest concept generation temporarily unavailable, falling back to heuristic craft concepts:', err?.message || err);
      const fallbackConcepts = generateFallbackQuestConcepts(forgePath, targetCount, dailyIntent, safeActiveSkills, safeHighestBand, effectiveRefreshNonce, Boolean(forceRefresh), questHistory);
      console.log(`[API Quest Concepts Fallback]
- Total fallback concepts: ${fallbackConcepts.length}
- Source: fallback_heuristic
- Active skills: ${safeActiveSkills.length}
- Refresh Nonce / Seed: ${effectiveRefreshNonce ?? 'None'}
- Force Refresh: ${Boolean(forceRefresh)}`);
      return res.json({
        concepts: fallbackConcepts,
        source: 'fallback_heuristic',
        error: err?.message || 'Generation failed',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import { ExerciseDefinition } from '../types';

export const EXERCISE_LIBRARY: ExerciseDefinition[] = [
  // ==========================================
  // STRENGTH & BODYWEIGHT (PUSH / PULL / LEGS)
  // ==========================================
  {
    id: 'push_ups',
    name: 'Push-Ups',
    category: 'BODYWEIGHT',
    muscleGroups: ['Chest', 'Triceps', 'Front Delts', 'Core'],
    movementPattern: 'PUSH',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Maintain a rigid plank with core and glutes engaged.',
      'Lower chest under control until elbows reach 90 degrees or chest brushes floor.',
      'Press explosively back to top position.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '10-20',
    defaultRestSec: 60,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Upper Body Push',
    physicalDemand: 'medium',
    tags: ['push', 'chest', 'home'],
    alternatives: ['incline_push_ups', 'decline_push_ups', 'floor_press']
  },
  {
    id: 'floor_press',
    name: 'Barbell / Plate Floor Press',
    category: 'STRENGTH',
    muscleGroups: ['Chest', 'Triceps'],
    movementPattern: 'PUSH',
    equipment: ['barbell', 'weight_plates', 'short_bar'],
    difficulty: 'intermediate',
    instructions: [
      'Lie flat on yoga mat with knees bent.',
      'Press barbell or plate vertically until elbows lock.',
      'Lower under control until triceps lightly touch floor.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '8-12',
    defaultRestSec: 90,
    progressionType: 'weight_reps',
    skillFocus: 'Strength & Hypertrophy',
    physicalDemand: 'high',
    tags: ['push', 'chest', 'barbell'],
    alternatives: ['push_ups', 'overhead_press']
  },
  {
    id: 'overhead_press',
    name: 'Standing Barbell / Plate Overhead Press',
    category: 'STRENGTH',
    muscleGroups: ['Shoulders', 'Triceps', 'Upper Chest', 'Core'],
    movementPattern: 'PUSH',
    equipment: ['barbell', 'weight_plates', 'short_bar'],
    difficulty: 'intermediate',
    instructions: [
      'Stand tall with glutes packed and core tight.',
      'Press weight directly overhead in line with midfoot.',
      'Lock out arms smoothly overhead before returning to collarbone.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '6-10',
    defaultRestSec: 90,
    progressionType: 'weight_reps',
    skillFocus: 'Shoulder Power',
    physicalDemand: 'high',
    tags: ['press', 'shoulders'],
    alternatives: ['pike_push_ups', 'push_ups']
  },
  {
    id: 'barbell_row',
    name: 'Bent-Over Barbell / Short Bar Row',
    category: 'STRENGTH',
    muscleGroups: ['Lats', 'Rhomboids', 'Rear Delts', 'Lower Back'],
    movementPattern: 'PULL',
    equipment: ['barbell', 'short_bar', 'weight_plates'],
    difficulty: 'intermediate',
    instructions: [
      'Hinge at hips with flat back at approximately 45 degrees.',
      'Pull bar towards upper abdomen, driving elbows back.',
      'Squeeze shoulder blades together at top.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '8-12',
    defaultRestSec: 90,
    progressionType: 'weight_reps',
    skillFocus: 'Postural Back Strength',
    physicalDemand: 'high',
    tags: ['pull', 'back'],
    alternatives: ['doorframe_rows', 'scapular_pulls']
  },
  {
    id: 'barbell_squat',
    name: 'Barbell Back / Front Squat',
    category: 'STRENGTH',
    muscleGroups: ['Quads', 'Glutes', 'Adductors', 'Calves'],
    movementPattern: 'SQUAT',
    equipment: ['barbell', 'weight_plates', 'short_bar'],
    difficulty: 'intermediate',
    instructions: [
      'Set feet shoulder-width apart with toes slightly flared.',
      'Squat down driving knees out in line with toes.',
      'Lower hips below parallel before driving through heels.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '8-12',
    defaultRestSec: 90,
    progressionType: 'weight_reps',
    skillFocus: 'Lower Body Base',
    physicalDemand: 'high',
    tags: ['squat', 'legs'],
    alternatives: ['parallel_squat', 'split_squat']
  },
  {
    id: 'parallel_squat',
    name: 'Parallel Bodyweight Squat',
    category: 'BODYWEIGHT',
    muscleGroups: ['Quads', 'Glutes'],
    movementPattern: 'SQUAT',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Stand feet hip-width with chest upright.',
      'Sit back into hips until thighs reach parallel.',
      'Drive up smoothly.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '15-25',
    defaultRestSec: 60,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Leg Endurance',
    physicalDemand: 'medium',
    tags: ['legs', 'bodyweight'],
    alternatives: ['barbell_squat', 'deep_squat_hold']
  },
  {
    id: 'split_squat',
    name: 'Bulgarian / Split Squat',
    category: 'STRENGTH',
    muscleGroups: ['Quads', 'Glutes', 'Hamstrings'],
    movementPattern: 'LUNGE',
    equipment: ['bodyweight', 'weight_plates', 'short_bar'],
    difficulty: 'intermediate',
    instructions: [
      'Take a long stride forward, back foot resting flat.',
      'Lower back knee toward floor keeping front shin vertical.',
      'Drive through front heel to return.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '10-12',
    defaultRestSec: 60,
    progressionType: 'weight_reps',
    skillFocus: 'Unilateral Leg Balance',
    physicalDemand: 'medium',
    tags: ['lunge', 'legs'],
    alternatives: ['side_lunge', 'parallel_squat']
  },
  {
    id: 'frog_pumps',
    name: 'Frog Pumps',
    category: 'BODYWEIGHT',
    muscleGroups: ['Glutes'],
    movementPattern: 'HINGE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Lie back on mat with soles of feet together (butterfly position).',
      'Squeeze glutes hard and raise hips towards ceiling.',
      'Hold 1 second at apex before lowering.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '20-30',
    defaultRestSec: 45,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Glute Activation',
    physicalDemand: 'medium',
    tags: ['glutes', 'activation'],
    alternatives: ['hip_bridge']
  },
  {
    id: 'hip_bridge',
    name: 'Weighted / Bodyweight Hip Bridge',
    category: 'STRENGTH',
    muscleGroups: ['Glutes', 'Hamstrings', 'Lower Back'],
    movementPattern: 'HINGE',
    equipment: ['bodyweight', 'weight_plates', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Lie flat with feet shoulder-width flat on mat.',
      'Optionally place weight plate over hips.',
      'Drive through heels until hips align with knees and shoulders.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '12-20',
    defaultRestSec: 60,
    progressionType: 'weight_reps',
    skillFocus: 'Posterior Chain',
    physicalDemand: 'medium',
    tags: ['glutes', 'hinge'],
    alternatives: ['frog_pumps']
  },

  // ==========================================
  // PLYOMETRIC & VERTICAL POWER
  // ==========================================
  {
    id: 'squat_jump',
    name: 'Explosive Squat Jump',
    category: 'PLYOMETRIC',
    muscleGroups: ['Quads', 'Glutes', 'Calves'],
    movementPattern: 'PLYO',
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Dip into quarter squat loading hips.',
      'Explode vertically driving arms upward.',
      'Land softly with bent knees absorbing ground forces quietly.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '6-10',
    defaultRestSec: 90,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Vertical Jump Power',
    physicalDemand: 'explosive',
    tags: ['plyo', 'power', 'vertical'],
    alternatives: ['power_skips', 'standing_broad_jump']
  },
  {
    id: 'standing_broad_jump',
    name: 'Standing Broad Jump',
    category: 'PLYOMETRIC',
    muscleGroups: ['Glutes', 'Hamstrings', 'Quads', 'Calves'],
    movementPattern: 'PLYO',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'intermediate',
    instructions: [
      'Swing arms back while bending knees to pre-load hips.',
      'Leap forward explosively for maximum horizontal distance.',
      'Stick the landing softly in a athletic deep knee bend.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '5-8',
    defaultRestSec: 90,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Horizontal Power',
    physicalDemand: 'explosive',
    tags: ['plyo', 'broad_jump'],
    alternatives: ['double_broad_jump', 'squat_jump']
  },
  {
    id: 'double_broad_jump',
    name: 'Double Broad Jump (Continuous)',
    category: 'PLYOMETRIC',
    muscleGroups: ['Glutes', 'Hamstrings', 'Quads'],
    movementPattern: 'PLYO',
    equipment: ['bodyweight'],
    difficulty: 'advanced',
    instructions: [
      'Perform a broad jump and immediately transition into a second jump upon landing.',
      'Minimize ground contact time between jumps.',
      'Focus on elastic recoil and soft landing.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '3-5',
    defaultRestSec: 90,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Elastic Power Recoil',
    physicalDemand: 'explosive',
    tags: ['plyo', 'advanced'],
    alternatives: ['standing_broad_jump']
  },
  {
    id: 'power_skips',
    name: 'Power Skips for Height',
    category: 'PLYOMETRIC',
    muscleGroups: ['Calves', 'Quads', 'Hip Flexors'],
    movementPattern: 'PLYO',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Skip forward driving lead knee forcefully toward chest.',
      'Drive lead arm high into air.',
      'Focus on vertical flight on every rep.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '10-16',
    defaultRestSec: 60,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Unilateral Takeoff Power',
    physicalDemand: 'explosive',
    tags: ['plyo', 'skips'],
    alternatives: ['squat_jump']
  },
  {
    id: 'side_lunge',
    name: 'Lateral / Side Lunge',
    category: 'PLYOMETRIC',
    muscleGroups: ['Adductors', 'Glutes', 'Quads'],
    movementPattern: 'LUNGE',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Step wide to the side, sinking hips back over bent leg.',
      'Keep opposite leg straight and trailing foot flat.',
      'Push off side leg back to center stance.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '10-12',
    defaultRestSec: 60,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Frontal Plane Agility',
    physicalDemand: 'medium',
    tags: ['lunge', 'lateral'],
    alternatives: ['split_squat', 'zig_zag_step']
  },
  {
    id: 'zig_zag_step',
    name: 'Zig-Zag / Balanced Agility Step',
    category: 'PLYOMETRIC',
    muscleGroups: ['Ankles', 'Calves', 'Core', 'Quads'],
    movementPattern: 'PLYO',
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Hop diagonally forward left, plant foot, then bound right.',
      'Maintain athletic balance with chest up.',
      'Quick elastic directional changes.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '12-20',
    defaultRestSec: 60,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Agility & Ankle Control',
    physicalDemand: 'high',
    tags: ['agility', 'footwork'],
    alternatives: ['side_lunge']
  },

  // ==========================================
  // CLIMBING STRENGTH & GRIP
  // ==========================================
  {
    id: 'scapular_pulls',
    name: 'Scapular Pull-Ups / Doorframe Retractions',
    category: 'CLIMBING',
    muscleGroups: ['Lats', 'Lower Traps', 'Rhomboids'],
    movementPattern: 'PULL',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Hang with straight arms.',
      'Depress shoulder blades down and back without bending elbows.',
      'Hold 1-2 seconds at top to build scapular stability.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '8-12',
    defaultRestSec: 60,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Climbing Shoulder Stability',
    physicalDemand: 'medium',
    tags: ['climbing', 'shoulders', 'scapula'],
    alternatives: ['barbell_row']
  },
  {
    id: 'doorframe_lockoff',
    name: 'Doorframe / Bar Isometric Lockoff',
    category: 'CLIMBING',
    muscleGroups: ['Forearms', 'Biceps', 'Lats', 'Core'],
    movementPattern: 'ISOMETRIC',
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Grip sturdy doorframe ledge or bar with arms bent at 90 degrees.',
      'Engage core and maintain static lockoff position.',
      'Keep body tension rigid without swinging.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 20,
    defaultRestSec: 90,
    progressionType: 'duration',
    skillFocus: 'Climbing Lockoff Endurance',
    physicalDemand: 'high',
    tags: ['climbing', 'isometric', 'grip'],
    alternatives: ['wrist_curls']
  },
  {
    id: 'wrist_curls',
    name: 'Plate / Short Bar Wrist Curls & Extensions',
    category: 'CLIMBING',
    muscleGroups: ['Forearm Flexors', 'Wrist Extensors'],
    movementPattern: 'ISOMETRIC',
    equipment: ['weight_plates', 'short_bar', 'barbell'],
    difficulty: 'beginner',
    instructions: [
      'Rest forearms flat on thighs holding plate or light bar.',
      'Slowly curl wrist upward squeezed tight at peak.',
      'Lower through full range of motion.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '15-20',
    defaultRestSec: 45,
    progressionType: 'weight_reps',
    skillFocus: 'Forearm & Tendon Health',
    physicalDemand: 'medium',
    tags: ['forearms', 'climbing', 'grip'],
    alternatives: ['doorframe_lockoff']
  },

  // ==========================================
  // BOXING & CONDITIONING
  // ==========================================
  {
    id: 'boxing_shadowboxing',
    name: 'Shadowboxing Round',
    category: 'BOXING',
    muscleGroups: ['Shoulders', 'Core', 'Lats', 'Cardio'],
    movementPattern: 'BOXING_ROUND',
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Maintain orthodox or southpaw fight stance.',
      'Flow punches (Jabs, Crosses, Hooks, Uppercuts) with clean guard.',
      'Incorporate slips, ducks, and footwork pivots continuously.'
    ],
    defaultUnit: 'rounds',
    recommendedDurationSec: 180, // 3 mins
    defaultRestSec: 60,
    progressionType: 'rounds',
    skillFocus: 'Boxing Form & Rhythm',
    physicalDemand: 'medium',
    tags: ['boxing', 'cardio'],
    alternatives: ['boxing_footwork']
  },
  {
    id: 'boxing_footwork',
    name: 'Boxing Footwork & Pendulum Drill',
    category: 'BOXING',
    muscleGroups: ['Calves', 'Hip Flexors', 'Core'],
    movementPattern: 'BOXING_ROUND',
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [
      'Stay light on balls of feet in fight stance.',
      'Step forward-back pendulum rhythm without crossing feet.',
      'Circle left and right around imaginary opponent.'
    ],
    defaultUnit: 'rounds',
    recommendedDurationSec: 180,
    defaultRestSec: 60,
    progressionType: 'rounds',
    skillFocus: 'Ring Movement',
    physicalDemand: 'medium',
    tags: ['boxing', 'footwork'],
    alternatives: ['boxing_shadowboxing']
  },
  {
    id: 'jump_rope_basic',
    name: 'Jump Rope Conditioning',
    category: 'JUMP_ROPE',
    muscleGroups: ['Calves', 'Ankles', 'Forearms', 'Cardio'],
    movementPattern: 'JUMP_ROPE_ROUND',
    equipment: ['jump_rope'],
    difficulty: 'beginner',
    instructions: [
      'Keep elbows tucked close to ribs and turn rope with wrists.',
      'Jump lightly 1-2 inches off floor landing on forefoot.',
      'Maintain smooth cadence.'
    ],
    defaultUnit: 'rounds',
    recommendedDurationSec: 120,
    defaultRestSec: 45,
    progressionType: 'duration',
    skillFocus: 'Cardio & Ankle Stiffness',
    physicalDemand: 'high',
    tags: ['jump_rope', 'conditioning'],
    alternatives: ['power_skips']
  },

  // ==========================================
  // CORE & STABILITY
  // ==========================================
  {
    id: 'leg_raises',
    name: 'Lying Leg Raises',
    category: 'CORE',
    muscleGroups: ['Lower Abs', 'Hip Flexors'],
    movementPattern: 'HINGE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Lie flat on mat, hands under glutes for pelvic support.',
      'Keep legs straight and raise to 90 degrees.',
      'Lower under control stopping 2 inches above mat.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '12-18',
    defaultRestSec: 45,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Core Control',
    physicalDemand: 'medium',
    tags: ['core', 'abs'],
    alternatives: ['reverse_crunch', 'hollow_body_hold']
  },
  {
    id: 'reverse_crunch',
    name: 'Reverse Crunch',
    category: 'CORE',
    muscleGroups: ['Lower Abs', 'Obliques'],
    movementPattern: 'HINGE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Lie back with knees bent at 90 degrees.',
      'Contract abs to curl hips off floor bringing knees toward chest.',
      'Pause briefly before lowering hips flat.'
    ],
    defaultUnit: 'reps',
    recommendedRepRange: '12-20',
    defaultRestSec: 45,
    progressionType: 'bodyweight_reps',
    skillFocus: 'Abdominal Flexion',
    physicalDemand: 'medium',
    tags: ['core', 'abs'],
    alternatives: ['leg_raises']
  },
  {
    id: 'hollow_body_hold',
    name: 'Hollow Body Hold',
    category: 'CORE',
    muscleGroups: ['Entire Abdominal Wall', 'Deep Core'],
    movementPattern: 'ISOMETRIC',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'intermediate',
    instructions: [
      'Press lower back flat into mat.',
      'Extend arms overhead and legs outward 6 inches off ground.',
      'Hold rigid banana shape without letting lower back arch.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 30,
    defaultRestSec: 60,
    progressionType: 'duration',
    skillFocus: 'Gymnastic Core Tension',
    physicalDemand: 'high',
    tags: ['core', 'isometric'],
    alternatives: ['leg_raises']
  },

  // ==========================================
  // MOBILITY & STRETCHING (FROM REFERENCES)
  // ==========================================
  {
    id: 'deep_squat_hold',
    name: 'Deep Squat Hold',
    category: 'MOBILITY',
    muscleGroups: ['Ankles', 'Hips', 'Adductors', 'Lower Back'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Sink into deep squat position with heels flat.',
      'Press elbows inside knees with palms together to open hips.',
      'Keep spine tall and breathe deeply.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 60,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Deep Hip Mobility',
    physicalDemand: 'low',
    mobilityTarget: 'Hips & Ankles',
    tags: ['mobility', 'hips'],
    alternatives: ['butterfly_sit']
  },
  {
    id: 'seated_spinal_rotation',
    name: 'Seated Spinal Rotation',
    category: 'STRETCHING',
    muscleGroups: ['Thoracic Spine', 'Obliques', 'Lower Back'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Sit cross-legged or upright with extended leg.',
      'Twist torso gently placing opposite elbow over knee.',
      'Exhale and rotate deeper through chest.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 45,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Thoracic Rotation',
    physicalDemand: 'low',
    mobilityTarget: 'Spine & Back',
    tags: ['mobility', 'spine']
  },
  {
    id: 'butterfly_sit',
    name: 'Butterfly Stretch',
    category: 'STRETCHING',
    muscleGroups: ['Adductors', 'Groin', 'Hips'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Sit with soles of feet pressed together near pelvis.',
      'Hold feet and press knees toward floor gently.',
      'Maintain long spine.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 60,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Inner Thigh Opening',
    physicalDemand: 'low',
    mobilityTarget: 'Adductors',
    tags: ['mobility', 'groin']
  },
  {
    id: 'cobra_stretch',
    name: 'Cobra Stretch',
    category: 'STRETCHING',
    muscleGroups: ['Abs', 'Hip Flexors', 'Chest'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Lie face down with palms beside shoulders.',
      'Press hands into mat to lift chest while keeping hips down.',
      'Look forward and open collarbones.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 45,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Spinal Extension',
    physicalDemand: 'low',
    mobilityTarget: 'Abdominals & Chest',
    tags: ['mobility', 'spine']
  },
  {
    id: 'downward_dog',
    name: 'Downward-Facing Dog',
    category: 'STRETCHING',
    muscleGroups: ['Hamstrings', 'Calves', 'Shoulders', 'Back'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'From hands and knees, push hips high into inverted V shape.',
      'Press heels toward floor and push mat away with open palms.',
      'Lengthen spine.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 60,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Posterior Chain Stretch',
    physicalDemand: 'low',
    mobilityTarget: 'Hamstrings & Shoulders',
    tags: ['mobility', 'hamstrings']
  },
  {
    id: 'deep_lunge',
    name: 'Deep Runner Lunge',
    category: 'STRETCHING',
    muscleGroups: ['Hip Flexors', 'Quads', 'Glutes'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Step one foot forward between hands, back leg extended long.',
      'Lower back knee gently to mat and press hips forward.',
      'Keep chest upright.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 45,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Hip Flexor Opening',
    physicalDemand: 'low',
    mobilityTarget: 'Hip Flexors',
    tags: ['mobility', 'hip_flexors'],
    alternatives: ['crescent_lunge', 'lizard_lunge']
  },
  {
    id: 'half_split',
    name: 'Half Split (Ardha Hanumanasana)',
    category: 'STRETCHING',
    muscleGroups: ['Hamstrings', 'Calves', 'Lower Back'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'From a low lunge, shift hips back over rear knee and straighten front leg.',
      'Flex front foot toes towards ceiling.',
      'Hinge at hips with flat back over front thigh.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 45,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Hamstring & Posterior Chain Release',
    physicalDemand: 'low',
    mobilityTarget: 'Hamstrings',
    tags: ['mobility', 'hamstrings'],
    alternatives: ['downward_dog', 'deep_lunge']
  },
  {
    id: 'crescent_lunge',
    name: 'Crescent Lunge Stretch',
    category: 'STRETCHING',
    muscleGroups: ['Hip Flexors', 'Quads', 'Abs'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'From deep lunge, raise arms overhead reaching fingertips to sky.',
      'Sink hips forward while extending chest and upper back upward.',
      'Maintain steady breathing through ribs.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 45,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Hip Flexor & Thoracic Opening',
    physicalDemand: 'low',
    mobilityTarget: 'Hip Flexors & Core',
    tags: ['mobility', 'lunge'],
    alternatives: ['deep_lunge', 'lizard_lunge']
  },
  {
    id: 'lizard_lunge',
    name: 'Lizard Lunge',
    category: 'STRETCHING',
    muscleGroups: ['Hips', 'Groin', 'Hamstrings', 'Quadriceps'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'intermediate',
    instructions: [
      'Step foot to outside of hands in wide stance.',
      'Optionally lower forearms onto mat inside front ankle.',
      'Let hips sink heavy toward floor.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 45,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Deep Hip & Adductor Opening',
    physicalDemand: 'low',
    mobilityTarget: 'Hips & Adductors',
    tags: ['mobility', 'hips'],
    alternatives: ['deep_lunge', 'pigeon_pose']
  },
  {
    id: 'camel_pose',
    name: 'Camel Pose (Ustrasana)',
    category: 'STRETCHING',
    muscleGroups: ['Abs', 'Chest', 'Shoulders', 'Hip Flexors'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'intermediate',
    instructions: [
      'Kneel upright with knees hip-width apart.',
      'Place hands on lower back or reach back to grasp heels.',
      'Lift chest toward ceiling and arch upper back gracefully.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 30,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Anterior Chain & Thoracic Extension',
    physicalDemand: 'low',
    mobilityTarget: 'Chest & Abs',
    tags: ['mobility', 'spine'],
    alternatives: ['cobra_stretch']
  },
  {
    id: 'pigeon_pose',
    name: 'Pigeon Pose',
    category: 'STRETCHING',
    muscleGroups: ['Gluteus Medius', 'Piriformis', 'IT Band'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'intermediate',
    instructions: [
      'Bring front knee toward same-side wrist, shin angled across mat.',
      'Extend back leg straight behind with hip facing floor.',
      'Fold forward over front shin.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 60,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Deep Glute Release',
    physicalDemand: 'low',
    mobilityTarget: 'Glutes & Hips',
    tags: ['mobility', 'glutes']
  },
  {
    id: 'childs_pose',
    name: 'Child\'s Pose',
    category: 'STRETCHING',
    muscleGroups: ['Lats', 'Lower Back', 'Hips'],
    movementPattern: 'MOBILITY_POSE',
    equipment: ['bodyweight', 'yoga_mat'],
    difficulty: 'beginner',
    instructions: [
      'Kneel on mat with big toes touching and knees wide.',
      'Sit hips back onto heels and extend arms far forward on floor.',
      'Rest forehead on mat and breathe deeply.'
    ],
    defaultUnit: 'seconds',
    recommendedDurationSec: 60,
    defaultRestSec: 30,
    progressionType: 'duration',
    skillFocus: 'Restorative Spinal Decompression',
    physicalDemand: 'low',
    mobilityTarget: 'Spine & Lats',
    tags: ['mobility', 'restorative']
  }
];

/**
  * Helper to find an exercise by ID
  */
export function getExerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISE_LIBRARY.find((ex) => ex.id === id);
}

/**
  * Helper to search alternative exercises by movement pattern or muscle group
  */
export function getExerciseAlternatives(exId: string): ExerciseDefinition[] {
  const current = getExerciseById(exId);
  if (!current) return [];

  // 1. Check direct alternatives list
  if (current.alternatives && current.alternatives.length > 0) {
    const directAlts = current.alternatives
      .map((altId) => getExerciseById(altId))
      .filter((ex): ex is ExerciseDefinition => ex !== undefined);
    if (directAlts.length >= 2) return directAlts;
  }

  // 2. Score candidate exercises based on movement pattern, muscle group overlap, and category
  const scored = EXERCISE_LIBRARY.filter((ex) => ex.id !== current.id)
    .map((candidate) => {
      let score = 0;

      // Primary criteria: Movement pattern match (+50)
      if (candidate.movementPattern === current.movementPattern) {
        score += 50;
      }

      // Secondary criteria: Category match (+20)
      if (candidate.category === current.category) {
        score += 20;
      }

      // Muscle group overlap (+10 per shared muscle group)
      const sharedMuscles = candidate.muscleGroups.filter((m) =>
        current.muscleGroups.includes(m)
      );
      score += sharedMuscles.length * 10;

      // Equipment match (+5)
      const hasEquipment = candidate.equipment.some((eq) =>
        current.equipment.includes(eq)
      );
      if (hasEquipment) score += 5;

      return { candidate, score };
    })
    .filter((item) => item.score > 20)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map((item) => item.candidate);
}

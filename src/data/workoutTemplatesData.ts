import { WorkoutTemplate } from '../types';

export const DEFAULT_WORKOUT_SPLIT: WorkoutTemplate[] = [
  {
    dayNumber: 1,
    name: 'Day 1 — Upper Body + Boxing',
    category: 'Upper Body & Fight Conditioning',
    trainingFocus: 'Push / Pull Strength + Boxing Rounds',
    estimatedDurationMins: 50,
    xpReward: 120,
    createdAt: new Date().toISOString(),
    exercises: [
      {
        id: 'd1_warmup',
        exerciseId: 'jump_rope_basic',
        name: 'Jump Rope Warm-up',
        targetSets: 2,
        targetDurationSec: 120,
        restSec: 45,
        notes: 'Smooth steady cadence to warm ankles and calves.'
      },
      {
        id: 'd1_push',
        exerciseId: 'floor_press',
        name: 'Barbell / Plate Floor Press',
        targetSets: 4,
        targetReps: '8-12',
        targetWeightKg: 20,
        restSec: 90,
        notes: 'Explosive drive up, controlled 2-sec eccentric.'
      },
      {
        id: 'd1_pull',
        exerciseId: 'barbell_row',
        name: 'Bent-Over Barbell / Short Bar Row',
        targetSets: 4,
        targetReps: '8-12',
        targetWeightKg: 20,
        restSec: 90,
        notes: 'Squeeze rhomboids at top of pull.'
      },
      {
        id: 'd1_press',
        exerciseId: 'overhead_press',
        name: 'Standing Overhead Press',
        targetSets: 3,
        targetReps: '8-10',
        targetWeightKg: 15,
        restSec: 90,
        notes: 'Tight core and glutes, lockout overhead.'
      },
      {
        id: 'd1_bodyweight_push',
        exerciseId: 'push_ups',
        name: 'Push-Ups (Burnout)',
        targetSets: 3,
        targetReps: '12-15',
        restSec: 60,
        notes: 'Strict form with full chest extension.'
      },
      {
        id: 'd1_box1',
        exerciseId: 'boxing_shadowboxing',
        name: 'Boxing Round 1 — Form & Jabs',
        targetSets: 1,
        targetDurationSec: 180,
        restSec: 60,
        roundType: 'Technique',
        notes: 'Focus on crisp jab-cross combinations and high guard.'
      },
      {
        id: 'd1_box2',
        exerciseId: 'boxing_shadowboxing',
        name: 'Boxing Round 2 — Defense & Slips',
        targetSets: 1,
        targetDurationSec: 180,
        restSec: 60,
        roundType: 'Defense',
        notes: 'Slip jab, counter cross, weave under hook.'
      },
      {
        id: 'd1_box3',
        exerciseId: 'boxing_shadowboxing',
        name: 'Boxing Round 3 — Free Flow',
        targetSets: 1,
        targetDurationSec: 180,
        restSec: 60,
        roundType: 'Combinations',
        notes: 'Flow 3 to 4 punch combinations continuously.'
      },
      {
        id: 'd1_cool',
        exerciseId: 'childs_pose',
        name: 'Child\'s Pose Cooldown',
        targetSets: 1,
        targetDurationSec: 60,
        restSec: 30,
        notes: 'Deep nasal breathing.'
      }
    ]
  },
  {
    dayNumber: 2,
    name: 'Day 2 — Lower Body + Vertical Power',
    category: 'Lower Body & Explosive Plyometrics',
    trainingFocus: 'Leg Strength, Plyometrics & Jump Power',
    estimatedDurationMins: 45,
    xpReward: 120,
    createdAt: new Date().toISOString(),
    exercises: [
      {
        id: 'd2_warmup',
        exerciseId: 'deep_squat_hold',
        name: 'Deep Squat Mobility Warm-up',
        targetSets: 2,
        targetDurationSec: 45,
        restSec: 30,
        notes: 'Open hips and ankles prior to power work.'
      },
      {
        id: 'd2_power1',
        exerciseId: 'squat_jump',
        name: 'Explosive Squat Jump',
        targetSets: 3,
        targetReps: '6-8',
        restSec: 90,
        notes: 'Quality over quantity. Land softly absorbing force.'
      },
      {
        id: 'd2_power2',
        exerciseId: 'standing_broad_jump',
        name: 'Standing Broad Jump',
        targetSets: 3,
        targetReps: '5-6',
        restSec: 90,
        notes: 'Maximum horizontal power drive.'
      },
      {
        id: 'd2_squat',
        exerciseId: 'barbell_squat',
        name: 'Barbell Back / Front Squat',
        targetSets: 4,
        targetReps: '8-10',
        targetWeightKg: 30,
        restSec: 90,
        notes: 'Squat below parallel with strong chest.'
      },
      {
        id: 'd2_frog',
        exerciseId: 'frog_pumps',
        name: 'Frog Pumps',
        targetSets: 3,
        targetReps: '20-25',
        restSec: 45,
        notes: 'Hard 1-sec squeeze at top glute contraction.'
      },
      {
        id: 'd2_lunge',
        exerciseId: 'split_squat',
        name: 'Split Squat',
        targetSets: 3,
        targetReps: '10-12',
        restSec: 60,
        notes: 'Vertical front shin, deep knee dip.'
      },
      {
        id: 'd2_core',
        exerciseId: 'reverse_crunch',
        name: 'Reverse Crunch',
        targetSets: 3,
        targetReps: '15',
        restSec: 45,
        notes: 'Control lower back on return.'
      },
      {
        id: 'd2_jump_rope',
        exerciseId: 'jump_rope_basic',
        name: 'Jump Rope Finisher',
        targetSets: 3,
        targetDurationSec: 60,
        restSec: 30,
        notes: 'Fast light footwork on toes.'
      }
    ]
  },
  {
    dayNumber: 3,
    name: 'Day 3 — Climbing Strength + Mobility',
    category: 'Climbing Performance & Mobility',
    trainingFocus: 'Grip Endurance, Scapular Control & Hip Mobility',
    estimatedDurationMins: 45,
    xpReward: 120,
    createdAt: new Date().toISOString(),
    exercises: [
      {
        id: 'd3_scap',
        exerciseId: 'scapular_pulls',
        name: 'Scapular Pull-Ups / Doorframe Retractions',
        targetSets: 3,
        targetReps: '10-12',
        restSec: 60,
        notes: 'Engage lower traps and depress shoulders.'
      },
      {
        id: 'd3_lockoff',
        exerciseId: 'doorframe_lockoff',
        name: 'Doorframe / Bar Isometric Lockoff',
        targetSets: 4,
        targetDurationSec: 20,
        restSec: 90,
        notes: 'Maintain rigid core and 90-degree elbow lock.'
      },
      {
        id: 'd3_wrist',
        exerciseId: 'wrist_curls',
        name: 'Wrist Curls & Extensions',
        targetSets: 3,
        targetReps: '15',
        targetWeightKg: 10,
        restSec: 45,
        notes: 'Forearm flexor and wrist extensor conditioning.'
      },
      {
        id: 'd3_core',
        exerciseId: 'hollow_body_hold',
        name: 'Hollow Body Hold',
        targetSets: 3,
        targetDurationSec: 30,
        restSec: 60,
        notes: 'Full body tension required for wall foot pressure.'
      },
      {
        id: 'd3_butterfly',
        exerciseId: 'butterfly_sit',
        name: 'Butterfly Stretch (Hips & Adductors)',
        targetSets: 2,
        targetDurationSec: 60,
        restSec: 30,
        notes: 'Relaxes inner thighs for high foot placement on wall.'
      },
      {
        id: 'd3_lizard',
        exerciseId: 'deep_lunge',
        name: 'Deep Runner Lunge (L & R)',
        targetSets: 2,
        targetDurationSec: 45,
        restSec: 30,
        side: 'both',
        notes: 'Opens hip flexors and deep leg extension.'
      },
      {
        id: 'd3_pigeon',
        exerciseId: 'pigeon_pose',
        name: 'Pigeon Pose (Glute Release L & R)',
        targetSets: 2,
        targetDurationSec: 60,
        restSec: 30,
        side: 'both',
        notes: 'Unlocks deep glute rotators for climbing heel hooks.'
      }
    ]
  },
  {
    dayNumber: 4,
    name: 'Day 4 — Boxing + Conditioning',
    category: 'Fight Cardio & High Intensity',
    trainingFocus: 'Cardio Engine, Shadowboxing & Footwork',
    estimatedDurationMins: 45,
    xpReward: 120,
    createdAt: new Date().toISOString(),
    exercises: [
      {
        id: 'd4_warmup',
        exerciseId: 'jump_rope_basic',
        name: 'Jump Rope Cadence',
        targetSets: 3,
        targetDurationSec: 120,
        restSec: 30,
        notes: 'Elevate heart rate and sync rhythm.'
      },
      {
        id: 'd4_round1',
        exerciseId: 'boxing_shadowboxing',
        name: 'Boxing Round 1 — Jab & Stance',
        targetSets: 1,
        targetDurationSec: 180,
        restSec: 60,
        roundType: 'Technique',
        notes: 'Pistons jabs, snap back to chin guard.'
      },
      {
        id: 'd4_round2',
        exerciseId: 'boxing_footwork',
        name: 'Boxing Round 2 — Pendulum & Footwork',
        targetSets: 1,
        targetDurationSec: 180,
        restSec: 60,
        roundType: 'Footwork',
        notes: 'Stay light on balls of feet, never cross feet.'
      },
      {
        id: 'd4_round3',
        exerciseId: 'boxing_shadowboxing',
        name: 'Boxing Round 3 — Combinations',
        targetSets: 1,
        targetDurationSec: 180,
        restSec: 60,
        roundType: 'Combinations',
        notes: 'Jab-Cross-Left Hook-Right Cross.'
      },
      {
        id: 'd4_round4',
        exerciseId: 'boxing_shadowboxing',
        name: 'Boxing Round 4 — High Intensity Tempo',
        targetSets: 1,
        targetDurationSec: 180,
        restSec: 60,
        roundType: 'Conditioning',
        notes: 'High punch volume with non-stop head movement.'
      },
      {
        id: 'd4_round5',
        exerciseId: 'boxing_shadowboxing',
        name: 'Boxing Round 5 — Free Shadowboxing',
        targetSets: 1,
        targetDurationSec: 180,
        restSec: 60,
        roundType: 'Free Shadowboxing',
        notes: 'Combine strikes, pivots, slips, and range control.'
      },
      {
        id: 'd4_core',
        exerciseId: 'leg_raises',
        name: 'Lying Leg Raises',
        targetSets: 3,
        targetReps: '15',
        restSec: 45,
        notes: 'Strict lower abs control.'
      },
      {
        id: 'd4_cool',
        exerciseId: 'cobra_stretch',
        name: 'Cobra Abdominal Stretch',
        targetSets: 2,
        targetDurationSec: 45,
        restSec: 30,
        notes: 'Decompress lower back and open abdominal wall.'
      }
    ]
  },
  {
    dayNumber: 5,
    name: 'Day 5 — Full Body + Deep Mobility',
    category: 'Full Body Strength & Deep Flow',
    trainingFocus: 'Full Body Compound Work & Deep Mobility Flow',
    estimatedDurationMins: 55,
    xpReward: 130,
    createdAt: new Date().toISOString(),
    exercises: [
      {
        id: 'd5_squat',
        exerciseId: 'barbell_squat',
        name: 'Barbell / Plate Squat',
        targetSets: 3,
        targetReps: '10',
        targetWeightKg: 25,
        restSec: 90,
        notes: 'Full depth squatting.'
      },
      {
        id: 'd5_push',
        exerciseId: 'push_ups',
        name: 'Strict Push-Ups',
        targetSets: 3,
        targetReps: '12-15',
        restSec: 60,
        notes: 'Locked plank, deep chest travel.'
      },
      {
        id: 'd5_pull',
        exerciseId: 'barbell_row',
        name: 'Barbell Row',
        targetSets: 3,
        targetReps: '10',
        targetWeightKg: 20,
        restSec: 90,
        notes: 'Controlled pull to chest.'
      },
      {
        id: 'd5_hinge',
        exerciseId: 'hip_bridge',
        name: 'Weighted Hip Bridge',
        targetSets: 3,
        targetReps: '15',
        targetWeightKg: 15,
        restSec: 60,
        notes: 'Glute squeeze at top lockout.'
      },
      {
        id: 'd5_m1',
        exerciseId: 'downward_dog',
        name: 'Downward-Facing Dog',
        targetSets: 2,
        targetDurationSec: 60,
        restSec: 30,
        notes: 'Extend posterior chain and shoulder overhead angle.'
      },
      {
        id: 'd5_m2',
        exerciseId: 'deep_lunge',
        name: 'Deep Runner Lunge (L & R)',
        targetSets: 2,
        targetDurationSec: 45,
        restSec: 30,
        side: 'both',
        notes: 'Sink hips deep towards floor.'
      },
      {
        id: 'd5_m3',
        exerciseId: 'pigeon_pose',
        name: 'Pigeon Pose (L & R)',
        targetSets: 2,
        targetDurationSec: 60,
        restSec: 30,
        side: 'both',
        notes: 'Relax glutes and outer hips.'
      },
      {
        id: 'd5_m4',
        exerciseId: 'seated_spinal_rotation',
        name: 'Seated Spinal Rotation (L & R)',
        targetSets: 2,
        targetDurationSec: 45,
        restSec: 30,
        side: 'both',
        notes: 'Decompress thoracic spine.'
      },
      {
        id: 'd5_m5',
        exerciseId: 'childs_pose',
        name: 'Child\'s Pose',
        targetSets: 1,
        targetDurationSec: 60,
        restSec: 30,
        notes: 'Final restorative breath focus.'
      }
    ]
  }
];

import React, { useEffect, useRef } from 'react';

interface ForgeMountainWindCanvasProps {
  className?: string;
}

interface PolygonFacet {
  points: { x: number; y: number }[];
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

interface RidgeLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width: number;
}

interface CloudLobe {
  x: number;
  y: number;
  rx: number;
  ry: number;
  alpha: number;
  driftSpeed: number;
}

interface DistantBird {
  x: number;
  y: number;
  speed: number;
  wingSpan: number;
  phase: number;
}

interface WindStream {
  y: number;
  length: number;
  speed: number;
  amplitude: number;
  frequency: number;
  phase: number;
  strokeWidth: number;
  alpha: number;
  color: string;
}

interface WindParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  phase: number;
}

export const ForgeMountainWindCanvas: React.FC<ForgeMountainWindCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let lastFrameTime = 0;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const cachedDpr = Math.min(rawDpr, 1.5);

    let cachedWidth = 0;
    let cachedHeight = 0;

    // Geometric Himalayan structures (precalculated once on resize)
    let distantSkyline: { x: number; y: number }[] = [];
    let distantPeakFacets: PolygonFacet[] = [];
    let secondaryMassifs: PolygonFacet[] = [];
    let heroBaseSilhouette: { x: number; y: number }[] = [];
    let heroFacets: PolygonFacet[] = [];
    let couloirsAndFlutes: RidgeLine[] = [];
    let spineRidgeLine: { x: number; y: number }[] = [];
    let cloudLobes: CloudLobe[] = [];
    let leftForegroundRidge: { x: number; y: number }[] = [];
    let leftForegroundTrees: { x: number; y: number }[] = [];
    let rightForegroundRidge: { x: number; y: number }[] = [];
    let rightForegroundTrees: { x: number; y: number }[] = [];
    let summitPoint = { x: 0, y: 0 };

    // 4 soaring alpine choughs (high-altitude mountain birds in the deep valley)
    const distantBirds: DistantBird[] = [
      { x: 0.32, y: 0.68, speed: 0.018, wingSpan: 4.5, phase: 0.2 },
      { x: 0.36, y: 0.69, speed: 0.020, wingSpan: 3.8, phase: 1.4 },
      { x: 0.52, y: 0.74, speed: -0.016, wingSpan: 4.2, phase: 2.8 },
      { x: 0.55, y: 0.75, speed: -0.015, wingSpan: 3.5, phase: 4.1 },
    ];

    // Delicate wind streams flowing gently through the valley
    const windStreams: WindStream[] = [];
    const streamCount = 8;
    const streamColors = [
      'rgba(169, 120, 53, 0.26)', // warm bronze
      'rgba(102, 112, 85, 0.22)', // muted olive
      'rgba(145, 138, 122, 0.24)', // warm stone
      'rgba(197, 160, 89, 0.25)', // golden bronze
    ];

    const initStreams = (width: number, height: number) => {
      windStreams.length = 0;
      for (let i = 0; i < streamCount; i++) {
        windStreams.push({
          y: height * 0.62 + height * 0.32 * (i / streamCount) + (Math.random() * 14 - 7),
          length: width * (0.22 + Math.random() * 0.28),
          speed: 0.35 + Math.random() * 0.45,
          amplitude: 4 + Math.random() * 8,
          frequency: 0.0020 + Math.random() * 0.0028,
          phase: Math.random() * Math.PI * 2,
          strokeWidth: 1.0 + Math.random() * 1.2,
          alpha: 0.16 + Math.random() * 0.18,
          color: streamColors[i % streamColors.length],
        });
      }
    };

    // Sparse ambient micro-particles (14 tiny dust/snow glints)
    const particles: WindParticle[] = [];
    const particleCount = 14;

    const initParticles = (width: number, height: number) => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: height * 0.54 + Math.random() * (height * 0.42),
          vx: 0.3 + Math.random() * 0.5,
          vy: (Math.random() - 0.48) * 0.16,
          size: 0.9 + Math.random() * 1.3,
          alpha: Math.random() * 0.25,
          maxAlpha: 0.16 + Math.random() * 0.20,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    // Construct the monumental Himalayan vector composition directly from reference photograph
    const buildHimalayanComposition = (width: number, height: number) => {
      const isNarrow = width < 640;

      // The dominant central summit rises majestically to ~22% (mobile ~25%) of viewport
      const summitX = width * 0.505;
      const summitY = height * (isNarrow ? 0.25 : 0.21);
      summitPoint = { x: summitX, y: summitY };

      // =========================================================================
      // 1. TIER 1: Distant Background Spire Range (Far Himalayan Horizon)
      // =========================================================================
      distantSkyline = [
        { x: 0, y: height * 0.50 },
        { x: width * 0.06, y: height * 0.45 },
        { x: width * 0.11, y: height * 0.47 },
        { x: width * 0.16, y: height * 0.41 }, // Left sharp background pyramid peak
        { x: width * 0.22, y: height * 0.48 },
        { x: width * 0.32, y: height * 0.45 },
        { x: width * 0.42, y: height * 0.49 },
        { x: width * 0.58, y: height * 0.48 },
        { x: width * 0.68, y: height * 0.44 },
        { x: width * 0.76, y: height * 0.49 },
        { x: width * 0.86, y: height * 0.43 }, // Right sharp background peak
        { x: width * 0.93, y: height * 0.47 },
        { x: width * 0.98, y: height * 0.44 }, // Far right spire
        { x: width, y: height * 0.48 },
      ];

      distantPeakFacets = [];

      // Left background sharp pyramid (inspired by distant peak in photo)
      const distLeftApex = { x: width * 0.16, y: height * 0.41 };
      distantPeakFacets.push({
        // Sunlit face
        points: [
          distLeftApex,
          { x: width * 0.11, y: height * 0.47 },
          { x: width * 0.165, y: height * 0.51 },
        ],
        fill: '#EDE8E0', // Soft distant snow
        stroke: 'rgba(215, 210, 200, 0.6)',
        strokeWidth: 0.8,
      });
      distantPeakFacets.push({
        // Shadow face
        points: [
          distLeftApex,
          { x: width * 0.165, y: height * 0.51 },
          { x: width * 0.22, y: height * 0.48 },
        ],
        fill: '#9E9687', // Muted distant rock shadow
      });

      // Right background spires (inspired by right distant peaks in photo)
      const distRightApex1 = { x: width * 0.86, y: height * 0.43 };
      distantPeakFacets.push({
        // Sunlit snow face
        points: [
          distRightApex1,
          { x: width * 0.82, y: height * 0.48 },
          { x: width * 0.87, y: height * 0.51 },
        ],
        fill: '#F2EEE6',
      });
      distantPeakFacets.push({
        // Shaded face
        points: [
          distRightApex1,
          { x: width * 0.87, y: height * 0.51 },
          { x: width * 0.93, y: height * 0.47 },
        ],
        fill: '#9B9284',
      });

      const distRightApex2 = { x: width * 0.98, y: height * 0.44 };
      distantPeakFacets.push({
        points: [
          distRightApex2,
          { x: width * 0.95, y: height * 0.49 },
          { x: width, y: height * 0.48 },
        ],
        fill: '#E8E3DA',
      });

      // =========================================================================
      // 2. TIER 2: Secondary Midground Flanking Massifs
      // =========================================================================
      secondaryMassifs = [];

      // Left Midground Flank (Shoulder Massif)
      const leftApex = { x: width * 0.18, y: height * 0.49 };
      const leftCol  = { x: width * 0.33, y: height * 0.59 };
      secondaryMassifs.push({
        points: [
          { x: -width * 0.05, y: height * 0.72 },
          { x: width * 0.06, y: height * 0.58 },
          leftApex,
          leftCol,
          { x: width * 0.28, y: height * 0.80 },
          { x: -width * 0.05, y: height * 0.85 },
        ],
        fill: '#BBB2A2',
        stroke: 'rgba(150, 142, 130, 0.6)',
        strokeWidth: 1.0,
      });
      // Left sunlit snow slope
      secondaryMassifs.push({
        points: [
          leftApex,
          { x: width * 0.23, y: height * 0.54 },
          leftCol,
          { x: width * 0.19, y: height * 0.63 },
        ],
        fill: '#EFECE4',
      });
      // Left shadowed rock
      secondaryMassifs.push({
        points: [
          { x: width * 0.06, y: height * 0.58 },
          leftApex,
          { x: width * 0.19, y: height * 0.63 },
          { x: width * 0.09, y: height * 0.72 },
        ],
        fill: '#7D7465',
      });

      // Right Midground Flank (Shoulder Massif)
      const rightApex = { x: width * 0.82, y: height * 0.48 };
      const rightCol  = { x: width * 0.67, y: height * 0.58 };
      secondaryMassifs.push({
        points: [
          rightCol,
          rightApex,
          { x: width * 0.94, y: height * 0.56 },
          { x: width * 1.06, y: height * 0.72 },
          { x: width * 0.75, y: height * 0.82 },
        ],
        fill: '#B8AF9F',
        stroke: 'rgba(148, 140, 128, 0.6)',
        strokeWidth: 1.0,
      });
      // Right sunlit snow ramp
      secondaryMassifs.push({
        points: [
          rightApex,
          { x: width * 0.94, y: height * 0.56 },
          { x: width * 0.86, y: height * 0.65 },
          { x: width * 0.80, y: height * 0.56 },
        ],
        fill: '#F4F0E8',
      });
      // Right shadowed rock face
      secondaryMassifs.push({
        points: [
          rightCol,
          rightApex,
          { x: width * 0.80, y: height * 0.56 },
          { x: width * 0.73, y: height * 0.70 },
        ],
        fill: '#716859',
      });

      // =========================================================================
      // 3. TIER 3: The Colossal Central Himalayan Mountain (Dominant Hero Peak)
      // =========================================================================

      // The Central Knife-Edge Arête / Spine separating Sunlit Face (Left) and Shaded Face (Right)
      const s0 = { x: summitX, y: summitY };
      const s1 = { x: width * 0.496, y: height * 0.268 };
      const s2 = { x: width * 0.514, y: height * 0.320 }; // natural rock kink
      const s3 = { x: width * 0.502, y: height * 0.380 };
      const s4 = { x: width * 0.485, y: height * 0.450 };
      const s5 = { x: width * 0.460, y: height * 0.535 };
      const s6 = { x: width * 0.432, y: height * 0.630 };
      const s7 = { x: width * 0.400, y: height * 0.730 };
      const sBase = { x: width * 0.370, y: height * 0.830 };

      spineRidgeLine = [s0, s1, s2, s3, s4, s5, s6, s7, sBase];

      // Left (West) Skyline Ridge
      const w0 = s0;
      const w1 = { x: width * 0.475, y: height * 0.250 };
      const w2 = { x: width * 0.442, y: height * 0.290 };
      const w3 = { x: width * 0.405, y: height * 0.345 };
      const w4 = { x: width * 0.355, y: height * 0.420 };
      const w5 = { x: width * 0.295, y: height * 0.510 };
      const w6 = { x: width * 0.225, y: height * 0.615 };
      const w7 = { x: width * 0.150, y: height * 0.730 };
      const wBase = { x: width * 0.080, y: height * 0.840 };

      // Right (East) Skyline Ridge
      const e0 = s0;
      const e1 = { x: width * 0.535, y: height * 0.255 };
      const e2 = { x: width * 0.575, y: height * 0.310 };
      const e3 = { x: width * 0.630, y: height * 0.385 };
      const e4 = { x: width * 0.695, y: height * 0.475 };
      const e5 = { x: width * 0.770, y: height * 0.580 };
      const e6 = { x: width * 0.850, y: height * 0.695 };
      const eBase = { x: width * 0.920, y: height * 0.820 };

      // Base silhouette for the giant mountain
      heroBaseSilhouette = [
        { x: -width * 0.1, y: height * 0.96 },
        { x: -width * 0.02, y: height * 0.88 },
        wBase,
        w7,
        w6,
        w5,
        w4,
        w3,
        w2,
        w1,
        s0,
        e1,
        e2,
        e3,
        e4,
        e5,
        e6,
        eBase,
        { x: width * 1.05, y: height * 0.90 },
        { x: width * 1.1, y: height * 0.96 },
      ];

      heroFacets = [];
      couloirsAndFlutes = [];

      // A. SUMMIT APEX CAP (Gneiss rock pinnacle)
      heroFacets.push({
        points: [s0, e1, s1, w1],
        fill: '#4A4337',
        stroke: 'rgba(212, 175, 55, 0.55)',
        strokeWidth: 1.2,
      });

      // B. LEFT FACE (Sunlit Snowfields, Rock Ribs & Couloirs)
      // Upper Summit Snow Pyramid (Luminous warm ivory snow)
      heroFacets.push({
        points: [w1, s1, s2, { x: width * 0.470, y: height * 0.315 }],
        fill: '#FCFAF5',
        stroke: 'rgba(240, 235, 225, 0.7)',
        strokeWidth: 0.8,
      });

      // Upper Rock Buttress facet
      heroFacets.push({
        points: [w1, { x: width * 0.470, y: height * 0.315 }, w2],
        fill: '#827867',
        stroke: 'rgba(110, 102, 88, 0.5)',
        strokeWidth: 0.8,
      });

      // Upper Central Snow Flute
      heroFacets.push({
        points: [
          s1,
          s2,
          { x: width * 0.485, y: height * 0.355 },
          { x: width * 0.450, y: height * 0.340 },
        ],
        fill: '#F8F5EE',
      });

      // Step 2 Exposed Rock Rib
      heroFacets.push({
        points: [w2, { x: width * 0.450, y: height * 0.340 }, w3],
        fill: '#6D6454',
      });

      // Mid-Upper Great Snowfield
      heroFacets.push({
        points: [
          { x: width * 0.450, y: height * 0.340 },
          s2,
          s3,
          { x: width * 0.460, y: height * 0.410 },
        ],
        fill: '#F5F1E8',
      });

      // The Yellow Band: Iconic Himalayan Golden Strata cutting across
      heroFacets.push({
        points: [
          w3,
          { x: width * 0.460, y: height * 0.410 },
          s3,
          { x: width * 0.440, y: height * 0.440 },
          w4,
        ],
        fill: 'rgba(182, 146, 92, 0.72)',
        stroke: 'rgba(148, 116, 68, 0.5)',
        strokeWidth: 1.0,
      });

      // Mid Snow Flute Ramp
      heroFacets.push({
        points: [
          { x: width * 0.440, y: height * 0.440 },
          s3,
          s4,
          { x: width * 0.410, y: height * 0.485 },
        ],
        fill: '#FAF7F0',
      });

      // Mid-West Shadow Crevasse / Rock Face
      heroFacets.push({
        points: [w4, { x: width * 0.410, y: height * 0.485 }, { x: width * 0.350, y: height * 0.475 }],
        fill: '#5A5243',
      });

      // Lower-Mid Expansive Glaciated Slope (Great Snow Face)
      heroFacets.push({
        points: [
          { x: width * 0.350, y: height * 0.475 },
          { x: width * 0.410, y: height * 0.485 },
          s4,
          s5,
          { x: width * 0.360, y: height * 0.585 },
        ],
        fill: '#F3EFE6',
      });

      // Lower West Rock Rib
      heroFacets.push({
        points: [w5, { x: width * 0.350, y: height * 0.475 }, { x: width * 0.360, y: height * 0.585 }, w6],
        fill: '#756C5B',
      });

      // Lower Glacial Snow Basin
      heroFacets.push({
        points: [
          { x: width * 0.360, y: height * 0.585 },
          s5,
          s6,
          { x: width * 0.310, y: height * 0.700 },
        ],
        fill: '#EBE5D8',
      });

      // Lower Terminal Moraine & Scree Apron
      heroFacets.push({
        points: [w6, { x: width * 0.310, y: height * 0.700 }, s6, s7, w7],
        fill: '#D8D1C2',
      });

      // Base Apron (entering the valley mist)
      heroFacets.push({
        points: [w7, s7, sBase, wBase],
        fill: '#C4BCAB',
      });

      // C. RIGHT FACE (Steep Shaded Basalt Precipice & Cold Snow Shelves)
      // Upper Northeast Precipice (Dark rock wall)
      heroFacets.push({
        points: [s0, e1, { x: width * 0.550, y: height * 0.300 }, s1],
        fill: '#383228',
        stroke: 'rgba(52, 46, 38, 0.7)',
        strokeWidth: 1.0,
      });

      // Upper North Face Rock Cleavage
      heroFacets.push({
        points: [s1, { x: width * 0.550, y: height * 0.300 }, e2, s2],
        fill: '#453E32',
      });

      // Hanging Snow Shelf (Catching Rim Light)
      heroFacets.push({
        points: [
          { x: width * 0.550, y: height * 0.300 },
          e2,
          { x: width * 0.600, y: height * 0.360 },
          { x: width * 0.560, y: height * 0.350 },
        ],
        fill: '#DCD6CA',
      });

      // Mid-Upper Dark Basalt Wall
      heroFacets.push({
        points: [
          s2,
          { x: width * 0.560, y: height * 0.350 },
          { x: width * 0.600, y: height * 0.360 },
          e3,
          s3,
        ],
        fill: '#2F2A21',
      });

      // Yellow Band Traversal on Shaded Face
      heroFacets.push({
        points: [
          s3,
          e3,
          { x: width * 0.650, y: height * 0.430 },
          { x: width * 0.550, y: height * 0.420 },
        ],
        fill: 'rgba(155, 122, 75, 0.55)',
      });

      // Mid Shaded Glacier & Snow Couloir
      heroFacets.push({
        points: [
          { x: width * 0.550, y: height * 0.420 },
          { x: width * 0.650, y: height * 0.430 },
          e4,
          s4,
        ],
        fill: '#CCC5B6',
      });

      // Mid-Lower Massive Shaded Rock Buttress
      heroFacets.push({
        points: [s4, e4, { x: width * 0.720, y: height * 0.540 }, s5],
        fill: '#373127',
      });

      // Lower Shaded Snow Rib
      heroFacets.push({
        points: [
          s5,
          { x: width * 0.720, y: height * 0.540 },
          e5,
          { x: width * 0.600, y: height * 0.640 },
        ],
        fill: '#BAB2A1',
      });

      // Lower Shaded Rock Ramp
      heroFacets.push({
        points: [s5, { x: width * 0.600, y: height * 0.640 }, s6, { x: width * 0.520, y: height * 0.730 }],
        fill: '#2C271E',
      });

      // Lower East Glacial Buttress
      heroFacets.push({
        points: [{ x: width * 0.600, y: height * 0.640 }, e5, e6, { x: width * 0.520, y: height * 0.730 }],
        fill: '#332D24',
      });

      // Base Apron (entering the right valley mist)
      heroFacets.push({
        points: [s6, { x: width * 0.520, y: height * 0.730 }, s7, sBase, e6, eBase],
        fill: '#26221A',
      });

      // D. FINE SNOW COULOIRS & FLUTE STREAKS (Vector Ridges following slope contours)
      couloirsAndFlutes = [
        // Left face sunlit snow couloirs (pure brilliant white flutes)
        {
          from: { x: width * 0.485, y: height * 0.280 },
          to: { x: width * 0.430, y: height * 0.350 },
          color: '#FFFFFF',
          width: 1.5,
        },
        {
          from: { x: width * 0.495, y: height * 0.340 },
          to: { x: width * 0.410, y: height * 0.430 },
          color: '#FFFFFF',
          width: 1.8,
        },
        {
          from: { x: width * 0.480, y: height * 0.400 },
          to: { x: width * 0.360, y: height * 0.520 },
          color: '#FFFFFF',
          width: 2.0,
        },
        {
          from: { x: width * 0.450, y: height * 0.480 },
          to: { x: width * 0.300, y: height * 0.630 },
          color: 'rgba(255, 255, 255, 0.92)',
          width: 2.2,
        },
        {
          from: { x: width * 0.420, y: height * 0.580 },
          to: { x: width * 0.240, y: height * 0.730 },
          color: 'rgba(255, 255, 255, 0.85)',
          width: 2.0,
        },
        // Right face ice couloirs cutting through dark rock
        {
          from: { x: width * 0.510, y: height * 0.290 },
          to: { x: width * 0.560, y: height * 0.350 },
          color: 'rgba(240, 236, 228, 0.75)',
          width: 1.2,
        },
        {
          from: { x: width * 0.505, y: height * 0.370 },
          to: { x: width * 0.590, y: height * 0.450 },
          color: 'rgba(235, 230, 220, 0.70)',
          width: 1.4,
        },
        {
          from: { x: width * 0.480, y: height * 0.470 },
          to: { x: width * 0.630, y: height * 0.570 },
          color: 'rgba(225, 218, 205, 0.65)',
          width: 1.5,
        },
        {
          from: { x: width * 0.445, y: height * 0.580 },
          to: { x: width * 0.660, y: height * 0.680 },
          color: 'rgba(215, 208, 195, 0.60)',
          width: 1.6,
        },
      ];

      // =========================================================================
      // 4. TIER 4: Layered Midground Clouds & Valley Fog (Wrapping Mountain Base)
      // =========================================================================
      cloudLobes = [
        // Left flank cloud cluster
        { x: width * 0.16, y: height * 0.64, rx: width * 0.14, ry: height * 0.048, alpha: 0.75, driftSpeed: 2.2 },
        { x: width * 0.25, y: height * 0.67, rx: width * 0.13, ry: height * 0.052, alpha: 0.85, driftSpeed: 1.8 },
        { x: width * 0.32, y: height * 0.70, rx: width * 0.12, ry: height * 0.046, alpha: 0.80, driftSpeed: 2.0 },
        // Center deep valley cloud bank
        { x: width * 0.42, y: height * 0.73, rx: width * 0.15, ry: height * 0.050, alpha: 0.82, driftSpeed: 1.5 },
        { x: width * 0.54, y: height * 0.75, rx: width * 0.16, ry: height * 0.054, alpha: 0.86, driftSpeed: 1.7 },
        // Right flank cloud cluster
        { x: width * 0.68, y: height * 0.66, rx: width * 0.15, ry: height * 0.048, alpha: 0.80, driftSpeed: 1.9 },
        { x: width * 0.78, y: height * 0.63, rx: width * 0.14, ry: height * 0.045, alpha: 0.75, driftSpeed: 2.1 },
        { x: width * 0.88, y: height * 0.68, rx: width * 0.13, ry: height * 0.042, alpha: 0.70, driftSpeed: 2.3 },
      ];

      // =========================================================================
      // 5. TIER 5: Deep V-Valley & Framing Dark Foreground Mountain Ridges
      // =========================================================================
      // Left Foreground Mountain Ridge (Sloping down from left into central valley)
      leftForegroundRidge = [
        { x: -width * 0.05, y: height * 0.67 },
        { x: width * 0.06,  y: height * 0.71 },
        { x: width * 0.15,  y: height * 0.76 },
        { x: width * 0.24,  y: height * 0.82 },
        { x: width * 0.33,  y: height * 0.87 },
        { x: width * 0.44,  y: height * 0.93 },
      ];

      // Subtle pine tree crown serrations along the left foreground ridge crest
      leftForegroundTrees = [];
      for (let i = 0; i < leftForegroundRidge.length - 1; i++) {
        const p1 = leftForegroundRidge[i];
        const p2 = leftForegroundRidge[i + 1];
        const treeSteps = 8;
        for (let j = 0; j < treeSteps; j++) {
          const t = j / treeSteps;
          const px = p1.x + (p2.x - p1.x) * t;
          const py = p1.y + (p2.y - p1.y) * t;
          const treeHeight = 2.5 + (j % 3) * 1.5;
          leftForegroundTrees.push({ x: px, y: py - treeHeight });
          leftForegroundTrees.push({ x: px + 3, y: py });
        }
      }

      // Right Foreground Mountain Ridge (Sloping down from right into central valley)
      rightForegroundRidge = [
        { x: width * 1.05, y: height * 0.68 },
        { x: width * 0.94, y: height * 0.73 },
        { x: width * 0.84, y: height * 0.79 },
        { x: width * 0.73, y: height * 0.85 },
        { x: width * 0.62, y: height * 0.91 },
        { x: width * 0.54, y: height * 0.95 },
      ];

      // Pine tree crown serrations along right ridge
      rightForegroundTrees = [];
      for (let i = 0; i < rightForegroundRidge.length - 1; i++) {
        const p1 = rightForegroundRidge[i];
        const p2 = rightForegroundRidge[i + 1];
        const treeSteps = 8;
        for (let j = 0; j < treeSteps; j++) {
          const t = j / treeSteps;
          const px = p1.x + (p2.x - p1.x) * t;
          const py = p1.y + (p2.y - p1.y) * t;
          const treeHeight = 2.5 + ((j + 1) % 3) * 1.5;
          rightForegroundTrees.push({ x: px, y: py - treeHeight });
          rightForegroundTrees.push({ x: px - 3, y: py });
        }
      }
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      cachedWidth = rect.width;
      cachedHeight = rect.height;

      canvas.width = Math.floor(cachedWidth * cachedDpr);
      canvas.height = Math.floor(cachedHeight * cachedDpr);

      ctx.setTransform(cachedDpr, 0, 0, cachedDpr, 0, 0);

      if (cachedWidth > 0 && cachedHeight > 0) {
        buildHimalayanComposition(cachedWidth, cachedHeight);
        initStreams(cachedWidth, cachedHeight);
        initParticles(cachedWidth, cachedHeight);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);
    handleResize();

    // Helper: Draw filled polygon silhouette extending to bottom of canvas
    const drawFilledPath = (
      points: { x: number; y: number }[],
      fillColor: string,
      strokeColor?: string,
      strokeWidth: number = 1.4
    ) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(cachedWidth, cachedHeight);
      ctx.lineTo(0, cachedHeight);
      ctx.closePath();

      ctx.fillStyle = fillColor;
      ctx.fill();

      if (strokeColor) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }
    };

    // Helper: Draw tiny, understated mountaineering summit flag (Forge bronze/gold)
    const drawSummitFlag = (width: number, height: number, sunGlowFactor: number = 1.0) => {
      const sx = summitPoint.x;
      const sy = summitPoint.y;
      if (sx === 0 || sy === 0) return;

      const poleHeight = Math.max(9, Math.min(13, height * 0.015));
      const flagW = poleHeight * 0.72;
      const flagH = poleHeight * 0.44;

      ctx.save();
      // Thin 1px flag staff
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - poleHeight);
      ctx.strokeStyle = `rgba(135, 110, 58, ${0.85 * sunGlowFactor})`;
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Golden triangular pennant
      ctx.beginPath();
      ctx.moveTo(sx, sy - poleHeight);
      ctx.lineTo(sx + flagW, sy - poleHeight + flagH * 0.5);
      ctx.lineTo(sx, sy - poleHeight + flagH);
      ctx.closePath();
      ctx.fillStyle = '#C5A059'; // Warm Forge bronze/gold
      ctx.fill();
      ctx.restore();
    };

    // Helper: Draw soft atmospheric valley mist ribbon
    const drawValleyMist = (
      yCenter: number,
      heightSpread: number,
      alphaMultiplier: number,
      offset: number = 0
    ) => {
      ctx.save();
      const grad = ctx.createLinearGradient(0, yCenter - heightSpread, 0, yCenter + heightSpread);
      grad.addColorStop(0, 'rgba(240, 237, 230, 0)');
      grad.addColorStop(0.5, `rgba(244, 241, 235, ${0.45 * alphaMultiplier})`);
      grad.addColorStop(1, 'rgba(235, 230, 222, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, yCenter - heightSpread, cachedWidth, heightSpread * 2);

      // Subtle slow drifting mist patch
      const patchX = ((time * 5 + offset) % (cachedWidth * 1.5)) - cachedWidth * 0.25;
      const patchGrad = ctx.createRadialGradient(
        patchX,
        yCenter,
        cachedWidth * 0.05,
        patchX,
        yCenter,
        cachedWidth * 0.45
      );
      patchGrad.addColorStop(0, `rgba(248, 245, 240, ${0.35 * alphaMultiplier})`);
      patchGrad.addColorStop(1, 'rgba(240, 237, 230, 0)');
      ctx.fillStyle = patchGrad;
      ctx.fillRect(0, yCenter - heightSpread, cachedWidth, heightSpread * 2);
      ctx.restore();
    };

    // Helper: Draw billowing midground clouds (soft stratus cloud lobes)
    const drawBillowingClouds = (timeVal: number) => {
      ctx.save();
      for (let i = 0; i < cloudLobes.length; i++) {
        const c = cloudLobes[i];
        // Imperceptible, calm breathing drift
        const dx = Math.sin(timeVal * 0.25 + i * 0.8) * 8;
        const cx = c.x + dx;
        const cy = c.y + Math.cos(timeVal * 0.2 + i) * 3;

        const grad = ctx.createRadialGradient(cx, cy, c.rx * 0.15, cx, cy, c.rx);
        grad.addColorStop(0, `rgba(252, 250, 245, ${c.alpha * 0.88})`);
        grad.addColorStop(0.55, `rgba(245, 242, 235, ${c.alpha * 0.50})`);
        grad.addColorStop(1, 'rgba(238, 233, 222, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, c.rx, c.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // Helper: Draw distant alpine birds (mountain choughs circling in the deep valley)
    const drawDistantBirds = (timeVal: number) => {
      ctx.save();
      ctx.fillStyle = '#423C32';
      ctx.strokeStyle = '#423C32';
      ctx.lineWidth = 1.0;

      for (let i = 0; i < distantBirds.length; i++) {
        const b = distantBirds[i];
        // Slow circling motion in deep valley
        const bx = (b.x * cachedWidth + Math.sin(timeVal * 0.35 + b.phase) * (cachedWidth * 0.04)) % cachedWidth;
        const by = b.y * cachedHeight + Math.cos(timeVal * 0.28 + b.phase) * 10;
        const wingFlap = Math.sin(timeVal * 2.2 + b.phase) * 1.8;

        // Elegant tiny V-silhouette bird
        ctx.beginPath();
        ctx.moveTo(bx - b.wingSpan, by - wingFlap);
        ctx.quadraticCurveTo(bx - b.wingSpan * 0.5, by + 0.5, bx, by);
        ctx.quadraticCurveTo(bx + b.wingSpan * 0.5, by + 0.5, bx + b.wingSpan, by - wingFlap);
        ctx.stroke();
      }
      ctx.restore();
    };

    let isDocumentVisible = document.visibilityState !== 'hidden';
    let isIntersecting = true;

    const handleVisibilityChange = () => {
      isDocumentVisible = document.visibilityState !== 'hidden';
      if (isDocumentVisible && isIntersecting && !prefersReducedMotion) {
        cancelAnimationFrame(animationFrameId);
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        isIntersecting = entry ? entry.isIntersecting : true;
        if (isIntersecting && isDocumentVisible && !prefersReducedMotion) {
          cancelAnimationFrame(animationFrameId);
          lastFrameTime = performance.now();
          animationFrameId = requestAnimationFrame(render);
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(canvas);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      cancelAnimationFrame(animationFrameId);
      if (prefersReducedMotion) {
        renderStatic();
      } else {
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionChange);
    }

    // Static render for reduced motion mode
    const renderStatic = () => {
      const width = cachedWidth;
      const height = cachedHeight;
      if (width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      // 1. Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#ECE7DE');
      skyGrad.addColorStop(0.35, '#F5F2EC');
      skyGrad.addColorStop(0.68, '#E8E3D8');
      skyGrad.addColorStop(1, '#DDD7C8');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Morning Sun Glow on Upper Right
      const sunX = width * 0.77;
      const sunY = height * 0.16;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, width * 0.36);
      sunGlow.addColorStop(0, 'rgba(255, 250, 235, 0.46)');
      sunGlow.addColorStop(0.35, 'rgba(252, 244, 222, 0.24)');
      sunGlow.addColorStop(0.70, 'rgba(245, 236, 212, 0.10)');
      sunGlow.addColorStop(1, 'rgba(235, 228, 215, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, width * 0.36, 0, Math.PI * 2);
      ctx.fill();

      // Soft sun disk
      ctx.beginPath();
      ctx.arc(sunX, sunY, Math.min(width * 0.035, 26), 0, Math.PI * 2);
      ctx.fillStyle = '#FFFDF7';
      ctx.globalAlpha = 0.65;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // 3. Tier 1: Distant Background Spire Range
      drawFilledPath(distantSkyline, '#C7BFB1', 'rgba(152, 144, 130, 0.6)', 1.2);
      for (let i = 0; i < distantPeakFacets.length; i++) {
        const p = distantPeakFacets[i];
        ctx.beginPath();
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let j = 1; j < p.points.length; j++) ctx.lineTo(p.points[j].x, p.points[j].y);
        ctx.closePath();
        ctx.fillStyle = p.fill;
        ctx.fill();
        if (p.stroke) {
          ctx.strokeStyle = p.stroke;
          ctx.lineWidth = p.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // High-altitude atmospheric haze
      drawValleyMist(height * 0.47, height * 0.04, 0.8, 0);

      // 4. Tier 2: Secondary Midground Flanks
      for (let i = 0; i < secondaryMassifs.length; i++) {
        const p = secondaryMassifs[i];
        ctx.beginPath();
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let j = 1; j < p.points.length; j++) ctx.lineTo(p.points[j].x, p.points[j].y);
        ctx.closePath();
        ctx.fillStyle = p.fill;
        ctx.fill();
        if (p.stroke) {
          ctx.strokeStyle = p.stroke;
          ctx.lineWidth = p.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // 5. Tier 3: The Colossal Central Himalayan Mountain
      drawFilledPath(heroBaseSilhouette, '#DDD7CB', 'rgba(169, 120, 53, 0.75)', 1.6);
      for (let i = 0; i < heroFacets.length; i++) {
        const facet = heroFacets[i];
        ctx.beginPath();
        ctx.moveTo(facet.points[0].x, facet.points[0].y);
        for (let j = 1; j < facet.points.length; j++) ctx.lineTo(facet.points[j].x, facet.points[j].y);
        ctx.closePath();
        ctx.fillStyle = facet.fill;
        ctx.fill();
        if (facet.stroke) {
          ctx.strokeStyle = facet.stroke;
          ctx.lineWidth = facet.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // Striated snow couloirs and flutes
      for (let i = 0; i < couloirsAndFlutes.length; i++) {
        const r = couloirsAndFlutes[i];
        ctx.beginPath();
        ctx.moveTo(r.from.x, r.from.y);
        ctx.lineTo(r.to.x, r.to.y);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width;
        ctx.stroke();
      }

      // Central Arête knife-edge highlight
      if (spineRidgeLine.length > 1) {
        ctx.beginPath();
        ctx.moveTo(spineRidgeLine[0].x, spineRidgeLine[0].y);
        for (let i = 1; i < spineRidgeLine.length; i++) {
          ctx.lineTo(spineRidgeLine[i].x, spineRidgeLine[i].y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.90)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // Summit Flag
      drawSummitFlag(width, height, 1.0);

      // 6. Tier 4: Layered Midground Clouds & Valley Fog
      drawBillowingClouds(0);
      drawValleyMist(height * 0.72, height * 0.05, 0.85, 0);

      // 7. Tier 5: Dark Foreground Framing Mountain Ridges
      // Left Ridge
      ctx.beginPath();
      ctx.moveTo(leftForegroundRidge[0].x, leftForegroundRidge[0].y);
      for (let i = 1; i < leftForegroundRidge.length; i++) {
        ctx.lineTo(leftForegroundRidge[i].x, leftForegroundRidge[i].y);
      }
      ctx.lineTo(width * 0.44, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = '#26231C';
      ctx.fill();
      ctx.strokeStyle = 'rgba(155, 135, 95, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Left Ridge Pine crowns
      ctx.beginPath();
      for (let i = 0; i < leftForegroundTrees.length; i++) {
        const t = leftForegroundTrees[i];
        if (i === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
      }
      ctx.strokeStyle = '#1F1C16';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Right Ridge
      ctx.beginPath();
      ctx.moveTo(rightForegroundRidge[0].x, rightForegroundRidge[0].y);
      for (let i = 1; i < rightForegroundRidge.length; i++) {
        ctx.lineTo(rightForegroundRidge[i].x, rightForegroundRidge[i].y);
      }
      ctx.lineTo(width * 0.54, height);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = '#221F18';
      ctx.fill();
      ctx.strokeStyle = 'rgba(145, 125, 88, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Right Ridge Pine crowns
      ctx.beginPath();
      for (let i = 0; i < rightForegroundTrees.length; i++) {
        const t = rightForegroundTrees[i];
        if (i === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
      }
      ctx.strokeStyle = '#1B1812';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Distant soaring birds
      drawDistantBirds(0);

      // Static particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(169, 120, 53, 0.22)';
        ctx.fill();
      });
    };

    // Main animation render loop (subtle, calm, cinematic alpine atmosphere)
    const render = (now: number = performance.now()) => {
      if (!isDocumentVisible || !isIntersecting) return;

      if (prefersReducedMotion) {
        renderStatic();
        return;
      }

      if (!lastFrameTime) lastFrameTime = now;
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      time += dt;

      const width = cachedWidth;
      const height = cachedHeight;
      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. High-Altitude Serene Himalayan Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#ECE7DE');
      skyGrad.addColorStop(0.35, '#F5F2EC');
      skyGrad.addColorStop(0.68, '#E8E3D8');
      skyGrad.addColorStop(1, '#DDD7C8');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Morning Sun Glow on Upper Right (Calm, gentle breathing)
      const sunX = width * 0.77;
      const sunY = height * 0.16;
      const sunBreath = 0.96 + 0.04 * Math.sin(time * 0.45);
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, width * 0.36);
      sunGlow.addColorStop(0, `rgba(255, 250, 235, ${0.48 * sunBreath})`);
      sunGlow.addColorStop(0.35, `rgba(252, 244, 222, ${0.25 * sunBreath})`);
      sunGlow.addColorStop(0.70, `rgba(245, 236, 212, ${0.10 * sunBreath})`);
      sunGlow.addColorStop(1, 'rgba(235, 228, 215, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, width * 0.36, 0, Math.PI * 2);
      ctx.fill();

      // Soft sun disk
      ctx.beginPath();
      ctx.arc(sunX, sunY, Math.min(width * 0.035, 26), 0, Math.PI * 2);
      ctx.fillStyle = '#FFFDF7';
      ctx.globalAlpha = 0.65 * sunBreath;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // 3. TIER 1: Distant Background Spire Range (Far Himalayan Horizon)
      drawFilledPath(distantSkyline, '#C7BFB1', 'rgba(152, 144, 130, 0.6)', 1.2);
      for (let i = 0; i < distantPeakFacets.length; i++) {
        const p = distantPeakFacets[i];
        ctx.beginPath();
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let j = 1; j < p.points.length; j++) ctx.lineTo(p.points[j].x, p.points[j].y);
        ctx.closePath();
        ctx.fillStyle = p.fill;
        ctx.fill();
        if (p.stroke) {
          ctx.strokeStyle = p.stroke;
          ctx.lineWidth = p.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // High-altitude atmospheric haze separating distant spires and midground
      drawValleyMist(height * 0.47, height * 0.04, 0.8, 120);

      // 4. TIER 2: Secondary Midground Flanking Massifs
      for (let i = 0; i < secondaryMassifs.length; i++) {
        const p = secondaryMassifs[i];
        ctx.beginPath();
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let j = 1; j < p.points.length; j++) ctx.lineTo(p.points[j].x, p.points[j].y);
        ctx.closePath();
        ctx.fillStyle = p.fill;
        ctx.fill();
        if (p.stroke) {
          ctx.strokeStyle = p.stroke;
          ctx.lineWidth = p.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // 5. TIER 3: The Colossal Central Himalayan Mountain (Dominant Peak)
      drawFilledPath(heroBaseSilhouette, '#DDD7CB', 'rgba(169, 120, 53, 0.75)', 1.6);
      for (let i = 0; i < heroFacets.length; i++) {
        const facet = heroFacets[i];
        ctx.beginPath();
        ctx.moveTo(facet.points[0].x, facet.points[0].y);
        for (let j = 1; j < facet.points.length; j++) ctx.lineTo(facet.points[j].x, facet.points[j].y);
        ctx.closePath();
        ctx.fillStyle = facet.fill;
        ctx.fill();
        if (facet.stroke) {
          ctx.strokeStyle = facet.stroke;
          ctx.lineWidth = facet.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // Striated snow couloirs and flutes
      for (let i = 0; i < couloirsAndFlutes.length; i++) {
        const r = couloirsAndFlutes[i];
        ctx.beginPath();
        ctx.moveTo(r.from.x, r.from.y);
        ctx.lineTo(r.to.x, r.to.y);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width;
        ctx.stroke();
      }

      // Central Arête knife-edge spine line
      if (spineRidgeLine.length > 1) {
        ctx.beginPath();
        ctx.moveTo(spineRidgeLine[0].x, spineRidgeLine[0].y);
        for (let i = 1; i < spineRidgeLine.length; i++) {
          ctx.lineTo(spineRidgeLine[i].x, spineRidgeLine[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.88 * sunBreath})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // Tiny Understated Mountaineering Summit Flag
      drawSummitFlag(width, height, sunBreath);

      // 6. TIER 4: Layered Midground Clouds & Valley Fog (Billowing across mountain base)
      drawBillowingClouds(time);
      drawValleyMist(height * 0.72, height * 0.05, 0.85, 300);

      // 7. TIER 5: Deep V-Valley & Framing Dark Foreground Mountain Ridges
      // Left Foreground Ridge
      ctx.beginPath();
      ctx.moveTo(leftForegroundRidge[0].x, leftForegroundRidge[0].y);
      for (let i = 1; i < leftForegroundRidge.length; i++) {
        ctx.lineTo(leftForegroundRidge[i].x, leftForegroundRidge[i].y);
      }
      ctx.lineTo(width * 0.44, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = '#26231C';
      ctx.fill();
      ctx.strokeStyle = 'rgba(155, 135, 95, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Left Ridge Pine silhouettes
      ctx.beginPath();
      for (let i = 0; i < leftForegroundTrees.length; i++) {
        const t = leftForegroundTrees[i];
        if (i === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
      }
      ctx.strokeStyle = '#1F1C16';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Right Foreground Ridge
      ctx.beginPath();
      ctx.moveTo(rightForegroundRidge[0].x, rightForegroundRidge[0].y);
      for (let i = 1; i < rightForegroundRidge.length; i++) {
        ctx.lineTo(rightForegroundRidge[i].x, rightForegroundRidge[i].y);
      }
      ctx.lineTo(width * 0.54, height);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = '#221F18';
      ctx.fill();
      ctx.strokeStyle = 'rgba(145, 125, 88, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Right Ridge Pine silhouettes
      ctx.beginPath();
      for (let i = 0; i < rightForegroundTrees.length; i++) {
        const t = rightForegroundTrees[i];
        if (i === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
      }
      ctx.strokeStyle = '#1B1812';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Distant soaring birds gliding over the misty valley
      drawDistantBirds(time);

      // 8. Animated Wind Streams flowing gracefully across lower mountain passes
      for (let i = 0; i < windStreams.length; i++) {
        const stream = windStreams[i];
        const currentPhase = stream.phase + time * stream.speed;

        const cycleProgress = (time * stream.speed * 32 + i * 140) % (width + stream.length);
        const startX = cycleProgress - stream.length;
        const endX = startX + stream.length;

        if (endX < 0 || startX > width) continue;

        ctx.beginPath();
        let first = true;
        const step = 22;

        for (let x = Math.max(0, startX); x <= Math.min(width, endX); x += step) {
          const relPos = (x - startX) / stream.length;
          const envelope = Math.sin(relPos * Math.PI);
          const y = stream.y + Math.sin(x * stream.frequency + currentPhase) * stream.amplitude * envelope;

          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = stream.color;
        ctx.lineWidth = stream.strokeWidth;
        ctx.stroke();
      }

      // 9. Ambient Micro-Particles (Warm Bronze & Olive Dust Glints)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy + Math.sin(time * 1.2 + p.phase) * 0.14;
        p.phase += dt * 0.35;

        // Wrap around within the lower atmospheric band
        if (p.x > width + 10) {
          p.x = -10;
          p.y = height * 0.54 + Math.random() * (height * 0.42);
        }

        const alpha = Math.max(0, Math.sin(time * 0.8 + p.phase)) * (p.maxAlpha * 1.1);
        if (alpha <= 0.01) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? `rgba(169, 120, 53, ${alpha})` : `rgba(102, 112, 85, ${alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    if (prefersReducedMotion) {
      renderStatic();
    } else {
      lastFrameTime = performance.now();
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMotionChange);
      }
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  );
};

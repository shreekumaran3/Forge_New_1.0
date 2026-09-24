import React, { useEffect, useRef } from 'react';

interface ForgeNightMountainCanvasProps {
  className?: string;
}

interface PolygonFacet {
  points: { x: number; y: number }[];
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

interface Couloir {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width: number;
}

interface NightParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  phase: number;
}

export const ForgeNightMountainCanvas: React.FC<ForgeNightMountainCanvasProps> = ({ className = '' }) => {
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

    // Alpine structures for Matterhorn hero peak (precomputed on resize)
    let backgroundAlpineRidge: { x: number; y: number }[] = [];
    let secondaryMassifs: PolygonFacet[] = [];
    let heroMatterhornSilhouette: { x: number; y: number }[] = [];
    let heroFacets: PolygonFacet[] = [];
    let frostCouloirs: Couloir[] = [];
    let foregroundBasaltRidge: { x: number; y: number }[] = [];
    let summitPoint = { x: 0, y: 0 };

    // Small count of subtle gold/bronze floating particles (strictly 12)
    const particles: NightParticle[] = [];
    const particleCount = 12;
    const particleColors = [
      '#d4af37', // metallic gold
      '#a97835', // warm bronze
      '#c5a059', // brass
      '#8c733e', // deep bronze
    ];

    const initParticles = (width: number, height: number) => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: height * 0.52 + Math.random() * (height * 0.44),
          vx: (Math.random() - 0.48) * 0.22,
          vy: -(0.2 + Math.random() * 0.38),
          size: 0.9 + Math.random() * 1.3,
          alpha: 0,
          maxAlpha: 0.16 + Math.random() * 0.22,
          color: particleColors[i % particleColors.length],
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    // Build the monumental Matterhorn-inspired hero mountain environment
    const buildMatterhornComposition = (width: number, height: number) => {
      // Scale: The dominant Matterhorn horn rises dramatically, summit reaching ~26-30% from top of viewport,
      // creating an imposing, monumental presence occupying the lower 70-74% of the screen.
      const isNarrow = width < 640;
      const summitX = width * 0.49;
      const summitY = height * (isNarrow ? 0.29 : 0.26);
      summitPoint = { x: summitX, y: summitY };

      // 1. TIER 1: Distant High Pennine Alpine Spire Range far behind
      backgroundAlpineRidge = [
        { x: 0, y: height * 0.54 },
        { x: width * 0.08, y: height * 0.46 },
        { x: width * 0.16, y: height * 0.50 },
        { x: width * 0.25, y: height * 0.44 },
        { x: width * 0.35, y: height * 0.48 },
        { x: width * 0.44, y: height * 0.42 },
        { x: width * 0.54, y: height * 0.46 },
        { x: width * 0.63, y: height * 0.41 },
        { x: width * 0.74, y: height * 0.47 },
        { x: width * 0.84, y: height * 0.43 },
        { x: width * 0.93, y: height * 0.49 },
        { x: width, y: height * 0.52 },
      ];

      // 2. TIER 2: Secondary Alpine Massifs framing the dominant Horn
      secondaryMassifs = [];

      // Left Flanking Massif (Dent Blanche / Obergabelhorn)
      const leftApex = { x: width * 0.16, y: height * 0.38 };
      const leftCol  = { x: width * 0.32, y: height * 0.52 };
      secondaryMassifs.push({
        points: [
          { x: -width * 0.05, y: height * 0.68 },
          { x: width * 0.04, y: height * 0.50 },
          leftApex,
          leftCol,
          { x: width * 0.25, y: height * 0.76 },
          { x: -width * 0.05, y: height * 0.82 },
        ],
        fill: '#10121A', // Deep obsidian shadow
        stroke: 'rgba(44, 50, 68, 0.7)',
        strokeWidth: 1.2,
      });
      // Left moonlit snow face
      secondaryMassifs.push({
        points: [
          leftApex,
          { x: width * 0.20, y: height * 0.45 },
          leftCol,
          { x: width * 0.17, y: height * 0.54 },
        ],
        fill: 'rgba(215, 222, 235, 0.16)', // Ambient snow glow
      });
      // Left dark rock facet
      secondaryMassifs.push({
        points: [
          { x: width * 0.04, y: height * 0.50 },
          leftApex,
          { x: width * 0.17, y: height * 0.54 },
          { x: width * 0.07, y: height * 0.64 },
        ],
        fill: '#090A0E',
      });

      // Right Flanking Massif (Dent d'Hérens / Breithorn)
      const rightApex = { x: width * 0.84, y: height * 0.37 };
      const rightCol  = { x: width * 0.66, y: height * 0.51 };
      secondaryMassifs.push({
        points: [
          rightCol,
          rightApex,
          { x: width * 0.95, y: height * 0.48 },
          { x: width * 1.08, y: height * 0.64 },
          { x: width * 0.76, y: height * 0.78 },
        ],
        fill: '#131622',
        stroke: 'rgba(48, 54, 74, 0.7)',
        strokeWidth: 1.2,
      });
      // Right moonlit snow ramp (catching direct light from moon on upper right)
      secondaryMassifs.push({
        points: [
          rightApex,
          { x: width * 0.95, y: height * 0.48 },
          { x: width * 0.88, y: height * 0.58 },
          { x: width * 0.82, y: height * 0.48 },
        ],
        fill: 'rgba(225, 218, 200, 0.24)', // Golden moonlit snow ramp
      });
      // Right basalt shadow face
      secondaryMassifs.push({
        points: [
          rightCol,
          rightApex,
          { x: width * 0.82, y: height * 0.48 },
          { x: width * 0.74, y: height * 0.64 },
        ],
        fill: '#0C0D13',
      });

      // 3. TIER 3: The Dominant Matterhorn Hero Pyramid
      // Morphological Arêtes: Zmutt Ridge (West/North), Furggen Ridge (East/South), Hörnli Ridge (Central Arête)
      const zmuttStep1 = { x: width * 0.450, y: height * 0.320 };
      const zmuttStep2 = { x: width * 0.395, y: height * 0.390 };
      const zmuttStep3 = { x: width * 0.320, y: height * 0.480 };
      const zmuttStep4 = { x: width * 0.220, y: height * 0.600 };
      const zmuttBase1 = { x: width * 0.100, y: height * 0.730 };
      const zmuttBase2 = { x: -width * 0.05, y: height * 0.860 };

      const furggenStep1 = { x: width * 0.530, y: height * 0.315 };
      const furggenStep2 = { x: width * 0.580, y: height * 0.370 };
      const furggenStep3 = { x: width * 0.660, y: height * 0.440 };
      const furggenStep4 = { x: width * 0.750, y: height * 0.550 };
      const furggenBase1 = { x: width * 0.870, y: height * 0.680 };
      const furggenBase2 = { x: width * 1.05,  y: height * 0.840 };

      heroMatterhornSilhouette = [
        { x: -width * 0.1, y: height * 0.95 },
        zmuttBase2,
        zmuttBase1,
        zmuttStep4,
        zmuttStep3,
        zmuttStep2,
        zmuttStep1,
        { x: summitX, y: summitY },
        furggenStep1,
        furggenStep2,
        furggenStep3,
        furggenStep4,
        furggenBase1,
        furggenBase2,
        { x: width * 1.1, y: height * 0.95 },
      ];

      // Razor-sharp Central Hörnli Arête stepping points
      const hornliStep1 = { x: width * 0.485, y: height * 0.345 };
      const hornliStep2 = { x: width * 0.478, y: height * 0.435 };
      const hornliStep3 = { x: width * 0.468, y: height * 0.540 };
      const hornliStep4 = { x: width * 0.458, y: height * 0.660 };
      const hornliBase  = { x: width * 0.450, y: height * 0.810 };

      heroFacets = [];
      frostCouloirs = [];

      // A. SUMMIT PYRAMID CAP (Apex needle)
      heroFacets.push({
        points: [
          { x: summitX, y: summitY },
          furggenStep1,
          hornliStep1,
          zmuttStep1,
        ],
        fill: '#08090C',
        stroke: 'rgba(212, 175, 55, 0.6)',
        strokeWidth: 1.2,
      });

      // B. EAST WALL / FURGGEN FACE (Moonlit Basalt & Amber/Gold Highlights - Right Side)
      // Upper East Face
      heroFacets.push({
        points: [
          furggenStep1,
          furggenStep2,
          { x: width * 0.535, y: height * 0.410 },
          hornliStep1,
        ],
        fill: '#1D2130', // Deep moonlit basalt
        stroke: 'rgba(55, 62, 85, 0.6)',
        strokeWidth: 0.9,
      });

      heroFacets.push({
        points: [
          hornliStep1,
          { x: width * 0.535, y: height * 0.410 },
          hornliStep2,
        ],
        fill: '#181C28',
      });

      // Mid East Rock Cleavage Face
      heroFacets.push({
        points: [
          furggenStep2,
          furggenStep3,
          { x: width * 0.585, y: height * 0.490 },
          hornliStep2,
        ],
        fill: '#151824',
        stroke: 'rgba(48, 54, 76, 0.5)',
        strokeWidth: 0.8,
      });

      heroFacets.push({
        points: [
          hornliStep2,
          { x: width * 0.585, y: height * 0.490 },
          hornliStep3,
        ],
        fill: '#1A1E2C',
      });

      // Lower East Glacier Cirque & Rock Ribs
      heroFacets.push({
        points: [
          furggenStep3,
          furggenStep4,
          { x: width * 0.620, y: height * 0.610 },
          hornliStep3,
        ],
        fill: '#121520',
      });

      heroFacets.push({
        points: [
          hornliStep3,
          { x: width * 0.620, y: height * 0.610 },
          hornliStep4,
        ],
        fill: '#161926',
      });

      heroFacets.push({
        points: [
          furggenStep4,
          furggenBase1,
          { x: width * 0.680, y: height * 0.740 },
          hornliStep4,
        ],
        fill: '#0E1018',
      });

      heroFacets.push({
        points: [
          hornliStep4,
          { x: width * 0.680, y: height * 0.740 },
          furggenBase1,
          furggenBase2,
          hornliBase,
        ],
        fill: '#0B0D14',
      });

      // C. NORTH WALL / ZMUTT FACE (Deepest Obsidian Shadow & Clinging Ice Couloirs - Left Side)
      // Upper North Precipice
      heroFacets.push({
        points: [
          zmuttStep1,
          hornliStep1,
          hornliStep2,
          zmuttStep2,
        ],
        fill: '#090A0E',
        stroke: 'rgba(35, 40, 56, 0.6)',
        strokeWidth: 0.9,
      });

      // Upper North Hanging Ice Shelf
      heroFacets.push({
        points: [
          zmuttStep2,
          hornliStep2,
          { x: width * 0.430, y: height * 0.470 },
          { x: width * 0.355, y: height * 0.450 },
        ],
        fill: '#0D0F16',
      });

      // Mid North Face Basalt Cleavage
      heroFacets.push({
        points: [
          { x: width * 0.355, y: height * 0.450 },
          { x: width * 0.430, y: height * 0.470 },
          hornliStep3,
          zmuttStep3,
        ],
        fill: '#07080B',
      });

      // Lower North Couloir & Scree Ramp
      heroFacets.push({
        points: [
          zmuttStep3,
          hornliStep3,
          hornliStep4,
          { x: width * 0.370, y: height * 0.590 },
        ],
        fill: '#0A0B10',
      });

      heroFacets.push({
        points: [
          zmuttStep3,
          { x: width * 0.370, y: height * 0.590 },
          hornliStep4,
          zmuttStep4,
        ],
        fill: '#060709',
      });

      heroFacets.push({
        points: [
          zmuttStep4,
          hornliStep4,
          hornliBase,
          zmuttBase1,
        ],
        fill: '#08090C',
      });

      heroFacets.push({
        points: [
          zmuttBase1,
          hornliBase,
          { x: width * 0.280, y: height * 0.880 },
          zmuttBase2,
        ],
        fill: '#050608',
      });

      // Frost Couloirs & Moonlight Rim Streaks
      frostCouloirs = [
        // East face moonlit frost ridges (amber & ivory)
        {
          from: { x: width * 0.515, y: height * 0.360 },
          to: { x: width * 0.550, y: height * 0.430 },
          color: 'rgba(212, 175, 55, 0.45)', // gold frost edge
          width: 1.3,
        },
        {
          from: { x: width * 0.555, y: height * 0.450 },
          to: { x: width * 0.630, y: height * 0.540 },
          color: 'rgba(225, 218, 200, 0.40)', // ivory moonlight snow
          width: 1.5,
        },
        {
          from: { x: width * 0.600, y: height * 0.560 },
          to: { x: width * 0.700, y: height * 0.670 },
          color: 'rgba(212, 175, 55, 0.35)',
          width: 1.6,
        },
        // North face clinging ice couloirs (pale blue-ice)
        {
          from: { x: width * 0.435, y: height * 0.370 },
          to: { x: width * 0.405, y: height * 0.440 },
          color: 'rgba(200, 215, 235, 0.35)',
          width: 1.2,
        },
        {
          from: { x: width * 0.415, y: height * 0.510 },
          to: { x: width * 0.345, y: height * 0.600 },
          color: 'rgba(180, 195, 220, 0.28)',
          width: 1.3,
        },
        {
          from: { x: width * 0.380, y: height * 0.640 },
          to: { x: width * 0.290, y: height * 0.750 },
          color: 'rgba(160, 175, 200, 0.22)',
          width: 1.4,
        },
      ];

      // 4. TIER 4: Foreground Basalt Foothills (Grounding bottom ~16% of screen)
      foregroundBasaltRidge = [
        { x: 0, y: height * 0.93 },
        { x: width * 0.12, y: height * 0.88 },
        { x: width * 0.26, y: height * 0.91 },
        { x: width * 0.44, y: height * 0.86 },
        { x: width * 0.60, y: height * 0.90 },
        { x: width * 0.76, y: height * 0.85 },
        { x: width * 0.90, y: height * 0.89 },
        { x: width, y: height * 0.92 },
      ];
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      cachedWidth = rect.width;
      cachedHeight = rect.height;

      canvas.width = Math.floor(cachedWidth * cachedDpr);
      canvas.height = Math.floor(cachedHeight * cachedDpr);

      ctx.setTransform(cachedDpr, 0, 0, cachedDpr, 0, 0);

      if (cachedWidth > 0 && cachedHeight > 0) {
        buildMatterhornComposition(cachedWidth, cachedHeight);
        initParticles(cachedWidth, cachedHeight);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);
    handleResize();

    // Draw filled polygon silhouette
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

    // Draw the tiny climber's summit flag with subtle golden moonlit glow
    const drawSummitFlag = (width: number, height: number, moonBreath: number) => {
      const sx = summitPoint.x;
      const sy = summitPoint.y;
      if (sx === 0 || sy === 0) return;

      const poleHeight = Math.max(10, Math.min(15, height * 0.016));
      const flagW = poleHeight * 0.75;
      const flagH = poleHeight * 0.45;

      ctx.save();
      // Subtle gold halo around the peak
      const flagGlow = ctx.createRadialGradient(sx, sy - poleHeight * 0.7, 1, sx, sy - poleHeight * 0.7, 16);
      flagGlow.addColorStop(0, `rgba(212, 175, 55, ${0.35 * moonBreath})`);
      flagGlow.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = flagGlow;
      ctx.beginPath();
      ctx.arc(sx, sy - poleHeight * 0.7, 16, 0, Math.PI * 2);
      ctx.fill();

      // Delicate 1px pole
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - poleHeight);
      ctx.strokeStyle = `rgba(212, 175, 55, ${0.9 * moonBreath})`;
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Tiny golden pennant
      ctx.beginPath();
      ctx.moveTo(sx, sy - poleHeight);
      ctx.lineTo(sx + flagW, sy - poleHeight + flagH * 0.5);
      ctx.lineTo(sx, sy - poleHeight + flagH);
      ctx.closePath();
      ctx.fillStyle = '#C5A059'; // Warm Forge bronze/gold
      ctx.fill();
      ctx.restore();
    };

    // Draw atmospheric nocturnal haze / valley mist
    const drawAtmosphericHaze = (
      yCenter: number,
      heightSpread: number,
      driftOffset: number,
      alphaMultiplier: number
    ) => {
      ctx.save();
      const grad = ctx.createLinearGradient(0, yCenter - heightSpread, 0, yCenter + heightSpread);
      grad.addColorStop(0, 'rgba(10, 11, 16, 0)');
      grad.addColorStop(0.5, `rgba(28, 32, 46, ${0.35 * alphaMultiplier})`);
      grad.addColorStop(1, 'rgba(10, 11, 16, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, yCenter - heightSpread, cachedWidth, heightSpread * 2);

      // Subtle drifting mist patch catching moonlight
      const patchX = ((time * 4 + driftOffset) % (cachedWidth * 1.5)) - cachedWidth * 0.25;
      const patchGrad = ctx.createRadialGradient(
        patchX,
        yCenter,
        cachedWidth * 0.06,
        patchX,
        yCenter,
        cachedWidth * 0.40
      );
      patchGrad.addColorStop(0, `rgba(38, 44, 62, ${0.24 * alphaMultiplier})`);
      patchGrad.addColorStop(1, 'rgba(10, 11, 16, 0)');
      ctx.fillStyle = patchGrad;
      ctx.fillRect(0, yCenter - heightSpread, cachedWidth, heightSpread * 2);
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

    // Static render for reduced-motion mode
    const renderStatic = () => {
      const width = cachedWidth;
      const height = cachedHeight;
      if (width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#07080A');
      skyGrad.addColorStop(0.35, '#0A0C12');
      skyGrad.addColorStop(0.70, '#0E1119');
      skyGrad.addColorStop(1, '#060709');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Moon on upper right
      const moonX = width * 0.78;
      const moonY = height * 0.18;
      const moonRadius = Math.min(width * 0.035, 26);

      const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, moonRadius * 4.6);
      moonGlow.addColorStop(0, 'rgba(212, 175, 55, 0.22)');
      moonGlow.addColorStop(0.4, 'rgba(169, 120, 53, 0.09)');
      moonGlow.addColorStop(1, 'rgba(8, 9, 12, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius * 4.6, 0, Math.PI * 2);
      ctx.fill();

      // Moon disc
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#C5A059';
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Tier 1: Distant Pennine Alps
      drawFilledPath(backgroundAlpineRidge, '#10121A', '#242A3A', 1.2);

      // Tier 2: Secondary massifs
      for (let i = 0; i < secondaryMassifs.length; i++) {
        const m = secondaryMassifs[i];
        ctx.beginPath();
        ctx.moveTo(m.points[0].x, m.points[0].y);
        for (let j = 1; j < m.points.length; j++) {
          ctx.lineTo(m.points[j].x, m.points[j].y);
        }
        ctx.closePath();
        ctx.fillStyle = m.fill;
        ctx.fill();
        if (m.stroke) {
          ctx.strokeStyle = m.stroke;
          ctx.lineWidth = m.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // Tier 3: Hero Matterhorn Silhouette
      drawFilledPath(heroMatterhornSilhouette, '#090A0E', '#2A2E3D', 1.5);

      // Hero Facets
      for (let i = 0; i < heroFacets.length; i++) {
        const facet = heroFacets[i];
        ctx.beginPath();
        ctx.moveTo(facet.points[0].x, facet.points[0].y);
        for (let j = 1; j < facet.points.length; j++) {
          ctx.lineTo(facet.points[j].x, facet.points[j].y);
        }
        ctx.closePath();
        ctx.fillStyle = facet.fill;
        ctx.fill();
        if (facet.stroke) {
          ctx.strokeStyle = facet.stroke;
          ctx.lineWidth = facet.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // Hörnli Arête rim highlight
      ctx.beginPath();
      ctx.moveTo(summitPoint.x, summitPoint.y);
      ctx.lineTo(width * 0.485, height * 0.345);
      ctx.lineTo(width * 0.478, height * 0.435);
      ctx.lineTo(width * 0.468, height * 0.540);
      ctx.lineTo(width * 0.458, height * 0.660);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Frost couloirs
      frostCouloirs.forEach((c) => {
        ctx.beginPath();
        ctx.moveTo(c.from.x, c.from.y);
        ctx.lineTo(c.to.x, c.to.y);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = c.width;
        ctx.stroke();
      });

      // Summit flag
      drawSummitFlag(width, height, 1.0);

      // Tier 4: Foreground Basalt Crags
      drawFilledPath(foregroundBasaltRidge, '#050608', 'rgba(228, 227, 224, 0.10)', 1.6);

      // Static particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.maxAlpha * 0.6;
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    };

    // Main animation render loop
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

      // 1. Deep Basalt Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#07080A');
      skyGrad.addColorStop(0.35, '#0A0C12');
      skyGrad.addColorStop(0.70, '#0E1119');
      skyGrad.addColorStop(1, '#060709');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Muted-Gold Moon on Upper Right
      const moonX = width * 0.78;
      const moonY = height * 0.18;
      const moonRadius = Math.min(width * 0.035, 26);
      const moonBreath = 0.96 + 0.04 * Math.sin(time * 0.55);

      // Soft lunar corona
      const moonGlow = ctx.createRadialGradient(
        moonX,
        moonY,
        moonRadius * 0.4,
        moonX,
        moonY,
        moonRadius * 4.8
      );
      moonGlow.addColorStop(0, `rgba(212, 175, 55, ${0.20 * moonBreath})`);
      moonGlow.addColorStop(0.35, `rgba(169, 120, 53, ${0.08 * moonBreath})`);
      moonGlow.addColorStop(0.70, `rgba(32, 36, 48, ${0.04 * moonBreath})`);
      moonGlow.addColorStop(1, 'rgba(7, 8, 10, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius * 4.8, 0, Math.PI * 2);
      ctx.fill();

      // Stylized muted-gold moon disc
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#C5A059';
      ctx.globalAlpha = 0.55 * moonBreath;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // 3. TIER 1: Distant Alpine Range (Pennine Alps Backdrop)
      drawFilledPath(backgroundAlpineRidge, '#10121A', '#242A3A', 1.2);

      // Subtle atmospheric haze between background range and massifs
      const hazePulse = 0.9 + 0.1 * Math.sin(time * 0.45);
      drawAtmosphericHaze(height * 0.46, height * 0.04, 80, hazePulse);

      // 4. TIER 2: Secondary Alpine Massifs (Dent Blanche & Dent d'Hérens)
      for (let i = 0; i < secondaryMassifs.length; i++) {
        const m = secondaryMassifs[i];
        ctx.beginPath();
        ctx.moveTo(m.points[0].x, m.points[0].y);
        for (let j = 1; j < m.points.length; j++) {
          ctx.lineTo(m.points[j].x, m.points[j].y);
        }
        ctx.closePath();
        ctx.fillStyle = m.fill;
        ctx.fill();
        if (m.stroke) {
          ctx.strokeStyle = m.stroke;
          ctx.lineWidth = m.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // Mid-altitude nocturnal haze behind Matterhorn
      drawAtmosphericHaze(height * 0.54, height * 0.05, 200, hazePulse * 0.9);

      // 5. TIER 3: Dominant Matterhorn Hero Silhouette Base
      drawFilledPath(heroMatterhornSilhouette, '#090A0E', '#2A2E3D', 1.5);

      // Render individual faceted rock faces and cleavage planes
      for (let i = 0; i < heroFacets.length; i++) {
        const facet = heroFacets[i];
        ctx.beginPath();
        ctx.moveTo(facet.points[0].x, facet.points[0].y);
        for (let j = 1; j < facet.points.length; j++) {
          ctx.lineTo(facet.points[j].x, facet.points[j].y);
        }
        ctx.closePath();
        ctx.fillStyle = facet.fill;
        ctx.fill();
        if (facet.stroke) {
          ctx.strokeStyle = facet.stroke;
          ctx.lineWidth = facet.strokeWidth || 1.0;
          ctx.stroke();
        }
      }

      // Razor-Sharp Central Hörnli Arête (High-contrast moonlit rim line)
      ctx.beginPath();
      ctx.moveTo(summitPoint.x, summitPoint.y);
      ctx.lineTo(width * 0.485, height * 0.345);
      ctx.lineTo(width * 0.478, height * 0.435);
      ctx.lineTo(width * 0.468, height * 0.540);
      ctx.lineTo(width * 0.458, height * 0.660);
      ctx.strokeStyle = `rgba(212, 175, 55, ${0.58 * moonBreath})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Frost couloirs and clinging snow shelves catching moonlight
      for (let i = 0; i < frostCouloirs.length; i++) {
        const c = frostCouloirs[i];
        ctx.beginPath();
        ctx.moveTo(c.from.x, c.from.y);
        ctx.lineTo(c.to.x, c.to.y);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = c.width;
        ctx.stroke();
      }

      // Tiny Understated Climber's Summit Flag
      drawSummitFlag(width, height, moonBreath);

      // Alpine valley nocturnal mist pooling in the cirques
      drawAtmosphericHaze(height * 0.74, height * 0.05, 340, hazePulse * 0.85);

      // 6. TIER 4: Foreground Basalt Foothills (Deepest Obsidian Base)
      drawFilledPath(foregroundBasaltRidge, '#050608', 'rgba(228, 227, 224, 0.10)', 1.6);

      // 7. Subtle Gold/Bronze Micro-Particles (Occasional tiny drifting specks, strictly 12)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(time * 0.8 + p.phase) * 0.15;
        p.phase += dt * 0.4;

        // Reset if drifted too high or offscreen
        if (p.y < height * 0.40 || p.x < 0 || p.x > width) {
          p.x = Math.random() * width;
          p.y = height * 0.95 + Math.random() * (height * 0.05);
          p.alpha = 0;
        }

        // Fade in at bottom, stay subtle, fade out near upper ridge
        const progress = (height - p.y) / (height * 0.55);
        let alpha = p.maxAlpha;
        if (progress < 0.2) {
          alpha = (progress / 0.2) * p.maxAlpha;
        } else if (progress > 0.7) {
          alpha = (1 - (progress - 0.7) / 0.3) * p.maxAlpha;
        }

        if (alpha <= 0.01) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

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

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, ArrowRight, Shield, Mountain, Sun, Moon } from 'lucide-react';
import { ForgeNightMountainCanvas } from '../effects/ForgeNightMountainCanvas';
import { ForgeMountainWindCanvas } from '../effects/ForgeMountainWindCanvas';
import { PlayerProfile } from '../../types';
import { playUISound } from '../../services/soundManager';
import { useTheme } from '../../theme/ThemeContext';

interface IntroScreenProps {
  onStart: () => void;
  hasProfile: boolean;
  player?: PlayerProfile | null;
  isLoading?: boolean;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({
  onStart,
  hasProfile,
  player,
  isLoading = false,
}) => {
  const { currentMode, setThemeMode } = useTheme();
  const [stage, setStage] = useState<'dark' | 'glow' | 'ignited'>('dark');
  const isLight = currentMode === 'light';

  // Cinematic entry sequence (0.0 to 2.5 seconds)
  useEffect(() => {
    const timer1 = setTimeout(() => setStage('glow'), 350);
    const timer2 = setTimeout(() => setStage('ignited'), 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Compute initials for profile picture fallback
  const getInitials = (name?: string) => {
    if (!name) return 'F';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isReturningUser = Boolean(!isLoading && hasProfile && player && player.name);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center select-none overflow-hidden font-sans transition-colors duration-500 ${
        isLight
          ? 'bg-[#E8E5DE] text-[#202522] bg-[radial-gradient(circle_at_2px_2px,rgba(32,37,34,0.06)_1px,transparent_0)] bg-[size:40px_40px]'
          : 'bg-[#0C0C0E] text-[#E4E3E0] bg-[radial-gradient(circle_at_2px_2px,rgba(228,227,224,0.08)_1px,transparent_0)] bg-[size:40px_40px]'
      } ${
        isReturningUser
          ? 'justify-center p-6 sm:p-10'
          : 'justify-between p-4 sm:p-8 md:p-12'
      }`}
    >
      {/* LAYER 1: PROCEDURAL VISUAL ENVIRONMENT (NIGHT MOUNTAIN FOR DARK, MOUNTAIN + WIND FOR LIGHT) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="wait">
          {!isLight ? (
            <motion.div
              key="night-mountain-canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: stage === 'dark' ? 0.3 : stage === 'glow' ? 0.75 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 w-full h-full"
            >
              <ForgeNightMountainCanvas />
            </motion.div>
          ) : (
            <motion.div
              key="mountain-wind-canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: stage === 'dark' ? 0.3 : stage === 'glow' ? 0.75 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 w-full h-full"
            >
              <ForgeMountainWindCanvas />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LAYER 2: FOREGROUND VIGNETTE */}
      <div
        className={`absolute inset-0 pointer-events-none z-10 transition-all duration-500 ${
          isLight
            ? 'bg-[radial-gradient(ellipse_at_center,rgba(232,229,222,0.08)_0%,rgba(232,229,222,0.3)_60%,rgba(232,229,222,0.65)_100%)]'
            : 'bg-[radial-gradient(ellipse_at_center,rgba(12,12,14,0.12)_0%,rgba(12,12,14,0.5)_60%,#0C0C0E_100%)]'
        }`}
      />

      {/* TOP BAR / THEME SWITCH & STATUS PILL (NEW USERS) */}
      {!isReturningUser && (
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: stage === 'ignited' ? 1 : 0, y: stage === 'ignited' ? 0 : -20 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="relative z-30 w-full max-w-xl flex items-center justify-between pt-1 sm:pt-4"
        >
          {/* Status Pill */}
          <div
            className={`px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2.5 sm:gap-3 backdrop-blur-md transition-all ${
              isLight
                ? 'border border-[#C8C2B6] bg-[#F0EDE6]/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
                : 'border border-[#D4AF37] bg-[rgba(212,175,55,0.05)] shadow-[0_0_15px_rgba(212,175,55,0.1)]'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${
                isLight ? 'bg-[#765522]' : 'bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]'
              }`}
            />
            <span
              className={`font-sans text-xs uppercase tracking-wider font-semibold ${
                isLight ? 'text-[#765522]' : 'text-[#D4AF37]'
              }`}
            >
              Offline Personal Vault
            </span>
          </div>

          {/* Welcome Screen Theme Toggle */}
          <button
            type="button"
            onClick={() => {
              playUISound('tap');
              setThemeMode(isLight ? 'dark' : 'light');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-sans font-semibold tracking-wider uppercase transition-all cursor-pointer backdrop-blur-md ${
              isLight
                ? 'bg-[#F0EDE6]/90 border-[#C8C2B6] text-[#56605D] hover:text-[#202522] hover:border-[#AEA696] shadow-xs'
                : 'bg-[#111114]/90 border-[#2C2C34] text-[#D4D4D8] hover:text-[#FAFAFA] hover:border-[#3B3B46] shadow-sm'
            }`}
            title={`Switch to ${isLight ? 'Dark Mode (Fire)' : 'Light Mode (Alpine Mountains)'}`}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[#765522]" />
                <span>DARK</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>LIGHT</span>
              </>
            )}
          </button>
        </motion.header>
      )}

      {/* CENTER HERO SECTION */}
      <div
        className={`relative z-20 flex flex-col items-center text-center max-w-xl w-full px-3 sm:px-4 ${
          isReturningUser ? 'my-0' : 'my-auto'
        }`}
      >
        {/* Decorative Ring Background */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[520px] sm:h-[520px] border rounded-full pointer-events-none -z-10 flex items-center justify-center transition-colors duration-500 ${
            isLight ? 'border-[rgba(32,37,34,0.08)]' : 'border-[rgba(228,227,224,0.08)]'
          }`}
        >
          <div
            className={`w-[230px] h-[230px] sm:w-[420px] sm:h-[420px] border border-dashed rounded-full transition-colors duration-500 ${
              isLight ? 'border-[rgba(32,37,34,0.08)]' : 'border-[rgba(228,227,224,0.08)]'
            }`}
          />
        </div>

        {isReturningUser && player ? (
          /* RETURNING USER MINIMALIST SECTION: AVATAR + ENTER BUTTON ONLY */
          <div className="flex flex-col items-center text-center w-full">
            {/* Focal Point: Returning User Profile Picture / Avatar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: stage === 'ignited' ? 1 : 0,
                scale: stage === 'ignited' ? 1 : 0.9,
              }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-5 sm:mb-6"
            >
              <div
                className={`relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full p-[3px] transition-all duration-500 ${
                  isLight
                    ? 'bg-gradient-to-tr from-[#A97835] via-[#C8C2B6] to-[#667055] shadow-[0_2px_16px_rgba(169,120,53,0.2)]'
                    : 'bg-gradient-to-tr from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]/50 shadow-[0_0_35px_rgba(212,175,55,0.3)]'
                }`}
              >
                {/* Inner Avatar Container */}
                <div
                  className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center relative border-2 ${
                    isLight ? 'bg-[#F0EDE6] border-[#DDD9D0]' : 'bg-[#0A0A0C] border-[#0C0C0E]'
                  }`}
                >
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.name || 'Character'}
                      className="w-full h-full object-cover object-center rounded-full pointer-events-none select-none"
                    />
                  ) : (
                    /* Fallback Emblem with Shield and Initials */
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center relative ${
                        isLight
                          ? 'bg-gradient-to-br from-[#F5F2EB] via-[#E8E5DE] to-[#DDD9D0] text-[#765522]'
                          : 'bg-gradient-to-br from-[#18181F] via-[#0E0E12] to-[#050508] text-[#D4AF37]'
                      }`}
                    >
                      <Shield
                        className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 opacity-90 ${
                          isLight ? 'text-[#765522]' : 'text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                        }`}
                      />
                      <span
                        className={`font-sans font-bold text-sm sm:text-base md:text-lg tracking-wider mt-1 ${
                          isLight ? 'text-[#202522]' : 'text-[#E4E3E0]'
                        }`}
                      >
                        {getInitials(player.name)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Cinematic Welcome Back Label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: stage === 'ignited' ? 1 : 0,
                y: stage === 'ignited' ? 0 : 10,
              }}
              transition={{ duration: 0.6, delay: 0.48, ease: 'easeOut' }}
              className="mb-1.5 sm:mb-2"
            >
              <span
                className={`font-sans text-xs sm:text-sm uppercase tracking-widest font-semibold block ${
                  isLight
                    ? 'text-[#202522]'
                    : 'text-[#D4AF37] drop-shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                }`}
              >
                WELCOME BACK
              </span>
            </motion.div>

            {/* Grand Hero Username */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{
                opacity: stage === 'ignited' ? 1 : 0,
                y: stage === 'ignited' ? 0 : 8,
                scale: stage === 'ignited' ? 1 : 0.97,
              }}
              transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 sm:mb-10 max-w-full px-2"
            >
              <h1
                className={`font-sans font-bold text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight uppercase break-words max-w-[90vw] sm:max-w-md mx-auto ${
                  isLight
                    ? 'text-[#202522]'
                    : 'text-[#E4E3E0] drop-shadow-[0_4px_24px_rgba(212,175,55,0.25)]'
                }`}
              >
                {player.name}
              </h1>
            </motion.div>

            {/* Enter The Forge Button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{
                opacity: stage === 'ignited' ? 1 : 0,
                y: stage === 'ignited' ? 0 : 15,
              }}
              transition={{ duration: 0.6, delay: 0.68, ease: 'easeOut' }}
              className="w-full sm:w-auto"
            >
              <button
                onClick={() => {
                  playUISound('confirm');
                  onStart();
                }}
                className={`group relative inline-flex items-center justify-center gap-3 sm:gap-4 px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl font-sans font-bold text-sm tracking-wider uppercase border-none cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto ${
                  isLight
                    ? 'bg-[#4E5A42] text-[#F5F2EB] shadow-[0_2px_12px_rgba(78,90,66,0.25)] hover:bg-[#3E4934] hover:shadow-[0_4px_20px_rgba(78,90,66,0.35)]'
                    : 'bg-[#D4AF37] text-[#0C0C0E] shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]'
                }`}
              >
                <span>ENTER THE FORGE</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </motion.div>
          </div>
        ) : (
          /* NEW USER SECTION */
          <>
            {/* Crest Emblem: Flame for Dark, Mountain Ridge for Light */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: stage === 'ignited' || stage === 'glow' ? 1 : 0,
              }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.6 }}
              className="mb-6 sm:mb-8"
            >
              <div
                className={`p-3.5 sm:p-5 border rotate-45 inline-block backdrop-blur-sm transition-all duration-500 ${
                  isLight
                    ? 'border-[#AEA696] bg-[#F0EDE6]/90 shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                    : 'border-[#D4AF37] bg-[#0C0C0E]/80 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                }`}
              >
                <div
                  className={`-rotate-45 w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center ${
                    isLight ? 'text-[#765522]' : 'text-[#D4AF37]'
                  }`}
                >
                  {isLight ? (
                    <Mountain className="w-7 h-7 sm:w-9 sm:h-9 stroke-[1.75]" />
                  ) : (
                    <Flame className="w-7 h-7 sm:w-9 sm:h-9 stroke-[1.5]" />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Title & Taglines */}
            <div className="space-y-2 sm:space-y-3">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{
                  opacity: stage === 'ignited' ? 1 : 0,
                }}
                transition={{ duration: 0.7, delay: 1.0, ease: 'easeOut' }}
                className={`font-sans font-black text-4xl sm:text-6xl md:text-7xl leading-tight tracking-tight uppercase ${
                  isLight
                    ? 'text-[#202522]'
                    : 'text-[#E4E3E0] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]'
                }`}
              >
                FORGE
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{
                  opacity: stage === 'ignited' ? 1 : 0,
                }}
                transition={{ duration: 0.6, delay: 1.18, ease: 'easeOut' }}
                className={`font-sans text-base sm:text-lg md:text-xl tracking-wide font-medium pt-1 ${
                  isLight ? 'text-[#56605D]' : 'text-[#E4E3E0]/90'
                }`}
              >
                "BUILD YOURSELF."
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{
                  opacity: stage === 'ignited' ? 1 : 0,
                }}
                transition={{ duration: 0.7, delay: 1.4, ease: 'easeOut' }}
                className={`font-sans text-xs uppercase tracking-widest pt-1 pb-6 sm:pb-8 ${
                  isLight ? 'text-[#737A76]' : 'text-[#E4E3E0]/60'
                }`}
              >
                Every day is another level.
              </motion.p>
            </div>

            {/* Initialize Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                opacity: stage === 'ignited' ? 1 : 0,
                scale: stage === 'ignited' ? 1 : 0.98,
              }}
              transition={{ duration: 0.8, delay: 1.7, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:w-auto"
            >
              <button
                onClick={() => {
                  playUISound('tap');
                  onStart();
                }}
                className={`group relative inline-flex items-center justify-center gap-3 sm:gap-4 px-7 py-3.5 sm:px-10 sm:py-4 rounded-xl font-sans font-bold text-sm tracking-wider uppercase border-none cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto ${
                  isLight
                    ? 'bg-[#4E5A42] text-[#F5F2EB] shadow-[0_2px_12px_rgba(78,90,66,0.25)] hover:bg-[#3E4934] hover:shadow-[0_4px_20px_rgba(78,90,66,0.35)]'
                    : 'bg-[#D4AF37] text-[#0C0C0E] shadow-[0_0_25px_rgba(212,175,55,0.25)] hover:shadow-[0_0_40px_rgba(212,175,55,0.45)]'
                }`}
              >
                <span>INITIALIZE FORGE</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </motion.div>
          </>
        )}
      </div>

      {/* FOOTER METADATA (NEW USERS ONLY) */}
      {!isReturningUser && (
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: stage === 'ignited' ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.75 }}
          className={`relative z-20 w-full flex flex-col sm:flex-row justify-between items-center sm:items-end gap-2 sm:gap-4 border-t pt-3 sm:pt-6 ${
            isLight ? 'border-[#C8C2B6]' : 'border-[rgba(228,227,224,0.1)]'
          }`}
        >
          <div className="text-center sm:text-left">
            <span
              className={`font-sans text-xs uppercase tracking-wider font-semibold block ${
                isLight ? 'text-[#765522]' : 'text-[#D4AF37]'
              }`}
            >
              Character System
            </span>
            <p
              className={`font-sans text-xs mt-0.5 ${
                isLight ? 'text-[#737A76]' : 'text-[#E4E3E0]/60'
              }`}
            >
              Adaptive Character Engine v2.0
            </p>
          </div>

          <div className="text-center sm:text-right">
            <span
              className={`font-sans text-xs uppercase tracking-wider font-semibold block ${
                isLight ? 'text-[#765522]' : 'text-[#D4AF37]'
              }`}
            >
              Storage Protocol
            </span>
            <p
              className={`font-sans text-xs mt-0.5 ${
                isLight ? 'text-[#737A76]' : 'text-[#E4E3E0]/60'
              }`}
            >
              100% Local Device Storage • Zero Server Telemetry
            </p>
          </div>
        </motion.footer>
      )}

      {/* BOTTOM-CENTERED THEME TOGGLE (RETURNING USERS ONLY) */}
      {isReturningUser && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: stage === 'ignited' ? 1 : 0,
            y: stage === 'ignited' ? 0 : 10,
          }}
          transition={{ duration: 0.6, delay: 0.68, ease: 'easeOut' }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30"
        >
          <button
            type="button"
            onClick={() => {
              playUISound('tap');
              setThemeMode(isLight ? 'dark' : 'light');
            }}
            className={`flex items-center gap-2.5 px-5 py-2.5 sm:py-3 rounded-full border text-sm font-sans font-semibold tracking-wider uppercase transition-all cursor-pointer backdrop-blur-md ${
              isLight
                ? 'bg-[#F0EDE6]/90 border-[#C8C2B6] text-[#56605D] hover:text-[#202522] hover:border-[#AEA696] shadow-xs'
                : 'bg-[#111114]/90 border-[#2C2C34] text-[#D4D4D8] hover:text-[#FAFAFA] hover:border-[#3B3B46] shadow-sm'
            }`}
            title={`Switch to ${isLight ? 'Dark Mode (Fire)' : 'Light Mode (Alpine Mountains)'}`}
          >
            {isLight ? (
              <>
                <Moon className="w-4.5 h-4.5 text-[#765522]" />
                <span>DARK</span>
              </>
            ) : (
              <>
                <Sun className="w-4.5 h-4.5 text-[#D4AF37]" />
                <span>LIGHT</span>
              </>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
};




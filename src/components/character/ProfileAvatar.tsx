import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { PlayerProfile } from '../../types';
import { Shield, Camera, Upload, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ProfileAvatarProps {
  player: PlayerProfile;
  onUpdateAvatar: (avatarUrl: string) => Promise<void>;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ player, onUpdateAvatar }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle File Selection & Resize/Compress to Base64 Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file works
    e.target.value = '';

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    // Validate size (< 12MB before compression)
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg('Image file is too large. Please select an image under 12MB.');
      return;
    }

    setErrorMsg(null);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Free object URL immediately once decoded into memory
      URL.revokeObjectURL(objectUrl);

      // Resize onto a 320x320 canvas for fast rendering and minimal storage footprint
      const canvas = document.createElement('canvas');
      const maxSize = 320;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setPreviewUrl(compressedDataUrl);
        setIsModalOpen(true);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setErrorMsg('Failed to load image. Please try another file.');
    };

    img.src = objectUrl;
  };

  const handleConfirmSave = async () => {
    if (!previewUrl) return;
    setIsSaving(true);
    try {
      await onUpdateAvatar(previewUrl);
      setIsModalOpen(false);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Failed to save avatar', err);
      setErrorMsg('Could not save avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Fallback Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Main Avatar Frame */}
      <div className="relative group">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1.0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
          className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1 bg-gradient-to-tr from-[var(--forge-primary)] to-[var(--forge-border-accent)] shadow-sm flex items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Outer Ambient Glow Ring */}
          <div className="absolute inset-0 rounded-full border border-[var(--forge-border-accent)] animate-pulse pointer-events-none" />

          {/* Inner Avatar Container */}
          <div className="w-full h-full rounded-full overflow-hidden bg-[var(--forge-surface-elevated)] border-2 border-[var(--forge-surface)] flex items-center justify-center relative">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.name}
                className="w-full h-full object-cover object-center rounded-full"
              />
            ) : (
              /* Fallback RPG Emblem Avatar */
              <div className="w-full h-full bg-gradient-to-br from-[var(--forge-surface-interactive)] via-[var(--forge-surface-elevated)] to-[var(--forge-surface)] flex flex-col items-center justify-center text-[var(--forge-text-accent)] relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--forge-primary-muted)_0%,transparent_70%)] pointer-events-none" />
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--forge-text-accent)] opacity-90 drop-shadow-sm" />
                <span className="font-serif font-bold text-lg sm:text-xl tracking-widest text-[var(--forge-text-primary)] mt-0.5">
                  {getInitials(player.name)}
                </span>
              </div>
            )}

            {/* Hover Camera Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[var(--forge-text-accent)] font-mono text-[10px] uppercase font-bold tracking-wider">
              <Camera className="w-6 h-6 mb-1" />
              <span>Edit Photo</span>
            </div>
          </div>

          {/* Level Badge Overlapping Lower Edge */}
          <div className="absolute -bottom-1 -right-1 px-3 py-1 bg-[var(--forge-surface-elevated)] border-2 border-[var(--forge-primary)] rounded-full shadow-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--forge-text-accent)]" />
            <span className="font-mono text-xs font-bold text-[var(--forge-text-primary)] tracking-wider">
              LVL {player.level}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Change Profile Action Button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="mt-3 px-3.5 py-1.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-accent)] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
      >
        <Upload className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
        <span>Change Profile</span>
      </button>

      {errorMsg && (
        <p className="text-xs text-red-500 font-mono mt-2">{errorMsg}</p>
      )}

      {/* Avatar Preview Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPreviewUrl(null);
        }}
        title="CONFIRM PROFILE PICTURE"
        subtitle="Verify your RPG character avatar."
        maxWidthClass="max-w-[440px]"
      >
        <div className="flex flex-col items-center pt-1 pb-1 space-y-4 text-center">
          {/* Avatar Preview Section - Structurally Independent Container */}
          <div className="flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center p-1">
              {/* Outer Golden Glow Accent Ring */}
              <div className="absolute inset-0 rounded-full border border-[var(--forge-border-accent)] shadow-xs pointer-events-none" />

              {/* Avatar Circle Container with strict overflow-hidden and border-radius 50% */}
              <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-[var(--forge-border-accent)] bg-[var(--forge-surface-elevated)] relative flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Character Avatar Preview"
                    className="w-full h-full object-cover object-center rounded-full pointer-events-none select-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--forge-text-accent)]">
                    <Shield className="w-12 h-12" />
                  </div>
                )}
              </div>

              {/* Level Badge - Attached strictly to Bottom-Right of Avatar Circle */}
              <div className="absolute bottom-0 right-0 px-2.5 py-0.5 bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] rounded-full shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[var(--forge-text-accent)]" />
                <span className="font-mono text-xs font-bold text-[var(--forge-text-primary)] tracking-wider">
                  LVL {player.level}
                </span>
              </div>
            </div>

            {/* RPG Character Info */}
            <div className="flex items-center justify-center gap-2 mt-3 text-xs font-mono text-[var(--forge-text-secondary)]">
              <span className="text-[var(--forge-text-primary)] font-semibold">{player.name}</span>
              <span>•</span>
              <span className="text-[var(--forge-text-accent)]">{player.lifeClass}</span>
            </div>
          </div>

          {/* Storage Description */}
          <div className="w-full px-4 py-2.5 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-xs text-[var(--forge-text-secondary)] leading-relaxed">
            This image will be stored locally in your Forge vault as your RPG character avatar.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 w-full pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                setPreviewUrl(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="px-5"
            >
              {isSaving ? 'Saving Avatar...' : 'Save Avatar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


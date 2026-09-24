import React from 'react';
import { Modal } from '../ui/Modal';
import { ForgePathGuideContent, PRESET_FORGE_PATHS } from './ForgePathGuideContent';

export { PRESET_FORGE_PATHS };

interface ForgePathModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgePathModal: React.FC<ForgePathModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="FORGE PATH GUIDE"
      subtitle="Determine your overarching long-term direction with the Path Guide."
      maxWidthClass="max-w-xl"
    >
      <ForgePathGuideContent onApplySuccess={onClose} isModal={true} />
    </Modal>
  );
};

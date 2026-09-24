import React from 'react';
import { RecoveryDashboard } from '../components/recovery/RecoveryDashboard';
import { Heart } from 'lucide-react';

interface RecoveryScreenProps {
  onLaunchBreathing?: () => void;
}

export const RecoveryScreen: React.FC<RecoveryScreenProps> = ({ onLaunchBreathing }) => {
  return (
    <div id="recovery-screen" className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-[#E4E3E0] flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-400" />
            Restoration & Recovery
          </h1>
          <p className="text-[10px] font-mono text-[#8E9299] mt-1 uppercase tracking-widest">
            Daily physical, mental & sleep recovery protocols
          </p>
        </div>
      </div>

      <RecoveryDashboard onLaunchBreathing={onLaunchBreathing} />
    </div>
  );
};

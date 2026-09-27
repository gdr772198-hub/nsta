import React from 'react';

interface PlayerWatermarkProps {
  appLogo?: string;
  appName?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  opacity?: number;
  className?: string;
}

export const PlayerWatermark: React.FC<PlayerWatermarkProps> = ({
  appLogo = '/nsta-logo.png',
  appName = 'NSTA ACADEMY',
  position = 'top-right',
  opacity = 0.55,
  className = '',
}) => {
  const posClasses: Record<string, string> = {
    'top-right': 'top-3 right-3',
    'top-left': 'top-3 left-3',
    'bottom-right': 'bottom-14 right-3',
    'bottom-left': 'bottom-14 left-3',
  };

  return (
    <div
      className={`absolute z-30 pointer-events-none select-none flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-[2px] transition-opacity duration-300 ${posClasses[position] || posClasses['top-right']} ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.28)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        opacity,
      }}
    >
      <img
        src={appLogo || '/nsta-logo.png'}
        alt={appName}
        className="w-4 h-4 object-contain rounded-full shadow-sm"
        onError={(e) => {
          // Fallback if logo fails to load
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
      <span className="text-[10px] font-black tracking-wider text-white drop-shadow-md uppercase">
        {appName}
      </span>
    </div>
  );
};

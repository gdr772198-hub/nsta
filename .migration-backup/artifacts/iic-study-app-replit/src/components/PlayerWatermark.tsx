import React from 'react';

interface PlayerWatermarkProps {
  appLogo?: string;
  appName?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  opacity?: number;
  className?: string;
  onClick?: () => void;
  isFullscreen?: boolean;
}

export const PlayerWatermark: React.FC<PlayerWatermarkProps> = ({
  appLogo = '/branding/nsta-logo.png',
  appName = 'NSTA',
  position = 'top-right',
  opacity = 0.8,
  className = '',
  onClick,
  isFullscreen = false,
}) => {
  const posClasses: Record<string, string> = {
    'top-right': 'top-2.5 right-2.5',
    'top-left': 'top-2.5 left-2.5',
    'bottom-right': 'bottom-14 right-3',
    'bottom-left': 'bottom-14 left-3',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={onClick ? (isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (Top & Bottom bar gayab honge)') : undefined}
      aria-label={onClick ? 'Toggle Fullscreen' : undefined}
      className={`absolute z-30 select-none flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md transition-all duration-200 active:scale-90 ${posClasses[position] || posClasses['top-right']} ${
        onClick
          ? 'pointer-events-auto cursor-pointer hover:opacity-100 hover:scale-105 active:scale-95 shadow-lg'
          : 'pointer-events-none'
      } ${className}`}
      style={{
        background: 'rgba(15, 23, 42, 0.78)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
        opacity: onClick ? 0.95 : opacity,
      }}
    >
      <img
        src={appLogo || '/branding/nsta-logo.png'}
        alt={appName}
        className="w-4 h-4 object-contain rounded-full shadow-sm shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
      <span className="text-[10px] font-black tracking-wider text-white drop-shadow-md uppercase whitespace-nowrap">
        {appName}
      </span>
      {onClick && (
        <span className="text-[10px] text-indigo-300 font-bold ml-0.5">
          {isFullscreen ? '⤓' : '⛶'}
        </span>
      )}
    </Component>
  );
};

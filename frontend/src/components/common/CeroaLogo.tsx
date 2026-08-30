import React from 'react';

interface CeroaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  dark?: boolean;
  showText?: boolean;
}

export const CeroaLogo: React.FC<CeroaLogoProps> = ({
  size = 'md',
  subtitle,
  className = '',
  onClick,
  dark = false,
  showText = true
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div 
      id="ceroa-brand-logo"
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className={`${iconSizes[size]} rounded-xl bg-[#008FA6] flex items-center justify-center shadow-xs relative overflow-hidden flex-shrink-0`}>
        {/* Geometric spark/zero-debt node icon from original design */}
        <svg 
          viewBox="0 0 24 24" 
          className="w-5/6 h-5/6 text-white" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" fill="white" fillOpacity="0.3" />
          <circle cx="18" cy="6" r="1.5" fill="white" />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col text-left">
          <span className={`${textSizes[size]} font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900 dark:text-white'} leading-tight`}>
            Ceroa
          </span>
          {subtitle && (
            <span className={`text-[11px] font-medium ${dark ? 'text-cyan-200' : 'text-slate-500 dark:text-slate-400'} -mt-0.5 tracking-tight`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};


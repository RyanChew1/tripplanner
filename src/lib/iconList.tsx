import React, { useState } from 'react';

export class TravelIcons {
  private icons: { [key: string]: string } = {
    airplane: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.8 19.2L16 11l3.5-3.5c.5-.5.5-1.3 0-1.8s-1.3-.5-1.8 0L14 9l-8.2-1.8c-.5-.1-1.1.1-1.4.6L3.5 9.5c-.3.5 0 1.1.6 1.3L8 12l-3 3-1.5-.5c-.5-.1-1 .3-1 .8v1c0 .3.2.6.5.7l2 .5.5 2c.1.3.4.5.7.5h1c.5 0 .9-.5.8-1L8 16l4 3.9c.2.6.8.8 1.3.6l1.7-.9c.5-.3.7-.9.6-1.4L17.8 19.2z"/>
    </svg>`,

    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>`,

    suitcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <rect x="4" y="6" width="16" height="13" rx="2"/>
      <line x1="10" y1="11" x2="14" y2="11"/>
    </svg>`,

    hotel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 21h20"/>
      <path d="M6 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14"/>
      <rect x="8" y="9" width="2" height="2"/>
      <rect x="14" y="9" width="2" height="2"/>
      <rect x="8" y="13" width="2" height="2"/>
      <rect x="14" y="13" width="2" height="2"/>
      <rect x="10" y="17" width="4" height="4"/>
    </svg>`,

    tent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 21h18"/>
      <path d="M19 21L12 3L5 21"/>
      <path d="M12 3v18"/>
      <path d="M7 14h10"/>
      <path d="M9 17h6"/>
      <circle cx="13" cy="6" r="1"/>
    </svg>`,

    locationPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>`,

    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`,

    snowflake: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/>
      <line x1="22" y1="12" x2="2" y2="12"/>
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      <path d="M10 3l2-1 2 1"/>
      <path d="M10 21l2 1 2-1"/>
      <path d="M3 10l-1 2 1 2"/>
      <path d="M21 10l1 2-1 2"/>
      <path d="M6.34 6.34l-1.41-.71.71 1.41"/>
      <path d="M18.37 17.66l1.41.71-.71-1.41"/>
      <path d="M17.66 6.34l.71-1.41 1.41.71"/>
      <path d="M5.63 17.66l-.71 1.41-1.41-.71"/>
    </svg>`,
    
  };

  getIcon(name: string): string | null {
    return this.icons[name] || null;
  }

  getIconEntry(name: string): { name: string; svg: string } | null {
    const svg = this.getIcon(name);
    return svg ? { name, svg } : null;
  }

  getAllIcons(): { name: string; svg: string }[] {
    return Object.entries(this.icons).map(([name, svg]) => ({ name, svg }));
  }

  getIconNames(): string[] {
    return Object.keys(this.icons);
  }

  hasIcon(name: string): boolean {
    return name in this.icons;
  }
}

interface TravelIconSelectorProps {
  onIconSelect?: (iconData: { name: string; svg: string }) => void;
  className?: string;
}

export const TravelIconSelector: React.FC<TravelIconSelectorProps> = ({ 
  onIconSelect,
  className = "" 
}) => {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [iconInstance] = useState(new TravelIcons());

  const handleIconClick = (name: string) => {
    const iconData = iconInstance.getIconEntry(name);
    if (iconData) {
      setSelectedIcon(name);
      onIconSelect?.(iconData);
    }
  };

  const formatIconName = (name: string): string => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto ${className}`}>
      


      {/* Icon Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-4">
        {iconInstance.getAllIcons().map(({ name, svg }) => (
          <div
            key={name}
            onClick={() => handleIconClick(name)}
            className={`
              group cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md
              ${selectedIcon === name 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex flex-col items-center gap-2">
              <div 
                className={`w-8 h-8 transition-colors duration-200 ${
                  selectedIcon === name 
                    ? 'text-blue-600' 
                    : 'text-gray-600 group-hover:text-gray-800'
                }`}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <span className={`text-xs font-medium text-center transition-colors duration-200 ${
                selectedIcon === name 
                  ? 'text-blue-700' 
                  : 'text-gray-500 group-hover:text-gray-700'
              }`}>
                {formatIconName(name)}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

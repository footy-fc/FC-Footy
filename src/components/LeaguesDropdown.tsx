import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Sport {
  name: string;
  sportId: string;
  url: string;
}

interface LeaguesDropdownProps {
  sports: Sport[];
  selectedLeague: string;
  onLeagueSelect: (leagueId: string) => void;
  loading?: boolean;
}

const LeaguesDropdown: React.FC<LeaguesDropdownProps> = ({
  sports,
  selectedLeague,
  onLeagueSelect,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedSport = sports.find(sport => sport.sportId === selectedLeague);

  const handleLeagueSelect = (leagueId: string) => {
    onLeagueSelect(leagueId);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="mb-4">
        <div className="animate-pulse bg-gray-600 h-10 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-4 bg-purplePanel border-2 border-gray-500 rounded-lg text-lightPurple font-semibold hover:border-limeGreenOpacity transition-colors"
      >
        <span>{selectedSport?.name || 'Select League'}</span>
        <ChevronDown 
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {isOpen && (
        <div 
          className="fixed bg-darkPurple border-2 border-gray-500 rounded-lg shadow-lg z-50" 
          style={{ 
            height: '30rem',
            width: buttonRef.current?.offsetWidth || 'auto',
            top: (buttonRef.current?.getBoundingClientRect().bottom || 0) + 4,
            left: buttonRef.current?.getBoundingClientRect().left || 0,
          }}
        >
          <div className="overflow-y-auto h-full">
            {sports.map((sport) => (
              <button
                key={sport.sportId}
                onClick={() => handleLeagueSelect(sport.sportId)}
                className={`w-full text-left px-4 py-2 hover:bg-purplePanel transition-colors ${
                  selectedLeague === sport.sportId
                    ? 'bg-limeGreenOpacity text-darkPurple font-semibold'
                    : 'text-lightPurple'
                }`}
              >
                {sport.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaguesDropdown;

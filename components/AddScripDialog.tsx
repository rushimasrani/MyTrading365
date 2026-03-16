import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface Scrip {
  token: string;
  tradingsymbol: string;
  exchange: string;
  name: string;
  dispName: string;
  upstox_key?: string;
}

interface AddScripDialogProps {
  onClose: () => void;
  onAdd: (scrip: Scrip) => void;
}

const AddScripDialog: React.FC<AddScripDialogProps> = ({ onClose, onAdd }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  const [exchange, setExchange] = useState('MCX');
  const [query, setQuery] = useState('');
  const [filteredScrips, setFilteredScrips] = useState<Scrip[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Center dialog initially
  useEffect(() => {
    const width = 360;
    const height = 400; // Increased height for list
    const startX = (window.innerWidth - width) / 2;
    const startY = (window.innerHeight - height) / 2;
    setPosition({ x: startX, y: startY });

    // Focus the input field on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Filter scrips when query or exchange changes using exact Upstox Backend Array
  useEffect(() => {
    if (!query || query.length < 2) {
      setFilteredScrips([]);
      itemsRef.current = [];
      return;
    }

    let isActive = true;
    setIsLoading(true);

    const fetchScrips = async () => {
      try {
        const url = `/api/instruments/search?exchange=${exchange}&query=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (isActive) {
          setFilteredScrips(data);
          setSelectedIndex(0);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Search error:', e);
        if (isActive) setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchScrips();
    }, 250); // slight debounce

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [query, exchange]);

  // Handle Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle Auto-Scroll on Keyboard Navigation
  useEffect(() => {
    if (itemsRef.current[selectedIndex]) {
      itemsRef.current[selectedIndex]?.scrollIntoView({
        behavior: 'auto',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;
    if ((e.target as HTMLElement).closest('select')) return;
    if ((e.target as HTMLElement).closest('.scrip-list')) return;

    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleAdd = (scrip?: Scrip) => {
    const selected = scrip || filteredScrips[selectedIndex];
    if (selected) {
      onAdd(selected);
      onClose();
    }
  };

  return (
    <div
      className="fixed z-[100] font-sans select-none rounded-t-[5px] w-[360px] shadow-[0_0_15px_rgba(0,0,0,1)]"
      style={{ top: position.y, left: position.x }}
    >
      {/* Metallic Title Bar */}
      <div
        className="h-[26px] bg-gradient-to-b from-[#b0b0b0] via-[#505050] to-[#303030] flex justify-between items-center px-2 border border-black border-b-0 cursor-move relative rounded-t-[5px]"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30 rounded-t-[5px]"></div>
        <span className="text-white text-[12px] font-bold drop-shadow-md tracking-wide pl-1">Market Watch - Add Scrip</span>

        {/* Close Button - Gradient Red */}
        <button
          onClick={onClose}
          className="bg-gradient-to-b from-[#ff9999] via-[#cc0000] to-[#990000] border border-[#660000] rounded-[2px] w-[18px] h-[16px] flex items-center justify-center hover:brightness-110 active:brightness-90 shadow-sm"
        >
          <X size={12} className="text-white stroke-[3px] drop-shadow-md" />
        </button>
      </div>

      {/* Main Body - Dark with Inner Glow Panel */}
      <div className="bg-black border border-gray-600 p-[10px] flex flex-col items-center justify-start gap-2">

        {/* Inner Panel with Cyan/Blue Border */}
        <div className="w-full border border-[#406070] bg-gradient-to-b from-[#1a2a35] to-[#0f1a25] rounded-[4px] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex items-center px-3 py-2 space-x-2">

          {/* Exchange Dropdown - White Rounded */}
          <div className="relative">
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="appearance-none bg-white text-black text-[12px] font-bold h-[22px] w-[65px] pl-2 pr-5 rounded-[4px] border border-gray-500 outline-none focus:border-blue-400 shadow-sm"
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
              <option value="MCX">MCX</option>
              <option value="NFO">NFO</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-black">
              {/* Custom Arrow for Dropdown */}
              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
            </div>
          </div>

          {/* Scrip Input - Underlined */}
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type Scrip..."
              className="w-full bg-transparent text-white text-[12px] placeholder-gray-500 font-medium outline-none border-b border-gray-500 py-1 focus:border-blue-400 transition-colors uppercase"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') onClose();
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIndex(prev => Math.min(prev + 1, filteredScrips.length - 1));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex(prev => Math.max(prev - 1, 0));
                }
              }}
            />
          </div>
        </div>

        {/* Results List */}
        <div className="w-full h-[200px] border border-[#406070] bg-[#0f1a25] rounded-[4px] overflow-y-auto scrip-list">
          {isLoading ? (
            <div className="text-gray-500 text-[11px] p-2 text-center">Loading from Upstox API...</div>
          ) : filteredScrips.length === 0 ? (
            <div className="text-gray-500 text-[11px] p-2 text-center">
              {query.length > 1 ? 'No scrips found' : 'Start typing to search...'}
            </div>
          ) : (
            filteredScrips.map((scrip, index) => (
              <div
                key={scrip.token}
                ref={(el) => (itemsRef.current[index] = el)}
                className={`px-2 py-1 text-[11px] cursor-pointer flex justify-between items-center ${index === selectedIndex ? 'bg-[#204060] text-white' : 'text-gray-300 hover:bg-[#1a2a35]'
                  }`}
                onClick={() => handleAdd(scrip)}
              >
                {/* THE OFFICIAL DISPLAY NAME REQUESTED BY DOMAIN */}
                <span className="font-bold">{scrip.dispName}</span>
                <span className="text-[10px] text-gray-400 ml-2 overflow-hidden whitespace-nowrap text-ellipsis max-w-[120px]" title={scrip.name}>{scrip.name}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{scrip.exchange}</span>
              </div>
            ))
          )}
        </div>

        {/* Add Button - Glossy Blue */}
        <div className="w-full flex justify-end">
          <button
            onClick={() => handleAdd()}
            className="bg-gradient-to-b from-[#4a90e2] via-[#2060b0] to-[#104080] text-white text-[11px] font-bold px-4 py-[3px] rounded-[3px] border border-[#103060] shadow-[0_1px_2px_rgba(0,0,0,0.5)] hover:brightness-110 active:translate-y-[1px]"
          >
            Add
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddScripDialog;

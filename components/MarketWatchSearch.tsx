import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Scrip } from './AddScripDialog';

interface MarketWatchSearchProps {
    onAdd: (scrip: Scrip) => void;
}

const MarketWatchSearch: React.FC<MarketWatchSearchProps> = ({ onAdd }) => {
    const [query, setQuery] = useState('');
    const [exchange, setExchange] = useState('NSE');
    const [results, setResults] = useState<Scrip[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch results with debounce
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        let isActive = true;
        setIsLoading(true);

        const fetchScrips = async () => {
            try {
                const url = `/api/instruments/search?exchange=${exchange}&query=${encodeURIComponent(query)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Search failed');
                const data = await res.json();

                if (isActive) {
                    setResults(data);
                    setSelectedIndex(0);
                    setIsLoading(false);
                    setIsOpen(true);
                }
            } catch (err) {
                if (isActive) setIsLoading(false);
            }
        };

        const debounceId = setTimeout(fetchScrips, 300);
        return () => {
            isActive = false;
            clearTimeout(debounceId);
        };
    }, [query, exchange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                onAdd(results[selectedIndex]);
                setQuery('');
                setIsOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (scrip: Scrip) => {
        onAdd(scrip);
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div className="w-full bg-[#111] border-b border-gray-700 relative z-30" ref={containerRef}>
            <div className="flex items-center px-2 py-1 md:py-1 h-12 md:h-9 bg-[#111]">
                {/* Exchange Selector */}
                <div className="relative h-full flex items-center pr-2 border-r border-gray-600 shrink-0">
                    <select
                        value={exchange}
                        onChange={(e) => {
                            setExchange(e.target.value);
                            setQuery('');
                        }}
                        className="appearance-none bg-transparent text-blue-400 font-bold text-[13px] md:text-[12px] outline-none cursor-pointer pl-1 pr-4 h-full"
                    >
                        <option value="NSE" className="bg-[#111] text-white">NSE</option>
                        <option value="BSE" className="bg-[#111] text-white">BSE</option>
                        <option value="MCX" className="bg-[#111] text-white">MCX</option>
                        <option value="NFO" className="bg-[#111] text-white">NFO</option>
                    </select>
                    <div className="absolute right-0 pointer-events-none text-blue-400">
                        <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                </div>

                {/* Search Input */}
                <div className="flex-1 flex items-center h-full relative pl-2">
                    <Search size={14} className="text-gray-400 absolute left-3 md:left-2" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (query.length >= 2) setIsOpen(true);
                        }}
                        placeholder="Search Scrip (e.g. RELIANCE, NIFTY..."
                        className="w-full h-full bg-transparent text-white placeholder-gray-500 outline-none text-[14px] md:text-[12px] uppercase pl-6 pr-6"
                    />
                    {query.length > 0 && (
                        <button
                            onClick={() => { setQuery(''); setIsOpen(false); }}
                            className="absolute right-2 text-gray-400 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown Results */}
            {isOpen && (query.length >= 2) && (
                <div className="absolute top-full left-0 w-full md:w-[600px] max-h-[300px] md:max-h-[400px] overflow-y-auto bg-[#0a1520] border border-[#1a3a5a] shadow-2xl rounded-b mt-[2px] z-50">
                    {isLoading ? (
                        <div className="p-3 text-center text-[12px] text-gray-400">Searching...</div>
                    ) : results.length === 0 ? (
                        <div className="p-3 text-center text-[12px] text-gray-400">No instruments found matching '{query}'</div>
                    ) : (
                        <ul className="py-1">
                            {results.map((scrip, idx) => (
                                <li
                                    key={scrip.token}
                                    className={`px-3 py-2 md:py-[6px] cursor-pointer flex justify-between items-center transition-colors ${idx === selectedIndex ? 'bg-[#1a3a5a]' : 'hover:bg-[#102a40]'}`}
                                    onClick={() => handleSelect(scrip)}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center w-full gap-1 md:gap-3">
                                        <span className="text-[13px] md:text-[12px] font-bold text-white shrink-0 md:w-[220px] truncate">{scrip.dispName}</span>
                                        <span className="text-[11px] md:text-[10px] text-gray-400 truncate flex-1">{scrip.name}</span>
                                        <span className="text-[10px] text-blue-300 font-mono bg-blue-900/30 px-2 py-[2px] rounded shrink-0 self-start md:self-auto">{scrip.exchange}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default MarketWatchSearch;

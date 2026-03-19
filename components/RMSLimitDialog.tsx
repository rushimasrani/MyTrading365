import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Square } from 'lucide-react';
import { RMSRecord } from '../types';

interface RMSLimitDialogProps {
  userId: string;
  onClose: () => void;
  availableCapital: number;
  usedCapital: number;
  blockedMargin: number;
  allocM2M: number;
  runningM2M: number;
}

const RMSLimitDialog: React.FC<RMSLimitDialogProps> = ({
  userId, onClose, availableCapital, usedCapital, blockedMargin, allocM2M, runningM2M
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [userData, setUserData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetch(`/api/user/rms-limits/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setUserData(data);
      })
      .catch(err => {
        console.error("RMS Fetch Error:", err);
        setErrorMsg("Failed to load RMS data. Please try again.");
      });
  }, [userId]);

  // Center dialog initially
  useEffect(() => {
    const width = 500;
    const height = 550;
    const startX = Math.max(0, (window.innerWidth - width) / 2);
    const startY = Math.max(50, (window.innerHeight - height) / 2);
    setPosition({ x: startX, y: startY });
  }, []);

  // Handle Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPosition(prev => ({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      }));
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

  if (errorMsg) {
    return (
      <div className="fixed z-[100] top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 bg-black text-red-500 border border-red-500 p-4 rounded shadow-lg flex flex-col items-center">
        <span>{errorMsg}</span>
        <button className="mt-2 px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-700" onClick={onClose}>Close</button>
      </div>
    );
  }

  if (!userData) {
    return <div className="fixed z-[100] top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 bg-black text-white p-4 rounded shadow-lg">Loading RMS Data...</div>;
  }

  console.log("RMS DATA", userData);

  const limits: RMSRecord[] = userData.limits || [];

  // Use real-time props passed from TradingTerminal instead of static snapshot
  const displayAvailableCapital = availableCapital || 0;
  const displayUsedCapital = usedCapital || 0;
  const displayRunningM2M = runningM2M || 0;
  const displayAllocM2M = allocM2M || 0;



  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // Extracted unique exchange timings from limits (or fallback to defaults if none)
  const exchangeTimings = limits.length > 0
    ? Array.from(new Set(limits.map(l => l?.exchange).filter(Boolean))).map(exch => {
      const rules = limits.filter(l => l?.exchange === exch);
      const start = rules[0]?.tradeStart || '09:00:00';
      const close = rules[0]?.tradeEnd || '23:55:00';
      return { exch, start, close };
    })
    : [
      { exch: 'NSE', start: '09:00:00', close: '15:30:00' },
      { exch: 'MCX', start: '09:00:00', close: '23:55:00' }
    ];

  return (
    <div
      className="fixed z-[100] font-sans select-none shadow-[0_10px_40px_rgba(0,0,0,0.6)] bg-[#2a2a2a] w-full h-[calc(100vh-60px)] md:w-[500px] md:h-[550px] max-md:!top-0 max-md:!left-0 flex flex-col border border-gray-500 pt-9 md:pt-0"
      style={{ top: position.y, left: position.x }}
    >
      {/* Inject local styles for scrollbar */}
      <style>{`
        .rms-scrollbar::-webkit-scrollbar {
          width: 16px;
          height: 16px;
        }
        .rms-scrollbar::-webkit-scrollbar-track {
          background: #dcdcdc;
          border-left: 1px solid #a0a0a0;
        }
        .rms-scrollbar::-webkit-scrollbar-thumb {
          background-color: #c0c0c0;
          border: 2px solid #f0f0f0;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }
        .rms-scrollbar::-webkit-scrollbar-thumb:active {
          background-color: #a0a0a0;
        }
      `}</style>

      {/* Title Bar */}
      <div
        className="h-[30px] w-full bg-gradient-to-b from-[#e0e0e0] via-[#a0a0a0] to-[#505050] flex justify-between items-center px-1 border-b border-black cursor-move shrink-0 relative"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40 pointer-events-none"></div>

        <span className="text-white text-[13px] font-bold drop-shadow-[1px_1px_1px_rgba(0,0,0,1)] tracking-wide pl-2 shadow-black">
          RMS Limit
        </span>

        <div className="flex items-center space-x-[2px] pr-[1px]">
          {/* Minimize */}
          <button className="w-[22px] h-[20px] bg-gradient-to-b from-[#f0f0f0] to-[#808080] border border-[#404040] flex items-center justify-center hover:brightness-110 active:border-black rounded-[2px]">
            <Minus size={10} className="text-black stroke-[3px]" />
          </button>
          {/* Maximize */}
          <button className="w-[22px] h-[20px] bg-gradient-to-b from-[#f0f0f0] to-[#808080] border border-[#404040] flex items-center justify-center hover:brightness-110 active:border-black rounded-[2px]">
            <Square size={9} className="text-black stroke-[2px] fill-transparent" />
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            className="w-[22px] h-[20px] bg-gradient-to-b from-[#ff9999] via-[#cc0000] to-[#990000] border border-[#550000] flex items-center justify-center hover:brightness-125 active:brightness-75 rounded-[2px]"
          >
            <X size={14} className="text-white stroke-[3px] drop-shadow-sm" />
          </button>
        </div>
      </div>

      {/* Content Wrapper - Added min-h-0 to ensure flex scrolling works */}
      <div className="flex flex-col flex-1 min-h-0 p-[3px] bg-[#333] border-t border-[#666]">

        {/* Summary Header Section */}
        <div className="bg-black border border-gray-500 mb-[3px] p-2 text-white text-[12px] font-bold shrink-0 font-sans shadow-inner">
          <div className="flex flex-col md:flex-row justify-between px-2 gap-2 md:gap-0">
            <div className="grid grid-cols-2 md:grid-cols-[90px_1fr] gap-x-2 w-full md:w-1/2">
              <span className="text-left text-[#ccc] md:auto">Available Capital</span>
              <span className={`text-right ${displayAvailableCapital >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(displayAvailableCapital).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-left text-[#ccc]">Allocated M2M</span>
              <span className="text-right text-purple-400">{(displayAllocM2M).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-[80px_1fr] gap-x-2 w-full md:w-1/2 md:ml-4">
              <span className="text-left text-[#ccc]">Used Capital</span>
              <span className="text-right text-yellow-400">{(displayUsedCapital).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              {blockedMargin > 0 && (
                <>
                  <span className="text-left text-[#ccc]">Blocked</span>
                  <span className="text-right text-orange-400">{blockedMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </>
              )}
              <span className="text-left text-[#ccc]">M2M</span>
              <span className={`text-right ${(displayRunningM2M) > 0 ? 'text-green-500' : (displayRunningM2M) < 0 ? 'text-red-500' : 'text-white'}`}>
                {(displayRunningM2M).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Main Table - Changed overflow-auto to overflow-y-scroll to always show scrollbar */}
        <div className="flex-1 overflow-y-scroll min-h-0 border border-gray-500 bg-[#333] rms-scrollbar relative mb-[3px]">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-b from-[#4a8a9a] to-[#2a5a6a] text-white text-[10px] font-bold whitespace-nowrap shadow-sm h-[18px]">
                <th className="px-1 border-r border-[#6aaabc] w-[35%] font-bold">Scrip</th>
                <th className="px-1 border-r border-[#6aaabc] text-right w-[25%] font-bold">MaxOrdQty</th>
                <th className="px-1 border-r border-[#6aaabc] text-right w-[25%] font-bold">MaxNetQty</th>
                <th className="px-1 text-right w-[15%] font-bold">NetQty</th>
              </tr>
            </thead>
            <tbody className="text-white text-[10px] font-bold font-sans">
              {(limits || []).map((row, idx) => (
                <tr key={row?.id || idx} className={`${idx % 2 === 0 ? 'bg-[#606060]' : 'bg-[#505050]'} hover:bg-[#707070] h-[16px]`}>
                  <td className="px-1 border-r border-gray-500 border-b border-gray-600/50 whitespace-nowrap">{row?.instrument}</td>
                  <td className="px-1 border-r border-gray-500 border-b border-gray-600/50 text-right">{row?.maxOrdQty}</td>
                  <td className="px-1 border-r border-gray-500 border-b border-gray-600/50 text-right">{row?.maxNetQty}</td>
                  <td className="px-1 border-b border-gray-600/50 text-right">-</td>
                </tr>
              ))}
              {/* Fill empty space */}
              {Array.from({ length: Math.max(0, 15 - limits.length) }).map((_, i) => (
                <tr key={`fill-${i}`} className={`${(limits.length + i) % 2 === 0 ? 'bg-[#606060]' : 'bg-[#505050]'} h-[16px]`}>
                  <td className="border-r border-gray-500 border-b border-gray-600/50"></td>
                  <td className="border-r border-gray-500 border-b border-gray-600/50"></td>
                  <td className="border-r border-gray-500 border-b border-gray-600/50"></td>
                  <td className="border-b border-gray-600/50"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Section */}
        <div className="border border-gray-500 shrink-0">
          <div className="bg-black text-white text-[12px] px-2 border-b border-gray-500 font-bold py-[2px]">
            RMS Exchange Timing
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gradient-to-b from-[#4a8a9a] to-[#2a5a6a] text-white text-[10px] font-bold whitespace-nowrap h-[18px]">
                <th className="px-1 border-r border-[#6aaabc] font-bold">Exchange</th>
                <th className="px-1 border-r border-[#6aaabc] text-right font-bold">Trade Start Time</th>
                <th className="px-1 text-right font-bold">Trade Close Time</th>
              </tr>
            </thead>
            <tbody className="text-white text-[10px] font-bold">
              {(exchangeTimings || []).map((et, idx) => (
                <tr key={et?.exch || idx} className={`${idx % 2 === 0 ? 'bg-[#606060]' : 'bg-[#505050]'} h-[16px]`}>
                  <td className="px-1 border-r border-gray-500 border-b border-gray-600/50">{et?.exch}</td>
                  <td className="px-1 border-r border-gray-500 border-b border-gray-600/50 text-right">{et?.start}</td>
                  <td className="px-1 border-b border-gray-600/50 text-right">{et?.close}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default RMSLimitDialog;

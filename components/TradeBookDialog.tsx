import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Square, Save } from 'lucide-react';
import { TradeRecord } from '../types';

interface TradeBookDialogProps {
  trades: TradeRecord[];
  onClose: () => void;
}

const TradeBookDialog: React.FC<TradeBookDialogProps> = ({ trades, onClose }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Center dialog initially
  useEffect(() => {
    const width = 1000;
    const height = 400;
    const startX = (window.innerWidth - width) / 2;
    const startY = (window.innerHeight - height) / 2;
    setPosition({ x: startX, y: startY });
  }, []);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  return (
    <div
      className="fixed z-[90] font-sans select-none shadow-[0_0_20px_rgba(0,0,0,0.8)] border-l border-r border-b border-gray-600 bg-[#333] w-full h-[calc(100vh-60px)] md:w-[1100px] md:h-[500px] max-md:!top-0 max-md:!left-0 flex flex-col pt-9 md:pt-0"
      style={{ top: position.y, left: position.x }}
    >
      {/* Title Bar */}
      <div
        className="h-7 bg-gradient-to-b from-[#a0a0a0] via-[#505050] to-[#303030] flex justify-between items-center px-2 border-b border-black cursor-move relative"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30"></div>
        <span className="text-white text-[13px] font-bold drop-shadow-md tracking-wide pl-1">Trade Book</span>

        <div className="flex space-x-1">
          {/* Minimize */}
          <button className="bg-gradient-to-b from-[#a0a0a0] to-[#505050] border border-[#303030] rounded-[2px] w-[20px] h-[18px] flex items-center justify-center hover:brightness-110">
            <Minus size={10} className="text-white" strokeWidth={4} />
          </button>
          {/* Maximize */}
          <button className="bg-gradient-to-b from-[#a0a0a0] to-[#505050] border border-[#303030] rounded-[2px] w-[20px] h-[18px] flex items-center justify-center hover:brightness-110">
            <Square size={8} className="text-white fill-current" />
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            className="bg-gradient-to-b from-[#ff8a8a] to-[#cd0000] border border-[#800000] rounded-[2px] w-[20px] h-[18px] flex items-center justify-center hover:brightness-110 active:brightness-90"
          >
            <X size={12} className="text-white drop-shadow-md" strokeWidth={4} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-9 bg-[#506070] border-b border-gray-600 flex items-center justify-end px-2">
        <button className="flex items-center space-x-1 bg-gradient-to-b from-[#3a5a7a] to-[#1e3a5a] text-white px-3 py-1 rounded-[3px] border border-[#102030] shadow-sm text-xs font-bold hover:brightness-110 active:translate-y-[1px]">
          <Save size={14} />
          <span>Save</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-black overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[1100px] md:min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-b from-[#4a8a9a] to-[#2a5a6a] text-white text-xs font-bold whitespace-nowrap">
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[60px]">Exch</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[60px]">Action</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[200px]">Scrip</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[80px] text-right">TQty</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[100px] text-right">TPrice</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[120px]">Account</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[80px] text-right">OID</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[80px] text-right">TID</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[80px] text-right">ETrdNum</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[140px] text-right">EOrdNum</th>
              <th className="py-1 px-2 w-[120px] text-right">TrdTime</th>
            </tr>
          </thead>
          <tbody className="text-white text-[13px] font-medium font-sans">
            {trades.map((trade, idx) => (
              <tr key={trade.id} className={`${idx % 2 === 0 ? 'bg-[#555555]' : 'bg-[#444444]'} hover:bg-[#666666]`}>
                <td className="py-[2px] px-2 border-r border-gray-500">{trade.exch}</td>
                <td className="py-[2px] px-2 border-r border-gray-500">{trade.action}</td>
                <td className="py-[2px] px-2 border-r border-gray-500">{trade.scrip}</td>
                <td className="py-[2px] px-2 border-r border-gray-500 text-right">{trade.tQty}</td>
                <td className="py-[2px] px-2 border-r border-gray-500 text-right">{trade.tPrice}</td>
                <td className="py-[2px] px-2 border-r border-gray-500">{trade.account}</td>
                <td className="py-[2px] px-2 border-r border-gray-500 text-right">{trade.oid}</td>
                <td className="py-[2px] px-2 border-r border-gray-500 text-right">{trade.tid}</td>
                <td className="py-[2px] px-2 border-r border-gray-500 text-right">{trade.eTrdNum}</td>
                <td className="py-[2px] px-2 border-r border-gray-500 text-right">{trade.eOrdNum}</td>
                <td className="py-[2px] px-2 text-right">{trade.trdTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeBookDialog;

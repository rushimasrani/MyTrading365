import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Square } from 'lucide-react';
import { NetPositionRecord, StockData } from '../types';

interface NetPositionDialogProps {
  positions: NetPositionRecord[];
  stocks: StockData[];
  onClose: () => void;
}

const NetPositionDialog: React.FC<NetPositionDialogProps> = ({ positions = [], stocks = [], onClose }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Center dialog initially
  useEffect(() => {
    const width = 900;
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

  // Calculate dynamic rows with M2M and totals
  let totalM2MNum = 0;
  let totalBuyNum = 0;
  let totalSellNum = 0;

  const displayPositions = positions.map(pos => {
    const stock = stocks.find(s => s.id === pos.token);
    const ltp = stock ? stock.ltp : 0;

    const buyVal = pos.bQty * pos.bAvg;
    const sellVal = pos.sQty * pos.sAvg;
    const m2m = sellVal - buyVal + (pos.nQty * ltp);

    totalBuyNum += buyVal;
    totalSellNum += sellVal;
    totalM2MNum += m2m;

    return { ...pos, m2m };
  });

  const formatMoney = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div
      className="fixed z-[90] font-sans select-none shadow-[0_0_20px_rgba(0,0,0,0.8)] border-l border-r border-b border-gray-600 bg-[#333] w-[900px] h-[400px] flex flex-col"
      style={{ top: position.y, left: position.x }}
    >
      {/* Title Bar */}
      <div
        className="h-7 bg-gradient-to-b from-[#a0a0a0] via-[#505050] to-[#303030] flex justify-between items-center px-2 border-b border-black cursor-move relative"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30"></div>
        <span className="text-white text-[13px] font-bold drop-shadow-md tracking-wide pl-1">Net Position</span>

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

      {/* Table Container */}
      <div className="flex-1 bg-[#555] overflow-auto border border-gray-500 m-[2px]">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-b from-[#4a8a9a] to-[#2a5a6a] text-white text-xs font-bold whitespace-nowrap">
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[60px]">Exch</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[200px]">Scrip</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[60px] text-right">BQty</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[80px] text-right">BAvg</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[60px] text-right">SQty</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[80px] text-right">SAvg</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[100px]">Account</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[60px] text-right">NQty</th>
              <th className="py-1 px-2 border-r border-[#6aaabc] w-[80px] text-right">NAvg</th>
              <th className="py-1 px-2 w-[80px] text-right">M2M</th>
            </tr>
          </thead>
          <tbody className="text-white text-[13px] font-bold font-sans">
            {displayPositions.map((pos, idx) => (
              <tr key={pos.id} className={`${idx % 2 === 0 ? 'bg-[#666666]' : 'bg-[#555555]'} hover:bg-[#777777]`}>
                <td className="py-[1px] px-2 border-r border-gray-500">{pos.exch}</td>
                <td className="py-[1px] px-2 border-r border-gray-500">{pos.scrip}</td>
                <td className="py-[1px] px-2 border-r border-gray-500 text-right">{pos.bQty}</td>
                <td className="py-[1px] px-2 border-r border-gray-500 text-right">{pos.bAvg.toFixed(4)}</td>
                <td className="py-[1px] px-2 border-r border-gray-500 text-right">{pos.sQty}</td>
                <td className="py-[1px] px-2 border-r border-gray-500 text-right">{pos.sAvg.toFixed(4)}</td>
                <td className="py-[1px] px-2 border-r border-gray-500">{pos.account}</td>
                <td className="py-[1px] px-2 border-r border-gray-500 text-right">{pos.nQty}</td>
                <td className="py-[1px] px-2 border-r border-gray-500 text-right">{pos.nQty !== 0 ? pos.nAvg.toFixed(4) : '0'}</td>
                <td className={`py-[1px] px-2 text-right ${pos.m2m > 0 ? 'text-green-400' : pos.m2m < 0 ? 'text-red-400' : ''}`}>
                  {pos.m2m !== 0 ? pos.m2m.toFixed(2) : '0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="h-6 bg-[#3b6b7b] border-t border-gray-600 flex items-center px-4 text-white text-[13px] font-bold justify-between">
        <div>
          <span className="mr-6">Total M2M: <span className={totalM2MNum > 0 ? 'text-green-400' : totalM2MNum < 0 ? 'text-red-400' : ''}>{formatMoney(totalM2MNum)}</span></span>
        </div>
        <div>
          <span className="mr-6">Total Buy: <span>{formatMoney(totalBuyNum)}</span></span>
          <span>Total Sell: <span>{formatMoney(totalSellNum)}</span></span>
        </div>
      </div>
    </div>
  );
};

export default NetPositionDialog;

import React, { useEffect, useRef, useState } from 'react';
import { StockData } from '../types';

const HighlightCell: React.FC<{ value: number | undefined; className?: string }> = ({ value, className = '' }) => {
  const prevValueRef = useRef<number | undefined>(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== undefined && prevValueRef.current !== undefined && value !== prevValueRef.current) {
      if (value > prevValueRef.current) {
        setFlash('up');
      } else if (value < prevValueRef.current) {
        setFlash('down');
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setFlash(null);
      }, 1000);
    }

    prevValueRef.current = value;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  const flashClass = flash === 'up'
    ? 'bg-green-700 text-white'
    : flash === 'down'
      ? 'bg-red-700 text-white'
      : '';

  return (
    <td className={`transition-colors duration-300 ${className} ${flashClass}`}>
      {value?.toFixed(2) || '0.00'}
    </td>
  );
};

interface MarketTableProps {
  data: StockData[];
  selectedIndex: number;
  onSelectRow: (index: number) => void;
  onDoubleClickRow?: (index: number) => void;
  onOrderAction?: (index: number, action: 'BUY' | 'SELL') => void;
}

const MarketTable: React.FC<MarketTableProps> = ({
  data,
  selectedIndex,
  onSelectRow,
  onDoubleClickRow,
  onOrderAction
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  // Auto-scroll to selected row if it goes out of view
  useEffect(() => {
    if (selectedIndex >= 0 && selectedRowRef.current && tableRef.current) {
      const tableRect = tableRef.current.getBoundingClientRect();
      const rowRect = selectedRowRef.current.getBoundingClientRect();

      if (rowRect.bottom > tableRect.bottom) {
        selectedRowRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
      } else if (rowRect.top < tableRect.top) {
        selectedRowRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="flex-1 w-full bg-black overflow-x-auto relative" ref={tableRef}>
      <table className="table-fixed w-full border-collapse text-left min-w-[900px] md:min-w-full">
        <thead className="sticky top-0 z-20">
          <tr className="bg-[#2a4d6e] text-white text-xs font-bold leading-normal">
            <th className="py-2 md:py-1 px-3 md:px-2 border-r border-gray-600 w-[240px] md:w-[150px] sticky left-0 bg-[#2a4d6e] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">DispName</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[80px]">LTP</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[80px]">Change</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[70px]">BQty</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[80px]">Bid</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[80px]">Ask</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[70px]">AQty</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[80px]">Open</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[80px]">High</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[80px]">Low</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[80px]">PClose</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right w-[90px]">Volume</th>
            <th className="py-1 px-2 text-right w-[80px]">Time</th>
          </tr>
        </thead>
        <tbody className="text-white text-sm font-medium font-mono">
          {data.map((row, index) => {
            const isSelected = index === selectedIndex;
            return (
              <tr
                key={row.id}
                ref={isSelected ? selectedRowRef : null}
                onClick={() => onSelectRow(index)}
                onDoubleClick={() => onDoubleClickRow && onDoubleClickRow(index)}
                className={`group cursor-pointer transition-colors duration-75 border-b border-[#333] ${isSelected ? 'bg-[#004080]' : 'hover:bg-[#1a2e40]'}`}
              >
                <td className={`py-1 md:py-1 px-2 md:px-2 border-r border-[#444] whitespace-nowrap sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] bg-black group-hover:bg-[#1a2e40] ${isSelected ? '!bg-[#004080]' : ''}`}>
                  <div className="flex justify-between items-center h-[40px] md:h-auto overflow-hidden">
                    <span className="truncate w-[110px] md:w-full font-bold md:font-normal" title={row.dispName}>{row.dispName}</span>
                    <div className="md:hidden flex space-x-[4px] shrink-0 h-full items-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOrderAction?.(index, 'BUY'); }}
                        className="bg-blue-600/90 active:bg-blue-600 border border-blue-500 rounded text-white text-[12px] font-bold w-[46px] h-[34px] flex items-center justify-center shadow-sm"
                      >
                        B
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onOrderAction?.(index, 'SELL'); }}
                        className="bg-red-600/90 active:bg-red-600 border border-red-500 rounded text-white text-[12px] font-bold w-[46px] h-[34px] flex items-center justify-center shadow-sm"
                      >
                        S
                      </button>
                    </div>
                  </div>
                </td>
                <HighlightCell value={row.ltp} className="py-1 px-2 border-r border-[#444] text-right" />
                <td className={`py-1 px-2 border-r border-[#444] text-right ${row.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {row.change?.toFixed(2) || '0.00'}
                </td>
                <td className="py-1 px-2 border-r border-[#444] text-right">{row.bQty}</td>
                <HighlightCell value={row.bid} className="py-1 px-2 border-r border-[#444] text-right" />
                <HighlightCell value={row.ask} className="py-1 px-2 border-r border-[#444] text-right" />
                <td className="py-1 px-2 border-r border-[#444] text-right">{row.aQty}</td>
                <td className="py-1 px-2 border-r border-[#444] text-right">{row.open?.toFixed(2) || '0.00'}</td>
                <td className="py-1 px-2 border-r border-[#444] text-right">{row.high?.toFixed(2) || '0.00'}</td>
                <td className="py-1 px-2 border-r border-[#444] text-right">{row.low?.toFixed(2) || '0.00'}</td>
                <td className="py-1 px-2 border-r border-[#444] text-right">{row.pClose?.toFixed(2) || '0.00'}</td>
                <td className="py-1 px-2 border-r border-[#444] text-right">{row.volume}</td>
                <td className="py-1 px-2 text-right text-xs text-gray-400">
                  {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : '-'}
                </td>
              </tr>
            );
          })}
          {/* Fill remaining space with empty rows to simulate the grid look */}
          {Array.from({ length: 20 }).map((_, i) => (
            <tr key={`empty-${i}`} className="hover:bg-[#1a2e40] group">
              <td className="py-3 md:py-1 px-3 md:px-2 border-r border-[#333] text-transparent select-none sticky left-0 bg-black group-hover:bg-[#1a2e40] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">.</td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2 border-r border-[#333]"></td>
              <td className="py-1 px-2"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MarketTable;
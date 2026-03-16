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
}

const MarketTable: React.FC<MarketTableProps> = ({ data, selectedIndex, onSelectRow, onDoubleClickRow }) => {
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
    <div className="flex-1 w-full bg-black overflow-auto relative" ref={tableRef}>
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#2a4d6e] text-white text-xs font-bold leading-normal">
            <th className="py-1 px-2 border-r border-gray-600 min-w-[150px]">DispName</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">LTP</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">Change</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">BQty</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">Bid</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">Ask</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">AQty</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">Open</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">High</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">Low</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">PClose</th>
            <th className="py-1 px-2 border-r border-gray-600 text-right">Volume</th>
            <th className="py-1 px-2 text-right">Time</th>
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
                className={`cursor-pointer transition-colors duration-75 border-b border-[#333] ${isSelected ? 'bg-[#004080]' : 'hover:bg-[#1a2e40]'
                  }`}
              >
                <td className="py-1 px-2 border-r border-[#444] whitespace-nowrap">{row.dispName}</td>
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
            <tr key={`empty-${i}`} className="hover:bg-[#1a2e40]">
              <td className="py-1 px-2 border-r border-[#333] text-transparent select-none">.</td>
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
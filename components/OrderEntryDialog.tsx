import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { StockData } from '../types';

interface OrderEntryDialogProps {
  stock?: StockData;
  accountName: string;
  defaultAction?: 'BUY' | 'SELL';
  onExecute: (type: 'BUY' | 'SELL', qty: number, price: number, orderType: 'MARKET' | 'LIMIT') => void;
  onClose: () => void;
}

const OrderEntryDialog: React.FC<OrderEntryDialogProps> = ({ 
  stock, accountName, defaultAction = 'BUY', onExecute, onClose 
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
  const [action, setAction] = useState<'BUY' | 'SELL'>(defaultAction);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [qty, setQty] = useState<string>('');
  const [rate, setRate] = useState<string>('0.00');
  const [dQty, setDQty] = useState<string>('0');

  useEffect(() => {
    setAction(defaultAction);
  }, [defaultAction]);

  useEffect(() => {
    if (orderType === 'LIMIT' && stock) {
      if (action === 'BUY') {
        setRate(stock.ask ? stock.ask.toFixed(2) : stock.ltp.toFixed(2));
      } else {
        setRate(stock.bid ? stock.bid.toFixed(2) : stock.ltp.toFixed(2));
      }
    } else if (orderType === 'MARKET') {
      setRate('0.00');
    }
  }, [orderType, action, stock]);

  useEffect(() => {
    // Initial centering
    const width = 850;
    const height = 100;
    const startX = (window.innerWidth - width) / 2;
    const startY = (window.innerHeight - height) / 2;
    setPosition({ x: startX, y: startY });
  }, []);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleExecute = () => {
    const parsedQty = parseInt(qty, 10);
    const parsedRate = parseFloat(rate);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert("Invalid Quantity");
      return;
    }
    
    if (orderType === 'LIMIT' && (isNaN(parsedRate) || parsedRate <= 0)) {
       alert("Invalid Limit Rate");
       return;
    }

    onExecute(action, parsedQty, orderType === 'LIMIT' ? parsedRate : 0, orderType);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const bgColor = action === 'BUY' ? 'bg-[#0000ff]' : 'bg-[#d8001c]';

  const SelectCaret = () => (
    <div className="absolute right-0 top-[4px] pointer-events-none text-white">
      <ChevronDown size={14} strokeWidth={3} />
    </div>
  );

  return (
    <div
      className="fixed z-[100] font-sans shadow-[2px_2px_15px_rgba(0,0,0,0.6)] flex flex-col w-[820px] border-[3px] border-[#555] rounded-[2px]"
      style={{ top: position.y, left: position.x }}
    >
      {/* Title Bar */}
      <div
        className="h-6 w-full bg-gradient-to-b from-[#888] via-[#666] to-[#444] flex justify-between items-center px-[3px] py-[1px] cursor-move relative border-b border-black"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30 pointer-events-none"></div>
        <span className="text-white text-[12px] font-bold drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)] ml-1">
          Buy/Sell
        </span>
        <button
          onClick={onClose}
          className="w-[20px] h-[16px] bg-gradient-to-b from-[#ff8888] to-[#cc0000] border border-[#a00000] rounded-[2px] flex items-center justify-center hover:brightness-110 shadow-inner z-10"
        >
          <X size={12} className="text-white stroke-[3px]" />
        </button>
      </div>

      {/* Main Content */}
      <div className={`p-2 pb-[14px] px-[14px] ${bgColor} flex flex-col justify-start border border-[#00b0f0] border-opacity-30 border-t-transparent`}>
        {/* Header Labels */}
        <div className="flex text-white text-[12px] font-sans mb-[2px] w-full gap-[10px]">
          <div className="w-[60px]">Type</div>
          <div className="w-[70px]">Exch</div>
          <div className="w-[180px]">Symbol</div>
          <div className="w-[60px]">Qty</div>
          <div className="w-[85px]">Ord Type</div>
          <div className="w-[80px]">Rate</div>
          <div className="w-[50px]">D.Qty</div>
          <div className="w-[110px]">Account</div>
          <div className="flex-1"></div>
        </div>

        {/* Input Fields Row */}
        <div className="flex text-white text-[13px] font-sans w-full gap-[10px] items-center">
          
          {/* Type */}
          <div className="relative w-[60px]">
            <select 
              value={action} 
              onChange={(e) => setAction(e.target.value as 'BUY' | 'SELL')}
              className="w-full appearance-none bg-transparent text-white border-b-[1.5px] border-white outline-none cursor-pointer text-[13px] leading-tight pb-[1px] relative z-10 font-medium"
            >
              <option className="text-black bg-white">BUY</option>
              <option className="text-black bg-white">SELL</option>
            </select>
            <SelectCaret />
          </div>

          {/* Exch */}
          <div className="relative w-[70px]">
            <select 
              value={stock?.exchange || 'FONSE'}
              disabled
              className="w-full appearance-none bg-transparent text-white border-b-[1.5px] border-white outline-none text-[13px] leading-tight pb-[1px] relative z-10 opacity-100 font-medium"
            >
              <option className="text-black bg-white" value="FONSE">FONSE</option>
              <option className="text-black bg-white" value="NSE">NSE</option>
              <option className="text-black bg-white" value="MCX">MCX</option>
            </select>
            <SelectCaret />
          </div>

          {/* Symbol */}
          <div className="w-[180px]">
            <input 
              type="text" 
              readOnly 
              value={stock?.symbol || ''} 
              className="w-full bg-transparent text-white border-b-[1.5px] border-white outline-none text-[13px] leading-tight pb-[1px] font-medium"
            />
          </div>

          {/* Qty */}
          <div className="w-[60px]">
            <input 
              type="number" 
              value={qty}
              autoFocus
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white text-black border-2 border-gray-400 rounded-[4px] shadow-inner mb-[2px] outline-none text-right text-[13px] leading-[18px] px-1 font-medium"
            />
          </div>

          {/* Ord Type */}
          <div className="relative w-[85px]">
            <select 
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as 'MARKET' | 'LIMIT')}
              className="w-full appearance-none bg-transparent text-white border-b-[1.5px] border-white outline-none cursor-pointer text-[13px] leading-tight pb-[1px] relative z-10 font-medium"
            >
              <option className="text-black bg-white" value="MARKET">MARKET</option>
              <option className="text-black bg-white" value="LIMIT">LIMIT</option>
            </select>
            <SelectCaret />
          </div>

          {/* Rate */}
          <div className="w-[80px]">
            <input 
              type="text" 
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={orderType === 'MARKET'}
              className={`w-full outline-none text-right text-[13px] leading-[18px] px-1 font-medium ${
                orderType === 'MARKET' 
                  ? 'bg-transparent text-[#999] border-b-[1.5px] border-[#666]' 
                  : 'bg-white text-black border-2 border-gray-400 rounded-[4px] shadow-inner mb-[2px]'
              }`}
            />
          </div>

          {/* D.Qty */}
          <div className="w-[50px]">
            <input 
              type="number" 
              value={dQty}
              onChange={(e) => setDQty(e.target.value)}
              className="w-full bg-transparent text-white border-b-[1.5px] border-white outline-none text-right text-[13px] leading-tight pb-[1px] font-medium"
            />
          </div>

          {/* Account */}
          <div className="relative w-[110px]">
            <select 
              disabled
              className="w-full appearance-none bg-transparent text-white border-b-[1.5px] border-white outline-none text-[13px] leading-tight pb-[1px] relative z-10 opacity-100 font-medium"
            >
              <option className="text-black bg-white">{accountName}</option>
            </select>
            <SelectCaret />
          </div>

          {/* Execute Button */}
          <div className="flex-1 flex justify-end">
            <button 
              onClick={handleExecute}
              disabled={!stock || qty === ''}
              className={`px-4 h-[28px] font-bold text-white rounded-[4px] shadow-[0_2px_4px_rgba(0,0,0,0.5)] border ${
                stock && qty !== ''
                  ? 'bg-gradient-to-b from-[#4fa0ff] via-[#1a75ff] to-[#004e9c] border-[#002f5e] hover:brightness-110 active:brightness-90 cursor-pointer text-shadow-sm' 
                  : 'bg-gradient-to-b from-[#666] to-[#444] border-[#333] cursor-not-allowed opacity-70 text-gray-300'
              }`}
            >
              Execute
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderEntryDialog;

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { StockData } from '../types';

interface OrderDialogProps {
  type: 'BUY' | 'SELL';
  stock: StockData;
  onClose: () => void;
  onOrder: (qty: string, price: string) => void;
}

const OrderDialog: React.FC<OrderDialogProps> = ({ type, stock, onClose, onOrder }) => {
  const qtyRef = useRef<HTMLInputElement>(null);
  
  // Draggable State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Center dialog initially
  useEffect(() => {
    const width = 850;
    const height = 180;
    const startX = (window.innerWidth - width) / 2;
    const startY = (window.innerHeight - height) / 2;
    setPosition({ x: startX, y: startY });

    if (qtyRef.current) {
      qtyRef.current.focus();
      qtyRef.current.select();
    }
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
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag if clicking close button
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleExecute = () => {
    const qty = qtyRef.current?.value || "0";
    // Mock price for log, in real app this might come from Limit input or LTP
    const price = stock.ltp.toFixed(2); 
    onOrder(qty, price);
    onClose();
  };

  const bgColor = type === 'BUY' ? 'bg-[#0000FF]' : 'bg-[#CC0000]';

  return (
    <div 
      className="fixed z-[100] font-sans select-none shadow-[0_5px_15px_rgba(0,0,0,0.5)] rounded-t-lg overflow-hidden w-[820px]"
      style={{ top: position.y, left: position.x }}
    >
      {/* Retro Metallic Title Bar */}
      <div 
        className="h-[30px] bg-gradient-to-b from-[#b0b0b0] via-[#505050] to-[#303030] flex justify-between items-center px-2 border-b border-black cursor-move relative"
        onMouseDown={handleMouseDown}
      >
        {/* Top shine effect for metallic look */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30"></div>
        
        <span className="text-white text-[13px] font-bold drop-shadow-md tracking-wide">Buy/Sell</span>
        
        <button 
          onClick={onClose}
          className="bg-gradient-to-b from-[#ff9999] via-[#cc0000] to-[#990000] border border-[#660000] rounded-[3px] w-[22px] h-[18px] flex items-center justify-center hover:brightness-110 active:brightness-90 shadow-sm"
        >
          <X size={14} className="text-white drop-shadow-md stroke-[3px]" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className={`${bgColor} p-[10px] border-l border-r border-b border-gray-600`}>
        {/* Inner Border Box */}
        <div className="border border-white/40 rounded-[4px] px-3 pt-2 pb-5 relative">
          
          {/* Header Labels Row */}
          <div className="flex text-white text-[13px] font-bold mb-1">
            <div className="w-[80px]">Type</div>
            <div className="w-[80px]">Exch</div>
            <div className="w-[200px]">Symbol</div>
            <div className="w-[90px]">Qty</div>
            <div className="w-[110px] pl-4">Ord Type</div>
            <div className="w-[100px] text-right">Rate</div>
            <div className="w-[80px] text-right">D.Qty</div>
            <div className="flex-1 pl-6">Account</div>
          </div>

          {/* Input/Value Row */}
          <div className="flex items-end text-white text-[13px] font-bold leading-tight">
            
            {/* Type */}
            <div className="w-[80px] border-b-[2px] border-white/80 mr-2 pb-[2px] flex justify-between items-center cursor-pointer group">
              <span>{type}</span>
              <span className="text-[10px] transform scale-x-150 relative top-[1px]">▼</span>
            </div>

            {/* Exch */}
            <div className="w-[80px] border-b-[2px] border-white/80 mr-2 pb-[2px] flex justify-between items-center cursor-pointer">
              <span>FONSE</span>
              <span className="text-[10px] transform scale-x-150 relative top-[1px]">▼</span>
            </div>

            {/* Symbol */}
            <div className="w-[200px] border-b-[2px] border-white/80 mr-2 pb-[2px] truncate">
              {stock.dispName}
            </div>

            {/* Qty Input - Standard White Box */}
            <div className="w-[90px] mr-2">
              <input 
                ref={qtyRef}
                type="text" 
                defaultValue={stock.bQty || "50"}
                className="w-full h-[22px] bg-white text-black text-right px-1 text-[13px] font-bold outline-none border-t-[2px] border-l-[2px] border-[#888] border-b border-r border-[#eee] focus:bg-[#ffffcc] selection:bg-[#3399ff] selection:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecute();
                  if (e.key === 'Escape') onClose();
                }}
              />
            </div>

            {/* Ord Type */}
            <div className="w-[110px] pl-4 border-b-[2px] border-white/80 mr-2 pb-[2px] flex justify-between items-center cursor-pointer">
              <span>MARKET</span>
              <span className="text-[10px] transform scale-x-150 relative top-[1px]">▼</span>
            </div>

            {/* Rate */}
            <div className="w-[100px] text-right border-b-[2px] border-white/80 mr-2 pb-[2px] text-gray-200">
              0.00
            </div>

            {/* D.Qty */}
            <div className="w-[80px] text-right border-b-[2px] border-white/80 mr-2 pb-[2px]">
              0
            </div>

            {/* Account & Execute Button */}
            <div className="flex-1 pl-6 flex items-end justify-between">
              <div className="flex-1 border-b-[2px] border-white/80 mr-4 pb-[2px] flex justify-between items-center cursor-pointer">
                <span>JLRVTRVI01</span>
                <span className="text-[10px] transform scale-x-150 relative top-[1px]">▼</span>
              </div>
              
              {/* Glossy Blue Execute Button */}
              <button 
                className="bg-gradient-to-b from-[#5c9dff] via-[#1f66cc] to-[#144ba3] text-white border border-[#0f3c85] rounded-[3px] px-5 py-[2px] text-[13px] font-normal shadow-[0_1px_2px_rgba(0,0,0,0.5)] hover:brightness-110 active:translate-y-[1px]"
                onClick={handleExecute}
              >
                Execute
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDialog;

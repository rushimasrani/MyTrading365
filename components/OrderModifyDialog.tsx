import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Square, Save } from 'lucide-react';
import { OrderRecord } from '../types';

interface OrderModifyDialogProps {
    order: OrderRecord;
    onClose: () => void;
    onModify: (id: string, price: number, quantity: number) => void;
}

const OrderModifyDialog: React.FC<OrderModifyDialogProps> = ({ order, onClose, onModify }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const [price, setPrice] = useState(order.oPrice.toString());
    const [qty, setQty] = useState(order.oQty.toString());

    useEffect(() => {
        const width = 400;
        const height = 200;
        setPosition({
            x: (window.innerWidth - width) / 2,
            y: (window.innerHeight - height) / 2,
        });
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
        };
        const handleMouseUp = () => { isDragging.current = false; };
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
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleSubmit = () => {
        const p = parseFloat(price);
        const q = parseInt(qty, 10);
        if (isNaN(p) || p <= 0) { alert('Invalid price'); return; }
        if (isNaN(q) || q <= 0) { alert('Invalid quantity'); return; }
        onModify(order.id, p, q);
        onClose();
    };

    return (
        <div
            className="fixed z-[110] font-sans select-none shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-gray-600 bg-[#2a2a2a] w-[400px] flex flex-col rounded-t-lg"
            style={{ top: position.y, left: position.x }}
        >
            {/* Title Bar */}
            <div
                className="h-7 bg-gradient-to-b from-[#a0a0a0] via-[#505050] to-[#303030] flex justify-between items-center px-2 border-b border-black cursor-move relative rounded-t-lg"
                onMouseDown={handleMouseDown}
            >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30"></div>
                <span className="text-white text-[13px] font-bold drop-shadow-md tracking-wide pl-1">Modify Order — {order.scrip}</span>
                <button
                    onClick={onClose}
                    className="bg-gradient-to-b from-[#ff8a8a] to-[#cd0000] border border-[#800000] rounded-[2px] w-[20px] h-[18px] flex items-center justify-center hover:brightness-110"
                >
                    <X size={12} className="text-white drop-shadow-md" strokeWidth={4} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col space-y-3">
                <div className="flex items-center space-x-3">
                    <label className="text-gray-300 text-xs w-20">Limit Price</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        autoFocus
                        className="flex-1 bg-white text-black text-right text-[13px] px-2 py-1 border-2 border-gray-400 rounded shadow-inner outline-none focus:bg-[#ffffcc] font-mono"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
                    />
                </div>
                <div className="flex items-center space-x-3">
                    <label className="text-gray-300 text-xs w-20">Quantity</label>
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="flex-1 bg-white text-black text-right text-[13px] px-2 py-1 border-2 border-gray-400 rounded shadow-inner outline-none focus:bg-[#ffffcc] font-mono"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
                    />
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-gray-400">
                    <span className="w-20"></span>
                    <span>Current: {order.action} {order.oQty} @ {order.oPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                    <button
                        onClick={onClose}
                        className="px-4 py-1 bg-gradient-to-b from-[#666] to-[#444] text-white text-xs border border-[#333] rounded hover:brightness-110"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-1 bg-gradient-to-b from-[#4fa0ff] via-[#1a75ff] to-[#004e9c] text-white text-xs font-bold border border-[#002f5e] rounded hover:brightness-110 shadow-sm"
                    >
                        Modify
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderModifyDialog;

import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Square, Save } from 'lucide-react';
import { OrderRecord } from '../types';
import OrderModifyDialog from './OrderModifyDialog';

interface OrderBookDialogProps {
    orders: OrderRecord[];
    onClose: () => void;
    onCancelOrder: (id: string) => void;
    onModifyOrder: (id: string, price: number, quantity: number) => void;
}

const OrderBookDialog: React.FC<OrderBookDialogProps> = ({ orders, onClose, onCancelOrder, onModifyOrder }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const [modifyingOrder, setModifyingOrder] = useState<OrderRecord | null>(null);

    useEffect(() => {
        const width = 1200;
        const height = 500;
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

    const statusColor = (status: string) => {
        switch (status) {
            case 'EXECUTED': return 'text-green-400';
            case 'PENDING': return 'text-yellow-300';
            case 'CANCELLED': return 'text-red-400';
            case 'REJECTED': return 'text-red-500';
            default: return 'text-white';
        }
    };

    const actionColor = (action: string) => {
        return action === 'BUY' ? 'text-blue-300' : 'text-red-300';
    };

    return (
        <>
            <div
                className="fixed z-[90] font-sans select-none shadow-[0_0_20px_rgba(0,0,0,0.8)] border-l border-r border-b border-gray-600 bg-[#333] w-[1200px] h-[500px] flex flex-col"
                style={{ top: position.y, left: position.x }}
            >
                {/* Title Bar */}
                <div
                    className="h-7 bg-gradient-to-b from-[#a0a0a0] via-[#505050] to-[#303030] flex justify-between items-center px-2 border-b border-black cursor-move relative"
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30"></div>
                    <span className="text-white text-[13px] font-bold drop-shadow-md tracking-wide pl-1">Order Book</span>
                    <div className="flex space-x-1">
                        <button className="bg-gradient-to-b from-[#a0a0a0] to-[#505050] border border-[#303030] rounded-[2px] w-[20px] h-[18px] flex items-center justify-center hover:brightness-110">
                            <Minus size={10} className="text-white" strokeWidth={4} />
                        </button>
                        <button className="bg-gradient-to-b from-[#a0a0a0] to-[#505050] border border-[#303030] rounded-[2px] w-[20px] h-[18px] flex items-center justify-center hover:brightness-110">
                            <Square size={8} className="text-white fill-current" />
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-gradient-to-b from-[#ff8a8a] to-[#cd0000] border border-[#800000] rounded-[2px] w-[20px] h-[18px] flex items-center justify-center hover:brightness-110 active:brightness-90"
                        >
                            <X size={12} className="text-white drop-shadow-md" strokeWidth={4} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="h-9 bg-[#506070] border-b border-gray-600 flex items-center justify-between px-2">
                    <div className="text-[11px] text-gray-300 font-medium pl-1">
                        Total: {orders.length} | Pending: {orders.filter(o => o.status === 'PENDING').length} | Executed: {orders.filter(o => o.status === 'EXECUTED').length} | Rejected: {orders.filter(o => o.status === 'REJECTED').length}
                    </div>
                    <button className="flex items-center space-x-1 bg-gradient-to-b from-[#3a5a7a] to-[#1e3a5a] text-white px-3 py-1 rounded-[3px] border border-[#102030] shadow-sm text-xs font-bold hover:brightness-110 active:translate-y-[1px]">
                        <Save size={14} />
                        <span>Save</span>
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 bg-black overflow-auto">
                    <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-b from-[#4a8a9a] to-[#2a5a6a] text-white text-[11px] font-bold whitespace-nowrap">
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[50px] text-center">Modify</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[50px] text-center">Cancel</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[50px]">Exch</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[50px]">Action</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[160px]">Scrip</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[50px] text-right">OQty</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[50px] text-right">RQty</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[75px] text-right">OPrice</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[75px]">Status</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[90px]">Account</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[50px] text-right">TQty</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[50px] text-right">DQty</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[60px] text-right">DRemQty</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[70px] text-right">SLPrice</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[55px]">OType</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[45px]">OTerm</th>
                                <th className="py-1 px-1 border-r border-[#6aaabc] w-[80px] text-right">Blocked</th>
                                <th className="py-1 px-1 w-[200px]">Remark</th>
                            </tr>
                        </thead>
                        <tbody className="text-white text-[12px] font-medium font-sans">
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={19} className="py-8 text-center text-gray-500 text-sm">No orders placed yet</td>
                                </tr>
                            )}
                            {orders.map((order, idx) => (
                                <tr key={order.id} className={`${idx % 2 === 0 ? 'bg-[#555555]' : 'bg-[#444444]'} hover:bg-[#666666]`}>
                                    {/* Modify */}
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-center">
                                        {order.status === 'PENDING' ? (
                                            <button
                                                onClick={() => setModifyingOrder(order)}
                                                className="bg-gradient-to-b from-[#4a7a9a] to-[#2a5a7a] text-white text-[10px] px-2 py-[1px] rounded border border-[#1a3a5a] hover:brightness-110 font-bold"
                                            >
                                                M
                                            </button>
                                        ) : (
                                            <span className="text-gray-600 text-[10px]">—</span>
                                        )}
                                    </td>
                                    {/* Cancel */}
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-center">
                                        {order.status === 'PENDING' ? (
                                            <button
                                                onClick={() => onCancelOrder(order.id)}
                                                className="bg-gradient-to-b from-[#cc4444] to-[#992222] text-white text-[10px] px-2 py-[1px] rounded border border-[#771111] hover:brightness-110 font-bold"
                                            >
                                                C
                                            </button>
                                        ) : (
                                            <span className="text-gray-600 text-[10px]">—</span>
                                        )}
                                    </td>
                                    <td className="py-[2px] px-1 border-r border-gray-500">{order.exch}</td>
                                    <td className={`py-[2px] px-1 border-r border-gray-500 font-bold ${actionColor(order.action)}`}>{order.action}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500">{order.scrip}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-right">{order.oQty}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-right">{order.rQty}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-right font-mono">{order.oPrice > 0 ? order.oPrice.toFixed(2) : '—'}</td>
                                    <td className={`py-[2px] px-1 border-r border-gray-500 font-bold ${statusColor(order.status)}`}>{order.status}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500">{order.account}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-right">{order.tQty}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-right">{order.dQty}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-right">{order.dRemQty}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-right font-mono">{order.slPrice > 0 ? order.slPrice.toFixed(2) : '0.00'}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500">{order.oType}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500">{order.oTerm}</td>
                                    <td className="py-[2px] px-1 border-r border-gray-500 text-right font-mono">
                                        {order.blockedMargin > 0 ? (
                                            <span className="text-yellow-300">₹{order.blockedMargin.toFixed(0)}</span>
                                        ) : '—'}
                                    </td>
                                    <td className="py-[2px] px-1 text-[11px]">
                                        {order.rejectReason ? (
                                            <span className="text-red-400" title={order.rejectReason}>{order.rejectReason.substring(0, 40)}{order.rejectReason.length > 40 ? '...' : ''}</span>
                                        ) : order.status === 'PENDING' ? (
                                            <span className="text-gray-400">Margin blocked</span>
                                        ) : order.status === 'EXECUTED' ? (
                                            <span className="text-green-400/60">Filled</span>
                                        ) : order.status === 'CANCELLED' ? (
                                            <span className="text-gray-500">User cancelled</span>
                                        ) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modifyingOrder && (
                <OrderModifyDialog
                    order={modifyingOrder}
                    onClose={() => setModifyingOrder(null)}
                    onModify={(id, price, quantity) => {
                        onModifyOrder(id, price, quantity);
                        setModifyingOrder(null);
                    }}
                />
            )}
        </>
    );
};

export default OrderBookDialog;

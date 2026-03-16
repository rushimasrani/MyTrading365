import React, { useState, useEffect } from 'react';
import { User, RMSRecord } from '../types';
import { X, Trash2 } from 'lucide-react';

interface ClientRMSPanelProps {
    client: User;
    onClose: () => void;
}

const ClientRMSPanel: React.FC<ClientRMSPanelProps> = ({ client, onClose }) => {
    const [limits, setLimits] = useState<RMSRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        instrument: 'ALL',
        exchange: 'NSE',
        maxOrdQty: 0,
        maxNetQty: 0,
        tradeStart: '09:00:00',
        tradeEnd: '23:55:00'
    });

    const fetchLimits = async () => {
        try {
            const res = await fetch(`/api/admin/clients/${client.id}/rms-limits`);
            const data = await res.json();
            setLimits(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLimits();
    }, [client.id]);

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch(`/api/admin/clients/${client.id}/rms-limits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            fetchLimits();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteRule = async (id: string | number) => {
        if (!window.confirm('Are you sure you want to delete this rule?')) return;
        try {
            await fetch(`/api/admin/rms-limits/${id}`, {
                method: 'DELETE'
            });
            fetchLimits();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
            <div className="bg-gray-800 text-white w-[800px] rounded-lg shadow-xl border border-gray-600 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">RMS Limits for {client.username}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <form onSubmit={handleAddRule} className="grid grid-cols-7 gap-3 mb-6 items-end bg-gray-900 p-3 rounded border border-gray-700 text-sm">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Exchange</label>
                            <input type="text" value={form.exchange} onChange={e => setForm({ ...form, exchange: e.target.value.toUpperCase() })} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 uppercase" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Instrument</label>
                            <input type="text" value={form.instrument} onChange={e => setForm({ ...form, instrument: e.target.value.toUpperCase() })} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 uppercase" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Max Ord Qty</label>
                            <input type="number" min="0" value={form.maxOrdQty} onChange={e => setForm({ ...form, maxOrdQty: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Max Net Qty</label>
                            <input type="number" min="0" value={form.maxNetQty} onChange={e => setForm({ ...form, maxNetQty: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Trade Start</label>
                            <input type="time" step="1" value={form.tradeStart} onChange={e => setForm({ ...form, tradeStart: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Trade End</label>
                            <input type="time" step="1" value={form.tradeEnd} onChange={e => setForm({ ...form, tradeEnd: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1" required />
                        </div>
                        <div>
                            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 py-1 rounded font-bold transition">Add Rule</button>
                        </div>
                    </form>

                    <div className="border border-gray-700 rounded overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-3 py-2">Exchange</th>
                                    <th className="px-3 py-2">Instrument</th>
                                    <th className="px-3 py-2 text-right">Max Ord Qty</th>
                                    <th className="px-3 py-2 text-right">Max Net Qty</th>
                                    <th className="px-3 py-2 text-center">Trade Timings</th>
                                    <th className="px-3 py-2 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {limits.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-4 text-center text-gray-400">No custom RMS limits applied. Unrestricted trading allowed.</td>
                                    </tr>
                                ) : limits.map(rule => (
                                    <tr key={rule.id} className="border-t border-gray-700 bg-gray-800 hover:bg-gray-750">
                                        <td className="px-3 py-2 font-mono text-blue-300">{rule.exchange}</td>
                                        <td className="px-3 py-2 font-mono text-purple-300">{rule.instrument}</td>
                                        <td className="px-3 py-2 text-right font-mono">{rule.maxOrdQty}</td>
                                        <td className="px-3 py-2 text-right font-mono">{rule.maxNetQty}</td>
                                        <td className="px-3 py-2 text-center text-xs text-gray-300">{rule.tradeStart} - {rule.tradeEnd}</td>
                                        <td className="px-3 py-2 text-center">
                                            <button onClick={() => handleDeleteRule(rule.id!)} className="p-1 bg-red-600 hover:bg-red-700 rounded transition text-white">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientRMSPanel;

import React, { useState, useEffect } from 'react';
import { User, NetPositionRecord, StockData } from '../types';
import { useMarketData } from '../hooks/useMarketData';
import NetPositionDialog from './NetPositionDialog';
import ClientRMSPanel from './ClientRMSPanel';

interface AdminDashboardProps {
    onLogout: () => void;
    token: string;
    delegateMasterId?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, token, delegateMasterId }) => {
    const getAuthHeaders = () => {
        return { 'Authorization': `Bearer ${token}` };
    };

    const getJsonAuthHeaders = () => ({
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
    });

    const getUrl = (path: string) => {
        if (!delegateMasterId) return path;
        const separator = path.includes('?') ? '&' : '?';
        return `${path}${separator}masterId=${delegateMasterId}`;
    };

    const [clients, setClients] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshingInstruments, setIsRefreshingInstruments] = useState(false);

    // New Client Form State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newCapital, setNewCapital] = useState(0);

    // Password Reset State
    const [resetClientId, setResetClientId] = useState<string | null>(null);
    const [resetPassword, setResetPassword] = useState('');

    const [rmsPanelClient, setRmsPanelClient] = useState<User | null>(null);

    // Positions View State
    const [viewedClientId, setViewedClientId] = useState<string | null>(null);
    const [clientPositions, setClientPositions] = useState<NetPositionRecord[]>([]);

    const { stocks, setStocks, subscribe } = useMarketData([]);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await fetch(getUrl('/api/admin/clients'), {
                headers: getAuthHeaders()
            });
            if (res.status === 401) {
                onLogout();
                return;
            }
            if (!res.ok) {
                console.error("Failed to fetch clients");
                return;
            }
            const data: User[] = await res.json();

            if (!Array.isArray(data)) {
                console.error("API did not return an array of clients:", data);
                setClients([]);
                return;
            }

            setClients(data);

            // Subscribe to all active position tokens across all clients to ensure live Equity streaming
            const allTokens = new Set<string>();
            const newStocks: StockData[] = [];

            data.forEach(c => {
                c.positions?.forEach(p => {
                    if (!allTokens.has(p.token) && p.nQty !== 0) {
                        allTokens.add(p.token);
                        newStocks.push({
                            id: p.token,
                            symbol: p.scrip,
                            exchange: p.exch,
                            dispName: p.scrip,
                            ltp: 0, change: 0, bQty: 0, bid: 0, ask: 0, aQty: 0,
                            open: 0, high: 0, low: 0, pClose: 0, volume: 0
                        });
                    }
                });
            });

            if (newStocks.length > 0) {
                setStocks(newStocks);
                subscribe(Array.from(allTokens));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshInstruments = async () => {
        if (!window.confirm("Are you sure you want to refresh the instrument master? This will download the latest file from Upstox and update the database.")) return;

        setIsRefreshingInstruments(true);
        try {
            const res = await fetch(getUrl('/api/admin/refresh-instruments'), {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
            } else {
                alert("Error: " + data.error);
            }
        } catch (e: any) {
            console.error(e);
            alert("Failed to reach the server.");
        } finally {
            setIsRefreshingInstruments(false);
        }
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(getUrl('/api/admin/clients'), {
                method: 'POST',
                headers: getJsonAuthHeaders(),
                body: JSON.stringify({ username: newUsername, password: newPassword, capital: newCapital })
            });
            if (res.ok) {
                setShowCreateModal(false);
                setNewUsername('');
                setNewPassword('');
                setNewCapital(0);
                fetchClients();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to create client');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleStatus = async (client: User) => {
        const newStatus = client.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        try {
            await fetch(getUrl(`/api/admin/clients/${client.id}`), {
                method: 'PUT',
                headers: getJsonAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });
            fetchClients();
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateCapital = async (client: User) => {
        const amount = prompt(`Enter new total capital for ${client.username}:`, client.capital.toString());
        if (amount !== null && !isNaN(Number(amount))) {
            try {
                await fetch(getUrl(`/api/admin/clients/${client.id}`), {
                    method: 'PUT',
                    headers: getJsonAuthHeaders(),
                    body: JSON.stringify({ capital: Number(amount), totalCapital: Number(amount) })
                });
                fetchClients();
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleUpdateAllocatedM2M = async (client: User) => {
        const amount = prompt(`Enter Allocated M2M limit for ${client.username}:`, (client.allocatedM2m || 0).toString());
        if (amount !== null && !isNaN(Number(amount))) {
            try {
                await fetch(getUrl(`/api/admin/clients/${client.id}`), {
                    method: 'PUT',
                    headers: getJsonAuthHeaders(),
                    body: JSON.stringify({ allocatedM2m: Number(amount) })
                });
                fetchClients();
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleSquareOff = async (client: User) => {
        if (!window.confirm(`Are you sure you want to square off all open positions for ${client.username}?`)) return;
        try {
            const res = await fetch(getUrl(`/api/admin/clients/${client.id}/squareoff`), {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Successfully squared off ${data.squaredOffCount} positions.`);
                if (viewedClientId === client.id) {
                    handleViewPositions(client);
                }
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to square off positions');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetClientId) return;

        try {
            const res = await fetch(getUrl(`/api/admin/clients/${resetClientId}`), {
                method: 'PUT',
                headers: getJsonAuthHeaders(),
                body: JSON.stringify({ password: resetPassword })
            });
            if (res.ok) {
                alert('Password reset successfully.');
                setResetClientId(null);
                setResetPassword('');
                fetchClients();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to reset password');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleViewPositions = async (client: User) => {
        setViewedClientId(client.id);
        try {
            const res = await fetch(getUrl(`/api/trade/positions/${client.id}`), {
                headers: getAuthHeaders()
            });
            const data: NetPositionRecord[] = await res.json();
            setClientPositions(data);

            // Subscribe the Market Data hook to these tokens
            const newStocks: StockData[] = data.map(p => ({
                id: p.token,
                symbol: p.scrip,
                exchange: p.exch,
                dispName: p.scrip,
                ltp: 0, change: 0, bQty: 0, bid: 0, ask: 0, aQty: 0,
                open: 0, high: 0, low: 0, pClose: 0, volume: 0
            }));

            setStocks(newStocks);
            subscribe(newStocks.map(s => s.id));

        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="h-full min-h-screen overflow-y-auto bg-gray-900 text-white p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">
                        Master Control Panel
                        {delegateMasterId && <span className="text-sm ml-4 font-normal text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full">Super Master View</span>}
                    </h1>
                    <div className="flex space-x-4">
                        <button
                            onClick={handleRefreshInstruments}
                            disabled={isRefreshingInstruments}
                            className={`px-4 py-2 rounded transition-colors ${isRefreshingInstruments
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {isRefreshingInstruments ? 'Refreshing...' : '↻ Refresh Instruments'}
                        </button>
                        <button
                            onClick={onLogout}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Client Accounts</h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        >
                            + Create Client
                        </button>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-700 text-gray-400">
                                <th className="py-3 px-4">Username</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Total Capital</th>
                                <th className="py-3 px-4 text-right">Used Margin</th>
                                <th className="py-3 px-4 text-right">Running M2M</th>
                                <th className="py-3 px-4 text-right">Alloc M2M</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(c => {
                                // Calculate live values
                                let usedCapital = 0;
                                let runningM2M = 0;

                                (c.positions || []).forEach(p => {
                                    const stock = stocks.find(s => s.id === p.token);
                                    const ltp = stock ? stock.ltp : 0;

                                    if (p.nQty !== 0) {
                                        usedCapital += (p.nAvg * Math.abs(p.nQty));
                                        runningM2M += (ltp - p.nAvg) * p.nQty;
                                    }
                                });

                                return (
                                    <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                                        <td className="py-3 px-4 font-medium text-base">{c.username}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${c.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">{c.totalCapital?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-3 px-4 text-right font-mono text-yellow-400">{usedCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className={`py-3 px-4 text-right font-mono font-medium ${runningM2M > 0 ? 'text-green-500' : runningM2M < 0 ? 'text-red-500' : ''}`}>
                                            {runningM2M.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-purple-400">{(c.allocatedM2m || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-3 px-4">
                                            <div className="grid grid-cols-4 gap-1.5 max-w-[280px] mx-auto">
                                                <button onClick={() => handleViewPositions(c)} className="px-1.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-500/50 rounded text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap">Positions</button>
                                                <button onClick={() => handleSquareOff(c)} className="px-1.5 py-1.5 bg-orange-600/90 hover:bg-orange-500 border border-orange-500/50 rounded text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap">Square Off</button>
                                                <button onClick={() => handleUpdateCapital(c)} className="px-1.5 py-1.5 bg-yellow-600/90 hover:bg-yellow-500 border border-yellow-500/50 rounded text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap">Capital</button>
                                                <button onClick={() => handleUpdateAllocatedM2M(c)} className="px-1.5 py-1.5 bg-purple-600/90 hover:bg-purple-500 border border-purple-500/50 rounded text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap">M2M</button>
                                                <button onClick={() => setRmsPanelClient(c)} className="px-1.5 py-1.5 bg-sky-600/90 hover:bg-sky-500 border border-sky-500/50 rounded text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap">RMS Rules</button>
                                                <button onClick={() => setResetClientId(c.id)} className="px-1.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-500/50 rounded text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap">Password</button>
                                                <button onClick={() => handleToggleStatus(c)} className={`col-span-2 px-1.5 py-1.5 rounded text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap border ${c.status === 'ACTIVE' ? 'bg-red-600/90 hover:bg-red-500 border-red-500/50' : 'bg-green-600/90 hover:bg-green-500 border-green-500/50'}`}>
                                                    {c.status === 'ACTIVE' ? '⊘ Disable' : '✓ Enable'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {clients.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">No clients found. Create one.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div >

                {
                    viewedClientId && (
                        <NetPositionDialog
                            positions={clientPositions}
                            stocks={stocks}
                            onClose={() => {
                                setViewedClientId(null);
                            }}
                        />
                    )
                }

                {
                    rmsPanelClient && (
                        <ClientRMSPanel
                            client={rmsPanelClient}
                            onClose={() => setRmsPanelClient(null)}
                        />
                    )
                }

                {/* Create Client Modal */}
                {
                    showCreateModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
                                <h2 className="text-xl font-bold mb-4">Create New Client</h2>
                                <form onSubmit={handleCreateClient} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Username</label>
                                        <input required type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                                        <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Starting Capital</label>
                                        <input required type="number" value={newCapital} onChange={e => setNewCapital(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                                    </div>
                                    <div className="flex space-x-3 pt-2">
                                        <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
                                        <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium">Create</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
                {/* Reset Password Modal */}
                {
                    resetClientId && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
                                <h2 className="text-xl font-bold mb-4">Reset User Password</h2>
                                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">New Password</label>
                                        <input required type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                                    </div>
                                    <div className="flex space-x-3 pt-2">
                                        <button type="button" onClick={() => { setResetClientId(null); setResetPassword(''); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
                                        <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 rounded font-medium">Update</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default AdminDashboard;

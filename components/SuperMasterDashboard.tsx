import React, { useState, useEffect } from 'react';
import { User } from '../types';
import AdminDashboard from './AdminDashboard';

interface SuperMasterDashboardProps {
    onLogout: () => void;
    token: string;
}

export interface MasterWithStats extends User {
    totalClients: number;
    totalClientCapital: number;
}

const SuperMasterDashboard: React.FC<SuperMasterDashboardProps> = ({ onLogout, token }) => {
    const [masters, setMasters] = useState<MasterWithStats[]>([]);
    const [loading, setLoading] = useState(true);

    // New Master Form State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [managingMaster, setManagingMaster] = useState<MasterWithStats | null>(null);

    // Expanded View State
    const [expandedMasterId, setExpandedMasterId] = useState<string | null>(null);
    const [masterClients, setMasterClients] = useState<User[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);

    useEffect(() => {
        fetchMasters();
    }, []);

    const fetchMasters = async () => {
        try {
            const res = await fetch('/api/supermaster/masters', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                onLogout();
                return;
            }
            const data = await res.json();
            if (res.ok) {
                setMasters(data);
            } else {
                console.error(data.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMaster = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/supermaster/create-master', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: newUsername, password: newPassword })
            });
            if (res.ok) {
                setShowCreateModal(false);
                setNewUsername('');
                setNewPassword('');
                fetchMasters();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to create Master');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred while creating Master');
        }
    };

    const handleToggleStatus = async (master: MasterWithStats) => {
        const newStatus = master.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        try {
            const res = await fetch(`/api/supermaster/master/${master.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchMasters();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to update Master status');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteMaster = async (masterId: string) => {
        if (!window.confirm("Are you sure you want to delete this Master account? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/supermaster/master/${masterId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                if (expandedMasterId === masterId) setExpandedMasterId(null);
                fetchMasters();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to delete Master');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleExpandMaster = async (masterId: string) => {
        if (expandedMasterId === masterId) {
            setExpandedMasterId(null);
            setMasterClients([]);
            return;
        }

        setExpandedMasterId(masterId);
        setLoadingClients(true);
        try {
            const res = await fetch(`/api/supermaster/master/${masterId}/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMasterClients(data);
            }
        } catch (e) {
            console.error("Failed to fetch clients", e);
        } finally {
            setLoadingClients(false);
        }
    };

    if (managingMaster) {
        return (
            <div className="h-screen flex flex-col bg-gray-900">
                <div className="bg-gray-800 border-b border-gray-700 p-3 flex justify-between items-center z-10 shadow-md">
                    <button
                        onClick={() => setManagingMaster(null)}
                        className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm font-medium transition-colors flex items-center"
                    >
                        <span className="mr-2">←</span> Exit Super Master View
                    </button>
                    <div className="text-gray-300 text-sm flex items-center">
                        <span className="mr-2 px-2 py-0.5 bg-blue-900/40 text-blue-400 rounded text-xs border border-blue-800/50">Delegated Scope</span>
                        Managing Master: <strong className="text-white ml-2 text-base">{managingMaster.username}</strong>
                    </div>
                    <div className="w-32"></div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <AdminDashboard token={token} onLogout={onLogout} delegateMasterId={managingMaster.id} />
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-y-auto bg-gray-900 text-white p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        Super Master Dashboard
                    </h1>
                    <button
                        onClick={onLogout}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                        Logout
                    </button>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Master Accounts <span className="text-sm font-normal text-gray-400">({masters.length}/20)</span></h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        >
                            + Create Master
                        </button>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-700 text-gray-400">
                                <th className="py-3 px-4">Master Name</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-center">Total Clients</th>
                                <th className="py-3 px-4 text-right">Allocated Capital</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {masters.map(m => (
                                <React.Fragment key={m.id}>
                                    <tr className={`border-b border-gray-700/50 hover:bg-gray-700/20 ${expandedMasterId === m.id ? 'bg-gray-700/30' : ''}`}>
                                        <td className="py-3 px-4 font-medium text-base">
                                            <button
                                                onClick={() => toggleExpandMaster(m.id)}
                                                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
                                            >
                                                <span>{expandedMasterId === m.id ? '▼' : '▶'}</span>
                                                <span>{m.username}</span>
                                            </button>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${m.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold">{m.totalClients}</td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">
                                            {m.totalClientCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex justify-center space-x-2">
                                                <button
                                                    onClick={() => setManagingMaster(m)}
                                                    className="px-3 py-1 bg-blue-600/90 hover:bg-blue-500 rounded text-xs font-bold border border-blue-500/50 transition-colors"
                                                >
                                                    Manage Panel
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(m)}
                                                    className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${m.status === 'ACTIVE' ? 'bg-orange-600/90 hover:bg-orange-500 border-orange-500/50' : 'bg-green-600/90 hover:bg-green-500 border-green-500/50'}`}
                                                >
                                                    {m.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMaster(m.id)}
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-bold border border-red-500/50 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Expanded Clients Row */}
                                    {expandedMasterId === m.id && (
                                        <tr className="bg-gray-800/50 border-b border-gray-700">
                                            <td colSpan={5} className="p-4">
                                                <div className="bg-gray-900 border border-gray-700 rounded p-4 pl-12">
                                                    <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Clients under {m.username}</h3>
                                                    {loadingClients ? (
                                                        <div className="text-sm text-gray-500">Loading clients...</div>
                                                    ) : masterClients.length > 0 ? (
                                                        <table className="w-full text-sm text-left">
                                                            <thead>
                                                                <tr className="text-gray-500 border-b border-gray-800">
                                                                    <th className="py-2 px-3">Username</th>
                                                                    <th className="py-2 px-3">Status</th>
                                                                    <th className="py-2 px-3 text-right">Capital</th>
                                                                    <th className="py-2 px-3 text-right">Used Margin</th>
                                                                    <th className="py-2 px-3 text-right">M2M</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {masterClients.map(c => {
                                                                    let usedCapital = 0;
                                                                    let runningM2M = 0;
                                                                    (c.positions || []).forEach(p => {
                                                                        if (p.nQty !== 0) {
                                                                            usedCapital += (p.nAvg * Math.abs(p.nQty));
                                                                            runningM2M += ((p.ltp || p.nAvg) - p.nAvg) * p.nQty; // Mocked M2M logic, full realtime needs market hook here
                                                                        }
                                                                    });
                                                                    return (
                                                                        <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800 text-gray-300">
                                                                            <td className="py-2 px-3 font-medium">{c.username}</td>
                                                                            <td className="py-2 px-3">
                                                                                <span className={`px-2 py-0.5 text-[10px] rounded-full ${c.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                                    {c.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 px-3 text-right font-mono">{c.totalCapital?.toLocaleString('en-IN')}</td>
                                                                            <td className="py-2 px-3 text-right font-mono">{usedCapital.toLocaleString('en-IN')}</td>
                                                                            <td className={`py-2 px-3 text-right font-mono ${runningM2M > 0 ? 'text-green-500' : runningM2M < 0 ? 'text-red-500' : ''}`}>
                                                                                {runningM2M.toLocaleString('en-IN')}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="text-sm text-gray-500">No clients created by this Master yet.</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {masters.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">No Master accounts found. Create one to get started.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Create Master Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
                            <h2 className="text-xl font-bold mb-4">Create New Master</h2>
                            <form onSubmit={handleCreateMaster} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Username</label>
                                    <input required type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Password</label>
                                    <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                                </div>
                                <div className="flex space-x-3 pt-2">
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
                                    <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperMasterDashboard;

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ChangePasswordDialogProps {
    userId: string;
    onClose: () => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ userId, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Center the dialog
        const width = 448; // max-w-md
        const height = 400;
        setPosition({
            x: (window.innerWidth - width) / 2,
            y: (window.innerHeight - height) / 2,
        });
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        isDragging.current = true;
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('New password and confirm password must match.');
            return;
        }

        if (newPassword.length < 5) {
            setError('Password must be at least 5 characters long.');
            return;
        }

        try {
            const res = await fetch(`/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, currentPassword, newPassword })
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                setSuccess('Password updated successfully');
                setTimeout(() => {
                    onClose();
                }, 1500);
            }
        } catch (err) {
            setError('Failed to update password. Please check your connection.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center pointer-events-none">
            <div
                className="bg-white rounded shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto absolute"
                style={{ top: position.y, left: position.x }}
            >
                <div
                    className="bg-[#1c2630] text-white px-4 py-2 flex justify-between items-center select-none cursor-move border-b border-black"
                    onMouseDown={handleMouseDown}
                >
                    <h3 className="font-bold text-sm tracking-wide">Change Password</h3>
                    <button onClick={onClose} className="hover:text-red-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && <div className="p-2.5 bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded">{error}</div>}
                    {success && <div className="p-2.5 bg-green-100 border border-green-200 text-green-700 text-xs font-semibold rounded">{success}</div>}

                    <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Current Password</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            className="w-full border border-gray-300 p-2 text-sm text-gray-900 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">New Password</label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full border border-gray-300 p-2 text-sm text-gray-900 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Confirm New Password</label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full border border-gray-300 p-2 text-sm text-gray-900 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    <div className="flex justify-end pt-3 space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-bold rounded hover:bg-gray-100 transition-colors shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] text-white text-sm font-bold rounded hover:brightness-110 active:scale-95 transition-all shadow-md"
                        >
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordDialog;

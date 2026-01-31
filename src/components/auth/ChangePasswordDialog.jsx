import React, { useState } from 'react';
import { Shield, Key, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ChangePasswordDialog = ({ isOpen, onClose, showAlert }) => {
    const { user } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 4) {
            setError("Password is too short.");
            return;
        }

        setLoading(true);

        try {
            // 1. Verify Old Password
            // We query the DB for this user + password combo
            const { data, error: fetchError } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .eq('password', oldPassword)
                .single();

            if (fetchError || !data) {
                setError("Incorrect current password.");
                setLoading(false);
                return;
            }

            // 2. Update Password
            const { error: updateError } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('id', user.id);

            if (updateError) {
                setError(updateError.message);
            } else {
                showAlert("Password changed successfully.");
                onClose();
            }

        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Key size={18} className="text-brand-600" /> Change Password
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex gap-2">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Current Password</label>
                        <input
                            type="password"
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand-500"
                            placeholder="Enter current password"
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-100"></div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand-500"
                            placeholder="New password"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand-500"
                            placeholder="Confirm new password"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 bg-brand-600 text-white font-bold rounded-lg shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordDialog;

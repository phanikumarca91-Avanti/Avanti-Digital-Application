import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, User, LogIn, AlertCircle } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);

        const result = await login(userId, password);

        if (!result.success) {
            setError(result.message);
            setIsLoggingIn(false);
        }
        // If success, AuthContext state updates and App.jsx will re-render to show main app
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* Header */}
                {/* Header */}
                <div className="bg-white p-8 text-center border-b border-slate-100">
                    <img
                        src="/avanti_logo.png"
                        alt="Avanti Feeds Limited"
                        className="h-20 mx-auto object-contain mb-4"
                    />
                    <div className="mt-4 relative">
                        <div className="h-1 w-16 bg-gradient-to-r from-orange-400 via-blue-500 to-emerald-400 mx-auto rounded-full mb-3 opacity-80"></div>
                        <p className="font-serif text-xl text-blue-900 italic tracking-wide font-medium drop-shadow-sm">
                            A way forward towards DIGITALISATION
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 ${isLoggingIn
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                                }`}
                        >
                            {isLoggingIn ? 'Verifying...' : 'Login'} <LogIn size={18} />
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-slate-400">
                        Default: admin / admin123
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

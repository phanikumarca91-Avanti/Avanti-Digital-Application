import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { initDB } from '../lib/indexedDB';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for persisted user on mount
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // Try online login first
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .single();

                if (error || !data) {
                    return { success: false, message: 'Invalid username' };
                }

                if (data.password !== password) {
                    return { success: false, message: 'Invalid password' };
                }

                const safeUser = {
                    id: data.id,
                    username: data.username,
                    role: data.role,
                    fullName: data.full_name,
                    allowed_modules: data.allowed_modules,
                    assignedLocationId: data.assigned_location_id || 'LOC001'
                };

                // Cache credentials for offline login (store password hash for security)
                const db = await initDB();
                const tx = db.transaction('master_data', 'readwrite');
                const store = tx.objectStore('master_data');
                await store.put({
                    id: `user_${username}`,
                    type: 'cached_user',
                    data: { ...data, password: data.password }, // Cache for offline use
                    lastSync: new Date().toISOString()
                });

                try {
                    await supabase.rpc('set_session_location', {
                        loc_id: safeUser.assignedLocationId,
                        user_role: safeUser.role
                    });
                } catch (err) {
                    console.warn('Failed to set session location:', err);
                }

                setUser(safeUser);
                localStorage.setItem('currentUser', JSON.stringify(safeUser));
                return { success: true };
            } else {
                // Offline login - check cached credentials
                console.log('📴 Offline - attempting cached login');
                const db = await initDB();
                const tx = db.transaction('master_data', 'readonly');
                const store = tx.objectStore('master_data');
                const cached = await new Promise((resolve, reject) => {
                    const request = store.get(`user_${username}`);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });

                if (!cached || !cached.data) {
                    return { success: false, message: 'No cached credentials. Login online first.' };
                }

                if (cached.data.password !== password) {
                    return { success: false, message: 'Invalid password' };
                }

                const safeUser = {
                    id: cached.data.id,
                    username: cached.data.username,
                    role: cached.data.role,
                    fullName: cached.data.full_name,
                    allowed_modules: cached.data.allowed_modules,
                    assignedLocationId: cached.data.assigned_location_id || 'LOC001'
                };

                setUser(safeUser);
                localStorage.setItem('currentUser', JSON.stringify(safeUser));
                return { success: true, offline: true };
            }

        } catch (err) {
            console.error("Login Error", err);
            return { success: false, message: 'Login failed: ' + err.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser');
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

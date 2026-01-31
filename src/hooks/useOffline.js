import { useState, useEffect } from 'react';

/**
 * React hook for offline/online detection
 * Automatically detects network status changes and triggers callbacks
 */
export const useOffline = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            console.log('📡 Connection restored');
            setIsOnline(true);
            setWasOffline(true); // Flag that we just came back online

            // Trigger sync after coming back online
            window.dispatchEvent(new CustomEvent('connection-restored'));

            // Reset flag after a short delay
            setTimeout(() => setWasOffline(false), 1000);
        };

        const handleOffline = () => {
            console.log('📴 Connection lost');
            setIsOnline(false);

            // Notify user
            window.dispatchEvent(new CustomEvent('connection-lost'));
        };

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check initial state
        setIsOnline(navigator.onLine);

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline, wasOffline };
};

/**
 * Hook with callback on reconnection
 */
export const useOnReconnect = (callback) => {
    useEffect(() => {
        const handleReconnect = () => {
            if (callback) callback();
        };

        window.addEventListener('connection-restored', handleReconnect);
        return () => window.removeEventListener('connection-restored', handleReconnect);
    }, [callback]);
};

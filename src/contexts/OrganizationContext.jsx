import React, { createContext, useContext, useState, useEffect } from 'react';
import { ORGANIZATION } from '../config/organization';
import { supabase } from '../lib/supabase';

const OrganizationContext = createContext();

export const useOrganization = () => {
    const context = useContext(OrganizationContext);
    if (!context) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
};

export const OrganizationProvider = ({ children }) => {
    // Helper to safely get from localStorage
    const getSaved = (key, fallback) => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : fallback;
        } catch (e) {
            console.error(`Error parsing ${key} from localStorage`, e);
            return fallback;
        }
    };

    // Initialize from localStorage or defaults
    const [currentLocation, setCurrentLocation] = useState(() =>
        getSaved('org_location', ORGANIZATION?.locations?.[0] || null)
    );

    const [currentUnit, setCurrentUnit] = useState(() =>
        getSaved('org_unit', ORGANIZATION?.locations?.[0]?.units?.[0] || null)
    );

    const [currentDivision, setCurrentDivision] = useState(() =>
        getSaved('org_division', ORGANIZATION?.locations?.[0]?.divisions?.[0] || null)
    );

    // Initial Load: Set to user's assigned location (not global settings)
    useEffect(() => {
        const initializeUserLocation = () => {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const assignedLocationId = currentUser?.assignedLocationId;
                const role = currentUser?.role;

                if (assignedLocationId) {
                    // Find the location object matching user's assignment
                    const assignedLoc = ORGANIZATION.locations.find(l => l.id === assignedLocationId);

                    if (assignedLoc) {
                        // Only set if not already set or if different from current
                        if (!currentLocation || currentLocation.id !== assignedLocationId) {
                            setCurrentLocation(assignedLoc);
                            setCurrentUnit(assignedLoc.units[0]);
                            setCurrentDivision(assignedLoc.divisions[0]);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to initialize user location', err);
            }
        };

        initializeUserLocation();
    }, []); // Run once on mount

    // Persist changes to LocalStorage AND Cloud
    useEffect(() => {
        if (currentLocation) {
            localStorage.setItem('org_location', JSON.stringify(currentLocation));
            supabase.from('settings').upsert({ key: 'org_location', value: currentLocation }).then();
        }
    }, [currentLocation]);

    useEffect(() => {
        if (currentUnit) {
            localStorage.setItem('org_unit', JSON.stringify(currentUnit));
            supabase.from('settings').upsert({ key: 'org_unit', value: currentUnit }).then();
        }
    }, [currentUnit]);

    useEffect(() => {
        if (currentDivision) {
            localStorage.setItem('org_division', JSON.stringify(currentDivision));
            supabase.from('settings').upsert({ key: 'org_division', value: currentDivision }).then();
        }
    }, [currentDivision]);

    // Get user's assigned location to restrict switching
    const getUserAssignedLocation = () => {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            return {
                locationId: currentUser?.assignedLocationId,
                role: currentUser?.role
            };
        } catch {
            return { locationId: null, role: null };
        }
    };

    // Filter locations based on user's assigned location
    const getAvailableLocations = () => {
        const { locationId, role } = getUserAssignedLocation();

        // Admins see all locations
        if (role === 'ADMIN') {
            return ORGANIZATION.locations || [];
        }

        // Non-admins only see their assigned location
        if (locationId) {
            return ORGANIZATION.locations.filter(loc => loc.id === locationId) || [];
        }

        // Fallback: show all if no restriction
        return ORGANIZATION.locations || [];
    };

    const changeLocation = (locationId) => {
        const { locationId: assignedLocationId, role } = getUserAssignedLocation();

        // Check if user is allowed to switch to this location
        if (role !== 'ADMIN' && assignedLocationId && locationId !== assignedLocationId) {
            console.warn('User not authorized to switch to this location');
            return; // Block the switch
        }

        const location = ORGANIZATION.locations.find(l => l.id === locationId);
        if (location) {
            setCurrentLocation(location);
            // Reset unit and division to first available when location changes
            setCurrentUnit(location.units[0]);
            setCurrentDivision(location.divisions[0]);
        }
    };

    const changeUnit = (unitId) => {
        const unit = currentLocation?.units?.find(u => u.id === unitId);
        if (unit) {
            setCurrentUnit(unit);
        }
    };

    const changeDivision = (divisionId) => {
        const division = currentLocation?.divisions?.find(d => d.id === divisionId);
        if (division) {
            setCurrentDivision(division);
        }
    };

    // On mount: Lock user to their assigned location if not admin
    useEffect(() => {
        const { locationId: assignedLocationId, role } = getUserAssignedLocation();

        if (role !== 'ADMIN' && assignedLocationId) {
            // Force user to their assigned location
            const assignedLoc = ORGANIZATION.locations.find(l => l.id === assignedLocationId);
            if (assignedLoc && currentLocation?.id !== assignedLocationId) {
                setCurrentLocation(assignedLoc);
                setCurrentUnit(assignedLoc.units[0]);
                setCurrentDivision(assignedLoc.divisions[0]);
            }
        }
    }, []); // Run once on mount

    const value = {
        currentLocation,
        currentUnit,
        currentDivision,
        changeLocation,
        changeUnit,
        changeDivision,
        locations: getAvailableLocations() // Expose filtered locations
    };

    return (
        <OrganizationContext.Provider value={value}>
            {children}
        </OrganizationContext.Provider>
    );
};

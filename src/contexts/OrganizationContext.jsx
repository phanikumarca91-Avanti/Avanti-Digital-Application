import React, { createContext, useContext, useState, useEffect } from 'react';
import { ORGANIZATION } from '../config/organization';

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

    // Persist changes
    useEffect(() => {
        if (currentLocation) localStorage.setItem('org_location', JSON.stringify(currentLocation));
    }, [currentLocation]);

    useEffect(() => {
        if (currentUnit) localStorage.setItem('org_unit', JSON.stringify(currentUnit));
    }, [currentUnit]);

    useEffect(() => {
        if (currentDivision) localStorage.setItem('org_division', JSON.stringify(currentDivision));
    }, [currentDivision]);

    const changeLocation = (locationId) => {
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

    const value = {
        currentLocation,
        currentUnit,
        currentDivision,
        changeLocation,
        changeUnit,
        changeDivision,
        locations: ORGANIZATION.locations || []
    };

    return (
        <OrganizationContext.Provider value={value}>
            {children}
        </OrganizationContext.Provider>
    );
};

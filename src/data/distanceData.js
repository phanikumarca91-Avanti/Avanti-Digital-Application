export const DISTANCE_DATA = [
    { from: 'Kovvuru', to: 'Vijayawada', distanceKm: 150, timeHours: 3.5 },
    { from: 'Kovvuru', to: 'Visakhapatnam', distanceKm: 200, timeHours: 4.5 },
    { from: 'Kovvuru', to: 'Hyderabad', distanceKm: 400, timeHours: 8 },
    { from: 'Kovvuru', to: 'Bhimavaram', distanceKm: 80, timeHours: 2 },
    { from: 'Kovvuru', to: 'Nellore', distanceKm: 350, timeHours: 7 },
    { from: 'Bandapuram', to: 'Vijayawada', distanceKm: 160, timeHours: 3.7 },
    { from: 'Bandapuram', to: 'Visakhapatnam', distanceKm: 190, timeHours: 4.2 },
    { from: 'Bandapuram', to: 'Hyderabad', distanceKm: 410, timeHours: 8.2 },
    { from: 'Bandapuram', to: 'Bhimavaram', distanceKm: 90, timeHours: 2.2 },
    { from: 'Bandapuram', to: 'Nellore', distanceKm: 360, timeHours: 7.2 },
];

export const getDistance = (from, to) => {
    const route = DISTANCE_DATA.find(d => (d.from === from && d.to === to) || (d.from === to && d.to === from));
    return route ? route : { distanceKm: 0, timeHours: 0 }; // Default if not found
};

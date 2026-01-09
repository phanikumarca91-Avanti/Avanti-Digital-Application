import React from 'react';

const StatusBadge = ({ status }) => {
    let colorClass = '';
    let text = status;

    switch (status) {
        // Security & Entry
        case 'AT_SECURITY_GATE_ENTRY':
            colorClass = 'bg-blue-100 text-blue-700';
            text = 'At Security Gate';
            break;
        case 'AT_SECURITY_REJECT_IN':
            colorClass = 'bg-red-100 text-red-700';
            text = 'Rejected at Gate';
            break;
        case 'AT_SECURITY_OUT':
            colorClass = 'bg-yellow-100 text-yellow-700';
            text = 'Security Out';
            break;

        // QC
        case 'AT_QC_1':
            colorClass = 'bg-orange-100 text-orange-700';
            text = 'At Preliminary QC';
            break;
        case 'AT_QC_2':
            colorClass = 'bg-orange-100 text-orange-700';
            text = 'At Final QC';
            break;
        case 'QC_APPROVED':
            colorClass = 'bg-emerald-100 text-emerald-700';
            text = 'QC Approved';
            break;
        case 'PENDING_UNIT_ALLOCATION':
            colorClass = 'bg-amber-100 text-amber-700';
            text = 'Pending Unit Allocation';
            break;

        // Warehouse
        case 'AT_WAREHOUSE':
            colorClass = 'bg-blue-100 text-blue-700';
            text = 'At Warehouse';
            break;
        case 'BAY_ASSIGNED':
            colorClass = 'bg-purple-100 text-purple-700';
            text = 'Bay Assigned';
            break;
        case 'COMPLETED':
            colorClass = 'bg-green-100 text-green-700';
            text = 'Completed';
            break;

        // Weighbridge
        case 'AT_WEIGHBRIDGE_1':
            colorClass = 'bg-indigo-100 text-indigo-700';
            text = 'At Gross Wb';
            break;
        case 'AT_WEIGHBRIDGE_2':
            colorClass = 'bg-indigo-100 text-indigo-700';
            text = 'At Tare Wb';
            break;

        default:
            colorClass = 'bg-slate-100 text-slate-700';
            text = status?.replace(/_/g, ' ') || 'Unknown';
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} whitespace-nowrap`}>
            {text}
        </span>
    );
};

export default StatusBadge;

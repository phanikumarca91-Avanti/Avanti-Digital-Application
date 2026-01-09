export const USER_MANUALS = {
    SECURITY: {
        title: "Security Gate Operations",
        sections: [
            {
                title: "1. Vehicle Entry (Inward)",
                content: `
                    <p>Follow these steps to register a new vehicle entering the premises:</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li><strong>Select Register:</strong> Choose "Lorry Yard / Gate Entry" from the tab menu.</li>
                        <li><strong>Click "Add New Entry":</strong> Opens the registration form.</li>
                        <li><strong>Capture Photos:</strong> Click the Camera icon to capture vehicle photos (Front, Back, License Plate).</li>
                        <li><strong>Fill Details:</strong> Enter Vehicle Number, Driver Name, Supplier, and Material.</li>
                        <li><strong>Submit:</strong> Click "Submit" to save. The vehicle status becomes <code>AT_SECURITY_GATE_ENTRY</code>.</li>
                    </ol>
                    <p class="mt-2 text-sm text-slate-500">Note: Vehicle Number is automatically capitalized.</p>
                `
            },
            {
                title: "2. QC & Warehouse Routing",
                content: `
                    <p>Once entered, the vehicle moves physically to the internal weighing/QC area.</p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>The vehicle status will update automatically as it progresses through QC and Warehouse.</li>
                        <li>You can track the status using the <strong>Status Badge</strong> in the list (e.g., <code>At Preliminary QC</code>).</li>
                    </ul>
                `
            },
            {
                title: "3. Handling Rejections",
                content: `
                    <p>If a vehicle is rejected by QC:</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li>The status will change to <code class="text-red-600">Rejected at Gate</code>.</li>
                        <li>The vehicle must physically return to the gate.</li>
                        <li><strong>Gate Out:</strong> Click the "Gate Out" button to record the exit.</li>
                    </ol>
                `
            },
            {
                title: "4. Vehicle Exit (Gate Out)",
                content: `
                    <p>For vehicles that have completed unloading:</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li>Switch to the <strong>Gate Out</strong> tab (or locate in Lorry Yard list).</li>
                        <li>Verify the status is <code>COMPLETED</code>.</li>
                        <li>Click <strong>Gate Out</strong> action button.</li>
                        <li>Confirm the exit. This closes the transaction.</li>
                    </ol>
                `
            }
        ]
    },
    QC: {
        title: "Quality Control (QC) Operations",
        sections: [
            {
                title: "1. Preliminary QC (QC-1)",
                content: `
                    <p>Inspection of vehicles arriving from Security.</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li><strong>Locate Vehicle:</strong> Check the "Pending Preliminary QC" list.</li>
                        <li><strong>Review Docs:</strong> Click "Upload Lab Report" if needed.</li>
                        <li><strong>Enter Remarks:</strong> Type mandatory inspection observations.</li>
                        <li><strong>Decision:</strong>
                            <ul class="list-disc pl-5 mt-1">
                                <li><code>Accept</code>: Opens Verification Modal. Confirm Quantity/Invoice details. Status -> <code>PENDING_UNIT_ALLOCATION</code>.</li>
                                <li><code>Reject</code>: Opens Verification Modal. Confirm rejection. Status -> <code>AT_SECURITY_REJECT_IN</code>.</li>
                            </ul>
                        </li>
                    </ol>
                `
            },
            {
                title: "2. Secondary QC (QC-2)",
                content: `
                    <p>Final check after unloading at the Warehouse.</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li><strong>Locate Vehicle:</strong> Check "Secondary QC" list.</li>
                        <li><strong>Verify Bay:</strong> Ensure the assigned bay matches actual unloading.</li>
                        <li><strong>Final Decision:</strong> Click <code>Final Accept</code> to mark the vehicle as <code>COMPLETED</code>.</li>
                    </ol>
                `
            }
        ]
    },
    WAREHOUSE: {
        title: "Warehouse Operations",
        sections: [
            {
                title: "1. Unit Allocation",
                content: `
                    <p>Assigning a physical Unit (1, 2, or 3) to QC-Approved vehicles.</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li><strong>Pending List:</strong> Look for "Pending Unit Allocation".</li>
                        <li><strong>Select Unit:</strong> Choose the destination Unit dropdown.</li>
                        <li><strong>Verify:</strong> Confirm details in the popup modal.</li>
                        <li><strong>Result:</strong> Vehicle moves to <code>AT_WAREHOUSE</code> status.</li>
                    </ol>
                `
            },
            {
                title: "2. Bay Assignment",
                content: `
                    <p>Allocating a storage bay for Raw Material.</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li><strong>Select Vehicle:</strong> Click a vehicle in "Pending for Bay Assignment".</li>
                        <li><strong>Select Bay:</strong> Click an <span class="bg-slate-100 border border-slate-300 px-1 rounded">Empty</span> bay on the map.</li>
                        <li><strong>Confirm:</strong> Click "Assign Bay".</li>
                    </ol>
                `
            },
            {
                title: "3. Unloading & Dispatch",
                content: `
                    <p>Manage physical movement.</p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Unloading:</strong> Once bay is assigned, unloading begins. Vehicle moves to QC-2 after unloading.</li>
                        <li><strong>Dispatch:</strong> View "Dispatch Plan" to see expected sales orders.</li>
                    </ul>
                `
            }
        ]
    },
    WEIGHBRIDGE: {
        title: "Weighbridge Operations",
        sections: [
            {
                title: "1. Gross Weight",
                content: `
                    <p>Weighing the vehicle immediately after Security Entry.</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li><strong>Select Vehicle:</strong> Find vehicle in "Pending Gross Weight".</li>
                        <li><strong>Capture Weight:</strong> Get weight from integration or manual entry.</li>
                        <li><strong>Save:</strong> Record Gross Weight. Vehicle moves to QC/Warehouse.</li>
                    </ol>
                `
            },
            {
                title: "2. Tare Weight (Empty)",
                content: `
                    <p>Weighing the empty vehicle before Exit.</p>
                    <ol class="list-decimal pl-5 mt-2 space-y-1">
                        <li><strong>Select Vehicle:</strong> Find vehicle in "Pending Tare Weight".</li>
                        <li><strong>Capture Weight:</strong> Record Tare Weight.</li>
                        <li><strong>Net Calculation:</strong> System calculates Net Weight (Gross - Tare).</li>
                        <li><strong>Complete:</strong> Vehicle moves to <code>AT_SECURITY_OUT</code>.</li>
                    </ol>
                `
            }
        ]
    },
    REPORTS: {
        title: "Reports & Analytics",
        sections: [
            {
                title: "1. Stock Report",
                content: `
                    <p>Real-time view of current inventory.</p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Live Stock:</strong> Aggregated view of all materials.</li>
                        <li><strong>Breakdown:</strong> Expand rows to see Lot-wise details.</li>
                        <li><strong>Reconciliation:</strong> Use "Adjust" action to correct stock discrepancies.</li>
                    </ul>
                `
            },
            {
                title: "2. Traceability",
                content: `
                    <p>Track movement of specific lots or vehicles.</p>
                    <p class="mt-1">Enter a Lot Number or Vehicle Number to see its complete history from Gate In to Gate Out.</p>
                `
            }
        ]
    }
};

# Task: Prevent Double Submission System-Wide

## Status
- [x] SecurityModule.jsx (Fixed)
- [x] QCModule.jsx (Fixed)
- [x] WeighbridgeModule.jsx (Fixed)
- [x] WarehouseModule.jsx (Fixed)
- [x] ERPModule.jsx (Verified)
- [x] ProductionModule.jsx (Fixed - MRClosure, DumpingEntry)
- [x] SalesModule.jsx (Fixed - DispatchPlanner, InvoiceGenerator)
- [x] SupplierModule.jsx (Fixed)
- [x] CustomerModule.jsx (Fixed)
- [x] MaterialHodModule.jsx (Fixed)
- [x] components/production/DumpingEntry.jsx (Verified/Fixed in context)
- [x] components/sales/DispatchPlanner.jsx (Fixed)

## Bug Fixes (Completed)
- [x] Fixed QC Finished Goods History not showing 'STORED' items.
- [x] Fixed Duplication in Production Lots (Added deduplication logic).
- [x] Fixed Display of Product and Quantity in FG Storage History (Mapped correct properties).
- [x] Fixed 'Pending Dumping' Status not updating (Exposed update function in Context).
- [x] Fixed Missing Data in Production MR History (Added Requested By & Department).

## Objective
Audit each file for `onClick` handlers that trigger `addVehicle`, `updateVehicle`, or other API/Context writing calls. Apply `isSubmitting` state to prevent race conditions.

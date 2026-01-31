# Project History & Architecture Overview
**Timeline:** October 2025 - January 2026
**Status:** Alpha Release (Deployed to Vercel)

## 📖 Executive Summary
The **Avanti Digitalisation Application** begins as a "Material Inward" tracking system and has evolved into a multi-plant logistics and ERP-lite solution. It tracks materials from the Security Gate (Entry) -> Weighbridge (Gross) -> Warehouse (Unloading) -> Weighbridge (Tare) -> ERP (GRN).

---

## ✅ Completed Modules (Phase 1)

### 1. Security Module (`SecurityModule.jsx`)
- **Function:** Registers vehicles at the gate.
- **Key Features:**
    - Live Camera Capture (Driver/Vehicle license plate).
    - Status Tracking: `AT_SECURITY_GATE`, `SECURITY_CLEARED`.
    - "Smart" detection of returning vehicles.

### 2. Quality Control (QC) Module (`QCModule.jsx`)
- **Function:** Lab testing of Raw Materials before unloading.
- **Key Features:**
    - 3-Stage Workflow: Sample Collection -> Lab Testing -> Approval/Rejection.
    - Integration with Weighbridge (cannot weigh without QC clearance).

### 3. Weighbridge Module (`WeighbridgeModule.jsx`)
- **Function:** Captures Gross and Tare weights.
- **Key Features:**
    - **Simulation Mode:** Currently generates random weights (Preparing for Rice Lake API).
    - Photo Capture: Proof of weighing.
    - Automatic Net Weight Calculation.

### 4. Warehouse Module (`WarehouseModule.jsx`)
- **Function:** Bin management and unloading.
- **Key Features:**
    - Visual Bay Map (Grid view of storage).
    - Drag-and-Drop assignment (concept).
    - **Row Level Security (RLS):** Users only see Bays for their specific plant (Kovvuru vs. Bandapuram).

### 5. Production Module (`ProductionModule.jsx`)
- **Function:** Consumption of materials.
- **Key Features:**
    - FIFO Logic (First-In-First-Out) for selecting lots.
    - "Dumping" interface for tracking material usage.
    - MR (Material Request) closures.

### 6. Sales & Dispatch (`SalesModule.jsx`)
- **Function:** Outward movement of Finished Goods.
- **Key Features:**
    - Invoice Generation.
    - Dispatch Planning (Vehicle Assignment).
    - Gate Pass generation.

---

## 🏗️ Architecture & Key Decisions

### A. Database (Supabase)
- **Real-Time:** All updates (e.g., Security adds a vehicle) act instantly on other screens.
- **RLS (Row Level Security):** Strict data isolation.
    - Only "Admin" sees all data.
    - "Unit-1" users cannot see "Unit-2" data.

### B. Offline Capability
- **Status:** Functional (Basic).
- **Tech:** Uses `navigator.onLine` and `IndexedDB` to queue requests when internet fails.
- **Goal:** Full field resilience for remote warehouses.

### C. Double Submission Prevention
- **Status:** Patched Globally (Jan 2026).
- **Mechanism:** All "Save" buttons have `isSubmitting` locks to prevent duplicate database entries on slow networks.

---

## 🚀 How to Sync Your "AI"
For team members joining now:
1.  **Read this file** to understand *what* we built.
2.  **Check `docs/CURRENT_TASKS.md`** to see strictly *what is left*.
3.  **Use `docs/TEAM_COLLABORATION_GUIDE.md`** to set up your git branches.

---

## 🔮 Roadmap (Feb 2026+)
1.  **Rice Lake Integration:** Move from "Simulated Weight" to Real API.
2.  **Fleet Management:** Map-based vehicle tracking.
3.  **Advanced Reporting:** Cross-plant analytics.

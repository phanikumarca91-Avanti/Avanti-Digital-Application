import React, { useState, useMemo } from 'react';
import Dialog from './components/shared/Dialog';
import DocumentViewer from './components/shared/DocumentViewer';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import SecurityModule from './components/modules/SecurityModule';
import QCModule from './components/modules/QCModule';
import WeighbridgeModule from './components/modules/WeighbridgeModule';
import WarehouseModule from './components/modules/WarehouseModule';
import ERPModule from './components/modules/ERPModule';
import ReportsModule from './components/modules/ReportsModule';
import ProductionModule from './components/modules/ProductionModule';
import CustomerModule from './components/modules/CustomerModule';
import SalesModule from './components/modules/SalesModule';
import MaterialModule from './components/modules/MaterialModule';
import SupplierModule from './components/modules/SupplierModule';
import MaterialHodModule from './components/modules/MaterialHodModule';
import { MasterDataProvider } from './contexts/MasterDataContext';

import { OrganizationProvider } from './contexts/OrganizationContext';
import { WarehouseProvider } from './contexts/WarehouseContext';
import { ProductionProvider } from './contexts/ProductionContext';
import { SalesProvider } from './contexts/SalesContext';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-10 text-red-600"><h1>Something went wrong.</h1><pre>{this.state.error.toString()}</pre><pre>{this.state.error.stack}</pre></div>;
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <OrganizationProvider>
        <WarehouseProvider>
          <MasterDataProvider>
            <ProductionProvider>
              <SalesProvider>
                <AppContent />
              </SalesProvider>
            </ProductionProvider>
          </MasterDataProvider>
        </WarehouseProvider>
      </OrganizationProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('SECURITY');
  // Initialize from localStorage
  const [vehicles, setVehicles] = useState(() => {
    try {
      const saved = localStorage.getItem('vehicles');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load vehicles from localStorage", e);
      return [];
    }
  });

  // Persist to localStorage whenever vehicles change
  React.useEffect(() => {
    try {
      localStorage.setItem('vehicles', JSON.stringify(vehicles));
    } catch (e) {
      console.error("Failed to save vehicles to localStorage", e);
    }
  }, [vehicles]);

  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', message: '', action: null });
  const [docViewer, setDocViewer] = useState({ isOpen: false, type: 'GRN', vehicle: null });

  const showAlert = (msg) => setDialog({ isOpen: true, type: 'alert', message: msg, action: null });
  const showConfirm = (msg, action) => setDialog({ isOpen: true, type: 'confirm', message: msg, action });

  const handleDialogConfirm = () => {
    if (dialog.action) dialog.action();
    setDialog({ ...dialog, isOpen: false });
  };

  const handleDialogCancel = () => {
    setDialog({ ...dialog, isOpen: false });
  };

  const handleDocViewerClose = () => {
    setDocViewer({ isOpen: false, type: 'GRN', vehicle: null });
  }

  const counts = useMemo(() => {
    return {
      security: vehicles.filter(v =>
        v.status === 'AT_SECURITY_REJECT_IN' ||
        v.status === 'AT_SECURITY_OUT' ||
        v.status === 'AT_SECURITY_GATE_ENTRY' ||
        v.status === 'RETURN_AT_SECURITY_OUT' ||
        v.status === 'SALES_AT_SECURITY'
      ).length,
      qc: vehicles.filter(v => v.status === 'AT_QC_1' || v.status === 'AT_QC_2' || v.status === 'BAY_ASSIGNED').length,
      weigh: vehicles.filter(v =>
        v.status === 'AT_WEIGHBRIDGE_1' ||
        v.status === 'AT_WEIGHBRIDGE_2' ||
        v.status === 'SALES_AT_WEIGHBRIDGE_1' ||
        v.status === 'SALES_AT_LOADING'
      ).length,
      warehouse: vehicles.filter(v => v.status === 'AT_WAREHOUSE' || v.status === 'PENDING_UNIT_ALLOCATION').length,
      erp: vehicles.filter(v => v.status === 'AT_ERP').length,
      hod: vehicles.filter(v => v.status === 'PROVISIONAL_PENDING_HOD').length,
    };
  }, [vehicles]);

  const addLog = (vehicleId, action, stage) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          logs: [...(v.logs || []), {
            stage,
            action,
            timestamp: new Date().toISOString(),
            user: 'CurrentUser' // Replace with actual user
          }]
        };
      }
      return v;
    }));
  };

  const updateVehicleStatus = (vehicleId, newStatus, data = {}, action = '') => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        return { ...v, status: newStatus, ...data };
      }
      return v;
    }));
    // If action is not provided, try to infer or just log status change
    const logAction = action || `Status updated to ${newStatus}`;
    addLog(vehicleId, logAction, activeTab);
  };

  // Alias for compatibility if needed, or just use updateVehicleStatus directly
  const updateStatus = updateVehicleStatus;

  const renderContent = () => {
    switch (activeTab) {
      case 'SECURITY':
        return <SecurityModule vehicles={vehicles} setVehicles={setVehicles} addLog={addLog} showAlert={showAlert} showConfirm={showConfirm} updateStatus={updateStatus} />;
      case 'QC':
        return <QCModule vehicles={vehicles} updateStatus={updateStatus} showAlert={showAlert} />;
      case 'WEIGHBRIDGE':
        return <WeighbridgeModule vehicles={vehicles} updateStatus={updateStatus} showAlert={showAlert} />;
      case 'WAREHOUSE':
        return <WarehouseModule vehicles={vehicles} updateStatus={updateStatus} showAlert={showAlert} />;
      case 'PRODUCTION':
        return <ProductionModule addLog={addLog} showAlert={showAlert} showConfirm={showConfirm} />;
      case 'ERP':
        return <ERPModule vehicles={vehicles} updateStatus={updateStatus} showAlert={showAlert} setDocViewer={setDocViewer} setVehicles={setVehicles} />;
      case 'REPORTS':
        return <ReportsModule vehicles={vehicles} />;
      case 'CUSTOMERS':
        return <CustomerModule showAlert={showAlert} />;
      case 'SALES':
        return <SalesModule showAlert={showAlert} vehicles={vehicles} setVehicles={setVehicles} />;
      case 'MATERIALS':
        return <MaterialModule showAlert={showAlert} showConfirm={showConfirm} />;
      case 'SUPPLIERS':
        return <SupplierModule showAlert={showAlert} showConfirm={showConfirm} />;
      case 'MATERIAL_HOD':
        return <MaterialHodModule vehicles={vehicles} updateStatus={updateStatus} showAlert={showAlert} showConfirm={showConfirm} />;
      default:
        return <SecurityModule vehicles={vehicles} setVehicles={setVehicles} addLog={addLog} showAlert={showAlert} showConfirm={showConfirm} updateStatus={updateStatus} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />

      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <Header activeTab={activeTab} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>

      <Dialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        message={dialog.message}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />

      <DocumentViewer
        isOpen={docViewer.isOpen}
        onClose={handleDocViewerClose}
        type={docViewer.type}
        data={docViewer.vehicle}
        onAuthorize={() => {
          const v = docViewer.vehicle;
          const documentType = docViewer.type;

          let generatedMsg = "Generated: ";

          if (v.qc1Status === 'BANDAPURAM') {
            generatedMsg += `Delivery Challan (${v.documents.dc}) & E-Way Bill Caution`;
          }
          else if (documentType === 'DEBIT_NOTE') {
            generatedMsg += `Rejection GRN (${v.documents.grn}) & Debit Note (${v.documents.debitNote})`;
          }
          else if (documentType === 'PROV_GRN') {
            generatedMsg += `Provisional GRN (${v.documents.grn})`;
          }
          else {
            generatedMsg += `Goods Receipt Note (${v.documents.grn})`;
          }

          updateStatus(v.id, 'AT_SECURITY_OUT', 'ERP', 'Authorized & Documents Generated');
          showAlert(generatedMsg);
          handleDocViewerClose();
        }}
      />
    </div>
  );
}

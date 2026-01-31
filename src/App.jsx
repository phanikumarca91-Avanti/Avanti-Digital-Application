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
import { VehicleProvider, useVehicles } from './contexts/VehicleContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import UserManagementModule from './components/admin/UserManagementModule';
import ChangePasswordDialog from './components/auth/ChangePasswordDialog';

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
        <AuthProvider>
          <WarehouseProvider>
            <MasterDataProvider>
              <ProductionProvider>
                <SalesProvider>
                  <VehicleProvider>
                    <AppContent />
                  </VehicleProvider>
                </SalesProvider>
              </ProductionProvider>
            </MasterDataProvider>
          </WarehouseProvider>
        </AuthProvider>
      </OrganizationProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('SECURITY');
  const { vehicles, updateVehicle } = useVehicles();
  const { user, loading } = useAuth();

  const [showPwdUi, setShowPwdUi] = useState(false); // Valid state name

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
    if (!vehicles) return {};
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

  // DocumentViewer onAuthorize handler refactored below in the return statement

  // --- EARLY RETURNS FOR AUTH MUST BE AFTER HOOKS ---
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Loading Security System...</div>;
  if (!user) return <Login />;

  const renderContent = () => {
    switch (activeTab) {
      case 'SECURITY':
        return <SecurityModule showAlert={showAlert} showConfirm={showConfirm} />;
      case 'QC':
        return <QCModule showAlert={showAlert} />;
      case 'WEIGHBRIDGE':
        return <WeighbridgeModule showAlert={showAlert} />;
      case 'WAREHOUSE':
        return <WarehouseModule showAlert={showAlert} />;
      case 'PRODUCTION':
        return <ProductionModule showAlert={showAlert} />;
      case 'ERP':
        return <ERPModule showAlert={showAlert} setDocViewer={setDocViewer} />;
      case 'REPORTS':
        return <ReportsModule />;
      case 'CUSTOMERS':
        return <CustomerModule showAlert={showAlert} />;
      case 'SALES':
        return <SalesModule showAlert={showAlert} />;
      case 'MATERIALS':
        return <MaterialModule showAlert={showAlert} showConfirm={showConfirm} />;
      case 'SUPPLIERS':
        return <SupplierModule showAlert={showAlert} showConfirm={showConfirm} />;
      case 'MATERIAL_HOD':
        return <MaterialHodModule showAlert={showAlert} showConfirm={showConfirm} />;
      case 'USERS':
        return <UserManagementModule showAlert={showAlert} />;
      default:
        return <SecurityModule showAlert={showAlert} showConfirm={showConfirm} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={counts}
        onChangePassword={() => setShowPwdUi(true)}
      />

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

          updateVehicle(v.id, { status: 'AT_SECURITY_OUT' }, {
            stage: 'SECURITY',
            action: 'Authorized & Documents Generated',
            timestamp: new Date().toISOString(),
            user: 'SecurityGuard'
          });
          showAlert(generatedMsg);
          handleDocViewerClose();
        }}
      // Add cancel/close handling if needed or relying on prop defaults
      />

      <ChangePasswordDialog
        isOpen={showPwdUi}
        onClose={() => setShowPwdUi(false)}
        showAlert={showAlert}
      />
    </div>
  );
}

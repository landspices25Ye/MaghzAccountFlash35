import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from './layout';

// Lazy load modules for better performance
const DashboardPage = React.lazy(() => import('@/modules/reports/dashboards/MainDashboard'));
const AccountingPage = React.lazy(() => import('@/modules/accounting/components/AccountingPage'));
const InventoryPage = React.lazy(() => import('@/modules/inventory/components/InventoryPage'));
const SalesPage = React.lazy(() => import('@/modules/sales/components/SalesPage'));
const PurchasesPage = React.lazy(() => import('@/modules/purchases/components/PurchasesPage'));
const ManufacturingPage = React.lazy(() => import('@/modules/manufacturing/components/ManufacturingPage'));
const HrPage = React.lazy(() => import('@/modules/hr/components/HrPage'));
const CrmPage = React.lazy(() => import('@/modules/crm/components/CrmPage'));
const ReportsPage = React.lazy(() => import('@/modules/reports/ReportsHubPage'));

// Analytical reports
const SalesAnalysisReport = React.lazy(() => import('@/modules/reports/SalesAnalysisReport'));
const InventoryAnalysisReport = React.lazy(() => import('@/modules/reports/InventoryAnalysisReport'));
const CustomerStatementReport = React.lazy(() => import('@/modules/reports/CustomerStatementReport'));
const SupplierStatementReport = React.lazy(() => import('@/modules/reports/SupplierStatementReport'));
const ProfitAnalysisReport = React.lazy(() => import('@/modules/reports/ProfitAnalysisReport'));

// Auth pages
const LoginPage = React.lazy(() => import('@/modules/auth/components/LoginPage'));
const UsersPage = React.lazy(() => import('@/modules/auth/components/UsersPage'));

// Accounting sub-pages
const ChartOfAccounts = React.lazy(() => import('@/modules/accounting/components/ChartOfAccounts'));
const JournalEntriesPage = React.lazy(() => import('@/modules/accounting/components/JournalEntriesPage'));
const TrialBalancePage = React.lazy(() => import('@/modules/accounting/components/TrialBalancePage'));
const BalanceSheetPage = React.lazy(() => import('@/modules/accounting/components/BalanceSheetPage'));
const ProfitLossPage = React.lazy(() => import('@/modules/accounting/components/ProfitLossPage'));
const CashFlowPage = React.lazy(() => import('@/modules/accounting/components/CashFlowPage'));

// Inventory sub-pages
const ProductsPage = React.lazy(() => import('@/modules/inventory/components/ProductsPage'));
const WarehousesPage = React.lazy(() => import('@/modules/inventory/components/WarehousesPage'));

// Sales sub-pages
const InvoicesPage = React.lazy(() => import('@/modules/sales/components/InvoicesPage'));
const CustomersPage = React.lazy(() => import('@/modules/sales/components/CustomersPage'));
const QuotationsPage = React.lazy(() => import('@/modules/sales/components/QuotationsPage'));

// Purchases sub-pages
const PurchaseInvoicesPage = React.lazy(() => import('@/modules/purchases/components/PurchaseInvoicesPage'));
const PurchaseOrdersPage = React.lazy(() => import('@/modules/purchases/components/PurchaseOrdersPage'));
const SuppliersPage = React.lazy(() => import('@/modules/purchases/components/SuppliersPage'));

// Manufacturing sub-pages
const WorkOrdersPage = React.lazy(() => import('@/modules/manufacturing/components/WorkOrdersPage'));
const BomPage = React.lazy(() => import('@/modules/manufacturing/components/BomPage'));

// HR sub-pages
const EmployeesPage = React.lazy(() => import('@/modules/hr/components/EmployeesPage'));
const AttendancePage = React.lazy(() => import('@/modules/hr/components/AttendancePage'));
const PayrollPage = React.lazy(() => import('@/modules/hr/components/PayrollPage'));

// CRM sub-pages
const LeadsPage = React.lazy(() => import('@/modules/crm/components/LeadsPage'));
const OpportunitiesPage = React.lazy(() => import('@/modules/crm/components/OpportunitiesPage'));
const TasksPage = React.lazy(() => import('@/modules/crm/components/TasksPage'));

// Settings with nested routes
const SettingsLayout = React.lazy(() => import('@/modules/core/components/SettingsPage'));
const CompanySetup = React.lazy(() => import('@/modules/core/components/CompanySetup'));
const CurrenciesPage = React.lazy(() => import('@/modules/core/components/CurrenciesPage'));
const VatSettingsPage = React.lazy(() => import('@/modules/core/components/VatSettingsPage'));
const BranchesPage = React.lazy(() => import('@/modules/core/components/BranchesPage'));
const BackupPage = React.lazy(() => import('@/modules/core/components/BackupPage'));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
  </div>
);

const withSuspense = (Component: React.ComponentType) => (
  <React.Suspense fallback={<PageLoader />}>
    <Component />
  </React.Suspense>
);

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  return <>{children}</>;
};

import { useAuthStore } from '@/modules/auth/store';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={withSuspense(LoginPage)} />
        
        {/* Protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={withSuspense(DashboardPage)} />
                
                {/* Accounting with nested routes */}
                <Route path="/accounting" element={withSuspense(AccountingPage)}>
                  <Route path="chart" element={withSuspense(ChartOfAccounts)} />
                  <Route path="journal" element={withSuspense(JournalEntriesPage)} />
                  <Route path="trial" element={withSuspense(TrialBalancePage)} />
                  <Route path="balance" element={withSuspense(BalanceSheetPage)} />
                  <Route path="profit" element={withSuspense(ProfitLossPage)} />
                  <Route path="cashflow" element={withSuspense(CashFlowPage)} />
                </Route>
                
                {/* Inventory with nested routes */}
                <Route path="/inventory" element={withSuspense(InventoryPage)}>
                  <Route path="products" element={withSuspense(ProductsPage)} />
                  <Route path="warehouses" element={withSuspense(WarehousesPage)} />
                </Route>
                
                {/* Sales with nested routes */}
                <Route path="/sales" element={withSuspense(SalesPage)}>
                  <Route path="invoices" element={withSuspense(InvoicesPage)} />
                  <Route path="customers" element={withSuspense(CustomersPage)} />
                  <Route path="quotations" element={withSuspense(QuotationsPage)} />
                </Route>
                
                {/* Purchases with nested routes */}
                <Route path="/purchases" element={withSuspense(PurchasesPage)}>
                  <Route path="invoices" element={withSuspense(PurchaseInvoicesPage)} />
                  <Route path="orders" element={withSuspense(PurchaseOrdersPage)} />
                  <Route path="suppliers" element={withSuspense(SuppliersPage)} />
                </Route>
                
                {/* Manufacturing with nested routes */}
                <Route path="/manufacturing" element={withSuspense(ManufacturingPage)}>
                  <Route path="work-orders" element={withSuspense(WorkOrdersPage)} />
                  <Route path="bom" element={withSuspense(BomPage)} />
                </Route>
                
                {/* HR with nested routes */}
                <Route path="/hr" element={withSuspense(HrPage)}>
                  <Route path="employees" element={withSuspense(EmployeesPage)} />
                  <Route path="attendance" element={withSuspense(AttendancePage)} />
                  <Route path="payroll" element={withSuspense(PayrollPage)} />
                </Route>
                
                {/* CRM with nested routes */}
                <Route path="/crm" element={withSuspense(CrmPage)}>
                  <Route path="leads" element={withSuspense(LeadsPage)} />
                  <Route path="opportunities" element={withSuspense(OpportunitiesPage)} />
                  <Route path="tasks" element={withSuspense(TasksPage)} />
                </Route>
                
                {/* Reports hub & analytical reports */}
                <Route path="/reports" element={withSuspense(ReportsPage)} />
                <Route path="/reports/sales-analysis" element={withSuspense(SalesAnalysisReport)} />
                <Route path="/reports/inventory-analysis" element={withSuspense(InventoryAnalysisReport)} />
                <Route path="/reports/customer-statement" element={withSuspense(CustomerStatementReport)} />
                <Route path="/reports/supplier-statement" element={withSuspense(SupplierStatementReport)} />
                <Route path="/reports/profit-analysis" element={withSuspense(ProfitAnalysisReport)} />
                <Route path="/users" element={withSuspense(UsersPage)} />
                
                {/* Settings with nested routes */}
                <Route path="/settings" element={withSuspense(SettingsLayout)}>
                  <Route path="company" element={withSuspense(CompanySetup)} />
                  <Route path="currencies" element={withSuspense(CurrenciesPage)} />
                  <Route path="vat" element={withSuspense(VatSettingsPage)} />
                  <Route path="branches" element={withSuspense(BranchesPage)} />
                  <Route path="backup" element={withSuspense(BackupPage)} />
                </Route>
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
};

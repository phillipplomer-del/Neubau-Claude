import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import LoginModal from './components/auth/LoginModal';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Import from './pages/Import';

// Sales pages
import SalesDeliveries from './pages/sales/Dashboard';
import SalesDashboard from './pages/sales/SalesDashboard';
import DeliveryList from './pages/sales/DeliveryList';
import DeliveryDetails from './pages/sales/DeliveryDetails';

// Production pages
import ProductionDashboard from './pages/production/Dashboard';
import PlanningView from './pages/production/PlanningView';
import GanttView from './pages/production/GanttView';
import ComparisonView from './pages/production/ComparisonView';

// Project Management pages
import ProjectManagementDashboard from './pages/projectManagement/Dashboard';
import ProjectList from './pages/projectManagement/ProjectList';
import ProjectDetails from './pages/projectManagement/ProjectDetails';
import ControllingView from './pages/projectManagement/ControllingView';

// Data Comparison pages
import DataComparisonDashboard from './pages/dataComparison/Dashboard';

// Visualization pages
import ForceTreeView from './pages/visualization/ForceTreeView';
import ForceTimelineView from './pages/visualization/ForceTimelineView';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <LoginModal />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="import" element={<Import />} />

            {/* Sales routes */}
            <Route path="sales">
              <Route index element={<SalesDeliveries />} />
              <Route path="dashboard" element={<SalesDashboard />} />
              <Route path="deliveries" element={<DeliveryList />} />
              <Route path="deliveries/:id" element={<DeliveryDetails />} />
            </Route>

            {/* Production routes */}
            <Route path="production">
              <Route index element={<ProductionDashboard />} />
              <Route path="planning" element={<PlanningView />} />
              <Route path="gantt" element={<GanttView />} />
              <Route path="comparison" element={<ComparisonView />} />
            </Route>

            {/* Project Management routes */}
            <Route path="projects">
              <Route index element={<ProjectManagementDashboard />} />
              <Route path="list" element={<ProjectList />} />
              <Route path=":id" element={<ProjectDetails />} />
              <Route path="controlling" element={<ControllingView />} />
            </Route>

            {/* Data Comparison routes */}
            <Route path="datacomparison">
              <Route index element={<DataComparisonDashboard />} />
            </Route>

            {/* Visualization routes */}
            <Route path="visualization">
              <Route path="view1" element={<ForceTreeView />} />
              <Route path="view2" element={<ForceTimelineView />} />
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;

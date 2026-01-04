import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUserContext } from './contexts/UserContext';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
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

// Planner pages
import PlannerDashboard from './pages/projectManagement/planner/PlannerDashboard';
import BoardView from './pages/projectManagement/planner/BoardView';

// Einzelcontrolling pages
import EinzelcontrollingView from './pages/projectManagement/einzelcontrolling/EinzelcontrollingView';

// Data Comparison pages
import DataComparisonDashboard from './pages/dataComparison/Dashboard';

// Visualization pages
import ForceTreeView from './pages/visualization/ForceTreeView';
import ForceTimelineView from './pages/visualization/ForceTimelineView';

// Protected route wrapper - shows Landing if not logged in
function ProtectedRoutes() {
  const { isLoggedIn } = useUserContext();

  if (!isLoggedIn) {
    return <Landing />;
  }

  return <Layout />;
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page - also accessible directly */}
          <Route path="/landing" element={<Landing />} />

          {/* Main app with Layout - protected */}
          <Route path="/" element={<ProtectedRoutes />}>
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

            {/* Planner routes */}
            <Route path="planner">
              <Route index element={<PlannerDashboard />} />
              <Route path=":boardId" element={<BoardView />} />
            </Route>

            {/* Einzelcontrolling routes */}
            <Route path="einzelcontrolling" element={<EinzelcontrollingView />} />

            {/* Data Comparison routes */}
            <Route path="datacomparison">
              <Route index element={<DataComparisonDashboard />} />
            </Route>

            {/* Visualization routes */}
            <Route path="visualization">
              <Route path="view1" element={<ForceTreeView />} />
              <Route path="view2" element={<ForceTimelineView />} />
              <Route path="view3" element={<ProjectManagementDashboard />} />
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

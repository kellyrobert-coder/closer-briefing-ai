import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LeadDetail from './pages/LeadDetail';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lead/:id" element={<LeadDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default App;

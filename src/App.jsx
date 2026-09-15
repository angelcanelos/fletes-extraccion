import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import FormatoForm from './pages/FormatoForm.jsx';
import Imprimir from './pages/Imprimir.jsx';
import FletesDashboard from './pages/FletesDashboard.jsx';
import FleteForm from './pages/FleteForm.jsx';
import FleteImprimir from './pages/FleteImprimir.jsx';
import Ajustes from './pages/Ajustes.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/extraccion" replace />} />

          <Route path="/extraccion" element={<Dashboard />} />
          <Route path="/extraccion/nuevo" element={<FormatoForm />} />
          <Route path="/extraccion/:id/editar" element={<FormatoForm />} />
          <Route path="/extraccion/imprimir/:id" element={<Imprimir />} />

          <Route path="/fletes" element={<FletesDashboard />} />
          <Route path="/fletes/nuevo" element={<FleteForm />} />
          <Route path="/fletes/:id/editar" element={<FleteForm />} />
          <Route path="/fletes/imprimir/:id" element={<FleteImprimir />} />

          <Route path="/ajustes" element={<Ajustes />} />
        </Routes>
      </ConfirmProvider>
    </ToastProvider>
  );
}

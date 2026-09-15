import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import FormatoForm from './pages/FormatoForm.jsx';
import Imprimir from './pages/Imprimir.jsx';
import Ajustes from './pages/Ajustes.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/formato/nuevo" element={<FormatoForm />} />
          <Route path="/formato/:id/editar" element={<FormatoForm />} />
          <Route path="/imprimir/:id" element={<Imprimir />} />
          <Route path="/ajustes" element={<Ajustes />} />
        </Routes>
      </ConfirmProvider>
    </ToastProvider>
  );
}

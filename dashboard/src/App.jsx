import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import Financials from './pages/Financials';
import BudgetVsActuals from './pages/BudgetVsActuals';
import FinancialRatios from './pages/FinancialRatios';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="budget-actuals" element={<BudgetVsActuals />} />
            <Route path="financial-ratios" element={<FinancialRatios />} />
            <Route path="financials" element={<Financials />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ExchangeGoals from './pages/ExchangeGoals';
import Financials from './pages/Financials';
import BudgetVsActuals from './pages/BudgetVsActuals';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="budget-actuals" element={<BudgetVsActuals />} />
          <Route path="exchange-goals" element={<ExchangeGoals />} />
          <Route path="financials" element={<Financials />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

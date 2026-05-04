import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import History from './pages/History';
import ValidatorPage from './pages/Validator';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('waplus_token'));

  const login = () => setIsAuthenticated(true);
  const logout = () => {
    localStorage.removeItem('waplus_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout onLogout={logout} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="validator" element={<ValidatorPage />} />
          <Route path="history" element={<History />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

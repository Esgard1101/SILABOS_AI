/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SyllabusEditor from './pages/SyllabusEditor';
import SyllabusCreator from './pages/SyllabusCreator';
import SyllabusList from './pages/SyllabusList';
import Analytics from './pages/Analytics';
import Catalog from './pages/Catalog';
import Review from './pages/Review';
import ContextSelector from './pages/ContextSelector';
import { useAppContext } from './hooks/useAppContext';

// Guard que exige contexto activo (programa seleccionado)
// Solo redirige si no hay contexto — no toca el auth guard
function ContextGuard({ children }: { children: React.ReactNode }) {
  const { isContextSet } = useAppContext();
  if (!isContextSet) return <Navigate to="/select-context" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/select-context" element={<ContextSelector />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ContextGuard>
                <Dashboard />
              </ContextGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ContextGuard>
                <Dashboard />
              </ContextGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator"
          element={
            <ProtectedRoute>
              <ContextGuard>
                <SyllabusCreator />
              </ContextGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <ContextGuard>
                <SyllabusEditor />
              </ContextGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/syllabi"
          element={
            <ProtectedRoute>
              <ContextGuard>
                <SyllabusList />
              </ContextGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <ContextGuard>
                <Analytics />
              </ContextGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog"
          element={
            <ProtectedRoute>
              <ContextGuard>
                <Catalog />
              </ContextGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/review"
          element={
            <ProtectedRoute>
              <ContextGuard>
                <Review />
              </ContextGuard>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

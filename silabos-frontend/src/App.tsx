/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SyllabusEditor from './pages/SyllabusEditor';
import SyllabusList from './pages/SyllabusList';
import Analytics from './pages/Analytics';
import Catalog from './pages/Catalog';
import Review from './pages/Review';
import ContextSelector from './pages/ContextSelector';
import AdminUsers from './pages/AdminUsers';
import AdminSumillas from './pages/AdminSumillas';
import AdminTeachingMethods from './pages/AdminTeachingMethods';
import AdminSkills from './pages/AdminSkills';
import AdminCurriculum from './pages/AdminCurriculum';
import Landing from './pages/Landing';
import { useAppContext } from './hooks/useAppContext';
import MasterLayout from './components/layout/MasterLayout';
import CreatorLayout from './pages/creator/CreatorLayout';
import Step1_Repositorio from './pages/creator/Step1_Repositorio';
import Step2_Fuentes from './pages/creator/Step2_Fuentes';
import Step2A_NotebookGuide from './pages/creator/Step2A_NotebookGuide';
import Step2A_1_ManualUpload from './pages/creator/Step2A_1_ManualUpload';
import Step2A_2_DeepResearch from './pages/creator/Step2A_2_DeepResearch';
import Step3_Desempenos from './pages/creator/Step3_Desempenos';
import Step4_Contenido from './pages/creator/Step4_Contenido';
import Step5_Metodo from './pages/creator/Step5_Metodo';
import Step6_Cierre from './pages/creator/Step6_Cierre';

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
        {/* Public standalone pages (own layout) */}
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />

        {/* Main app flow — wrapped in MasterLayout (split-screen + right panel) */}
        <Route element={<MasterLayout />}>
          <Route path="/login" element={<Login />} />
          <Route
            path="/select-context"
            element={
              <ProtectedRoute>
                <ContextSelector />
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
          {/* Multi-route creator wizard */}
          <Route
            path="/creator"
            element={<Navigate to="/creator/repositorio" replace />}
          />
          <Route
            element={
              <ProtectedRoute>
                <ContextGuard>
                  <CreatorLayout />
                </ContextGuard>
              </ProtectedRoute>
            }
          >
            <Route path="/creator/repositorio" element={<Step1_Repositorio />} />
            <Route path="/creator/fuentes" element={<Step2_Fuentes />} />
            <Route path="/creator/fuentes/notebook" element={<Step2A_NotebookGuide />} />
            <Route path="/creator/fuentes/notebook/manual" element={<Step2A_1_ManualUpload />} />
            <Route path="/creator/fuentes/notebook/ia" element={<Step2A_2_DeepResearch />} />
            <Route path="/creator/desempenos" element={<Step3_Desempenos />} />
            <Route path="/creator/contenido" element={<Step4_Contenido />} />
            <Route path="/creator/metodo" element={<Step5_Metodo />} />
            <Route path="/creator/cierre" element={<Step6_Cierre />} />
          </Route>
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
            path="/catalog"
            element={
              <ProtectedRoute>
                <ContextGuard>
                  <Catalog />
                </ContextGuard>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin routes — keep AppShell (own full layout), inherit new CSS palette only */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute roles={['admin']}>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review"
          element={
            <ProtectedRoute roles={['admin']}>
              <Review />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sumillas"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminSumillas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/methods"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminTeachingMethods />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/skills"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminSkills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/curriculum"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminCurriculum />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

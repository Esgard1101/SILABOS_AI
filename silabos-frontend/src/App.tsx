/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SyllabusFinalDelivery from './pages/SyllabusFinalDelivery';
import SyllabusList from './pages/SyllabusList';
import Analytics from './pages/Analytics';
import Catalog from './pages/Catalog';
import Review from './pages/Review';
import ContextSelector from './pages/ContextSelector';
import AdminUsers from './pages/AdminUsers';
import AdminSumillas from './pages/AdminSumillas';
import AdminTeachingMethods from './pages/AdminTeachingMethods';
import AdminSkills from './pages/AdminSkills';
import AdminEvaluationPresets from './pages/AdminEvaluationPresets';
import AdminCurriculum from './pages/AdminCurriculum';
import Landing from './pages/Landing';
import { useAppContext } from './hooks/useAppContext';
import { AuthProvider } from './context/AuthContext';
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
import Step7_ProductoIntegrador from './pages/creator/Step7_ProductoIntegrador';
import Step8_ProgramaProgresivo from './pages/creator/Step8_ProgramaProgresivo';
import Step9_CierreProgresivo from './pages/creator/Step9_CierreProgresivo';
import Step8b_MapaConocimientos from './pages/creator/Step8b_MapaConocimientos';

function ContextGuard({ children }: { children: React.ReactNode }) {
  const { isContextSet } = useAppContext();
  if (!isContextSet) return <Navigate to="/select-context" replace />;
  return <>{children}</>;
}

const MANAGEMENT_ROLES = ['admin', 'director', 'coordinador'];
const SyllabusEditor = lazy(() => import('./pages/SyllabusEditor'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />

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
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/syllabi"
            element={
              <ProtectedRoute>
                <SyllabusList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalog"
            element={
              <ProtectedRoute>
                <Catalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute roles={MANAGEMENT_ROLES}>
                <Review />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute roles={['admin']}>
                <Analytics />
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
            path="/admin/evaluation-presets"
            element={
              <ProtectedRoute roles={['admin', 'director', 'coordinador']}>
                <AdminEvaluationPresets />
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

          <Route path="/creator" element={<Navigate to="/creator/repositorio" replace />} />
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
            <Route path="/creator/producto" element={<Step7_ProductoIntegrador />} />
            <Route path="/creator/mapa-conocimientos" element={<Step8b_MapaConocimientos />} />
            <Route path="/creator/evaluacion" element={<Step6_Cierre />} />
            <Route path="/creator/programa" element={<Step8_ProgramaProgresivo />} />
            <Route path="/creator/cierre" element={<Step9_CierreProgresivo />} />
          </Route>
          {/* Ruta avanzada reservada: no es parte del flujo docente principal y se carga solo bajo demanda. */}
          <Route
            path="/editor"
            element={
              <ProtectedRoute>
                <ContextGuard>
                  <Suspense fallback={<div className="p-6 text-sm text-slate-500">Cargando vista avanzada...</div>}>
                    <SyllabusEditor />
                  </Suspense>
                </ContextGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/final-delivery"
            element={
              <ProtectedRoute>
                <SyllabusFinalDelivery />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

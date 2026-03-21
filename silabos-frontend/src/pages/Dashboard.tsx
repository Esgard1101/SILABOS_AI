import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Book,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  Database,
  FileText,
  Folder,
  Gavel,
  LayoutGrid,
  LibraryBig,
  List,
  MoreVertical,
  PlusCircle,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentItem } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';

type FilterKey = 'todos' | 'reglamento' | 'libro' | 'silabo';

function normalizeType(doc: DocumentItem): FilterKey {
  const rawType = String(doc.doc_type || '').toLowerCase();
  const rawName = String(doc.nombre || doc.name || '').toLowerCase();

  if (rawType.includes('reglamento') || rawName.includes('reglamento') || rawName.includes('estatuto')) {
    return 'reglamento';
  }
  if (rawType.includes('libro') || rawName.includes('libro')) {
    return 'libro';
  }
  if (rawType.includes('silabo') || rawName.includes('silabo') || rawName.includes('sílabo')) {
    return 'silabo';
  }

  return 'todos';
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function QuickAccessCard({
  title,
  subtitle,
  icon,
  onClick,
  color,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: 'orange' | 'blue' | 'green' | 'purple';
}) {
  const colorMap = {
    orange: 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400',
    green: 'border-green-200 bg-green-50 text-green-700 hover:border-green-400',
    purple: 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${colorMap[color]}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('todos');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { logout } = useAuth();
  const { documents, uploading, loading, error, upload, remove, fetchDocuments } = useDocuments();
  const { showToast, toasts, removeToast } = useToast();

  const currentUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('silabos_user');
      return raw ? (JSON.parse(raw) as { full_name?: string }) : null;
    } catch {
      return null;
    }
  }, []);

  const userName = currentUser?.full_name || 'Usuario';
  const initials =
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() || '')
      .join('') || 'US';

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = () => setOpenMenuId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  const counts = useMemo(() => {
    return documents.reduce(
      (acc, doc) => {
        const type = normalizeType(doc);
        acc.todos += 1;
        if (type === 'reglamento') acc.reglamento += 1;
        if (type === 'libro') acc.libro += 1;
        if (type === 'silabo') acc.silabo += 1;
        return acc;
      },
      { todos: 0, reglamento: 0, libro: 0, silabo: 0 },
    );
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    if (activeFilter === 'todos') {
      return documents;
    }
    return documents.filter((doc) => normalizeType(doc) === activeFilter);
  }, [activeFilter, documents]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await upload(file, 'otro');
      showToast('Documento subido correctamente', 'success');
    } catch {
      // El hook ya maneja el error y el toast lo refleja.
    } finally {
      event.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    setOpenMenuId(null);
    setDeletingId(docId);
    try {
      await remove(docId);
      await fetchDocuments();
      showToast('Documento eliminado correctamente', 'success');
    } catch {
      showToast('No se pudo eliminar el documento', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getLabel = (doc: DocumentItem) => {
    const type = normalizeType(doc);
    if (type === 'reglamento') return 'Reglamento';
    if (type === 'libro') return 'Libro';
    if (type === 'silabo') return 'Silabo';
    return 'Institucional';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans md:flex">
      <NavSidebar currentPath="/dashboard" />

      <div className="flex-1">
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />

        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <div className="bg-orange-600 p-2 rounded-lg">
                  <Folder className="text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Base de Conocimiento</h1>
              </div>
              <div className="flex-1 max-w-lg mx-8 hidden md:block">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full bg-orange-50 border-none rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-orange-500"
                    placeholder="Buscar en el repositorio..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/creator')}
                  className="flex items-center gap-2 bg-white border border-orange-200 text-orange-700 px-4 py-2 rounded-xl font-semibold hover:bg-orange-50 transition-all"
                >
                  <PlusCircle size={20} />
                  <span className="hidden sm:inline">Nuevo Silabo</span>
                </button>
                <button
                  onClick={openFilePicker}
                  className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-orange-700 transition-all"
                >
                  <Upload size={20} />
                  <span className="hidden sm:inline">Subir documento</span>
                </button>
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-700">{userName}</span>
                  <button onClick={logout} className="text-xs font-medium text-orange-600 hover:text-orange-700">
                    Cerrar sesión
                  </button>
                </div>
                <div className="bg-orange-100 rounded-full p-1 border border-orange-200">
                  <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-xs">{initials}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Accesos rápidos</h2>
                <p className="text-sm text-slate-500">Navegación principal del MVP sin escribir URLs.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <QuickAccessCard
                icon={<BookOpen size={22} />}
                title="Mis Sílabos"
                subtitle="Ver y gestionar"
                onClick={() => navigate('/syllabi')}
                color="orange"
              />
              <QuickAccessCard
                icon={<BarChart3 size={22} />}
                title="Analítica"
                subtitle="Ver estadísticas"
                onClick={() => navigate('/analytics')}
                color="blue"
              />
              <QuickAccessCard
                icon={<LibraryBig size={22} />}
                title="Catálogos"
                subtitle="Habilidades y métodos"
                onClick={() => navigate('/catalog')}
                color="green"
              />
              <QuickAccessCard
                icon={<ClipboardCheck size={22} />}
                title="Revisión"
                subtitle="Panel académico"
                onClick={() => navigate('/review')}
                color="purple"
              />
            </div>
          </section>

          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-64 flex flex-col gap-6">
              <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Filtros</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setActiveFilter('todos')}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg font-medium ${
                      activeFilter === 'todos' ? 'bg-orange-100 text-orange-600' : 'hover:bg-orange-50 transition-colors text-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <List size={18} /> Todos
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === 'todos' ? 'bg-orange-200' : 'text-slate-400'}`}>
                      {counts.todos}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveFilter('reglamento')}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg ${
                      activeFilter === 'reglamento' ? 'bg-orange-100 text-orange-600' : 'hover:bg-orange-50 transition-colors text-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Gavel size={18} /> Reglamentos
                    </span>
                    <span className="text-xs text-slate-400">{counts.reglamento}</span>
                  </button>
                  <button
                    onClick={() => setActiveFilter('libro')}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg ${
                      activeFilter === 'libro' ? 'bg-orange-100 text-orange-600' : 'hover:bg-orange-50 transition-colors text-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Book size={18} /> Libros
                    </span>
                    <span className="text-xs text-slate-400">{counts.libro}</span>
                  </button>
                  <button
                    onClick={() => setActiveFilter('silabo')}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg ${
                      activeFilter === 'silabo' ? 'bg-orange-100 text-orange-600' : 'hover:bg-orange-50 transition-colors text-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <BookOpen size={18} /> Silabos
                    </span>
                    <span className="text-xs text-slate-400">{counts.silabo}</span>
                  </button>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Agentes Activos</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Database className="text-orange-600 bg-orange-50 p-2 rounded-lg" size={40} />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Agente Ingestion</p>
                      <p className="text-[11px] text-green-600 font-medium">Idle</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <CheckCircle className="text-orange-600 bg-orange-50 p-2 rounded-lg" size={40} />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-600 border-2 border-white rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Agente Confiabilidad</p>
                      <p className="text-[11px] text-orange-600 font-medium">Procesando...</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <section className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Documentos Recientes</h2>
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-orange-600">
                    <LayoutGrid size={20} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-orange-600">
                    <List size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="group bg-white border border-orange-100 rounded-xl overflow-hidden animate-pulse">
                        <div className="p-4 border-b border-orange-50 flex items-start justify-between">
                          <div className="bg-slate-100 p-3 rounded-xl h-14 w-14" />
                          <div className="h-4 w-20 bg-slate-100 rounded" />
                        </div>
                        <div className="p-4">
                          <div className="h-4 w-full bg-slate-100 rounded mb-3" />
                          <div className="h-3 w-2/3 bg-slate-100 rounded" />
                        </div>
                      </div>
                    ))
                  : filteredDocuments.map((doc) => {
                      const isDeleting = deletingId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          className={`group relative bg-white border border-orange-100 rounded-xl overflow-hidden hover:shadow-xl transition-all ${
                            isDeleting ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <div className="p-4 border-b border-orange-50 flex items-start justify-between">
                            <div className="bg-red-50 p-3 rounded-xl">
                              <FileText className="text-red-500" size={32} />
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-orange-600 uppercase">{getLabel(doc)}</span>
                              <div className="relative mt-2">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenMenuId(openMenuId === doc.id ? null : doc.id);
                                  }}
                                  className="text-slate-400 hover:text-orange-600 p-1 rounded"
                                  aria-label="Opciones del documento"
                                  disabled={isDeleting}
                                >
                                  <MoreVertical size={20} />
                                </button>

                                {openMenuId === doc.id ? (
                                  <div
                                    className="absolute right-0 top-8 z-20 w-56 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleDelete(doc.id);
                                      }}
                                      disabled={deletingId === doc.id}
                                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Trash2 size={16} />
                                      {deletingId === doc.id ? 'Eliminando...' : 'Eliminar documento'}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-slate-800 truncate">{doc.nombre || doc.name || 'Documento'}</h4>
                            <p className="text-xs text-slate-500 mt-1">Cargado: {formatDate(doc.created_at)}</p>
                            <div className="mt-6">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-semibold text-slate-400">Nivel de Confiabilidad</span>
                                <span className="text-[11px] font-bold text-green-600">98%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: '98%' }}></div>
                              </div>
                            </div>
                          </div>
                          {isDeleting ? <div className="absolute inset-0 bg-white/40"></div> : null}
                        </div>
                      );
                    })}

                <div
                  onClick={openFilePicker}
                  className="group border-2 border-dashed border-orange-200 rounded-xl flex flex-col items-center justify-center p-8 hover:border-orange-600 hover:bg-orange-50 transition-all cursor-pointer min-h-[220px]"
                >
                  <div className="bg-orange-100 text-orange-600 p-4 rounded-full">
                    <PlusCircle size={40} />
                  </div>
                  <p className="mt-4 font-bold text-orange-600">Arrastrar nuevo archivo</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Formatos PDF, DOCX</p>
                </div>
              </div>
            </section>
          </div>
        </main>

        {uploading ? (
          <div className="fixed bottom-4 left-4 rounded-xl bg-white px-4 py-3 text-sm text-orange-600 shadow-lg border border-orange-100">
            Subiendo documento...
          </div>
        ) : null}
        <Toast toasts={toasts} removeToast={removeToast} />
      </div>
    </div>
  );
}

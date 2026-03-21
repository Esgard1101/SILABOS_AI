import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DocumentItem } from '../api/types';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.listDocuments();
      setDocuments(response.data?.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los documentos';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const upload = async (file: File, docType: string) => {
    setUploading(true);
    setError(null);

    try {
      const response = await api.uploadDocument(file, docType, file.name);
      const nuevoDocumento = response.data;
      if (nuevoDocumento?.id) {
        setDocuments((prev) => [nuevoDocumento, ...prev]);
      } else {
        await fetchDocuments();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo subir el documento';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);

    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el documento';
      setError(message);
      throw err;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return { documents, uploading, loading, error, upload, remove, fetchDocuments };
}

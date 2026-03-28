import { useState } from 'react';
import { api } from '../api/client';
import { GenerateSyllabusInput, SyllabusData, SyllabusListData, ValidationResult } from '../api/types';

export function useSyllabus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const generate = async (formData: GenerateSyllabusInput) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.generateSyllabus(formData);
      setSyllabus(response.data);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo generar el silabo';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const validate = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.validateSyllabus(id);
      setValidation(response.data);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo validar el silabo';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const listByProgram = async (programId?: string): Promise<SyllabusListData | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listSyllabi(programId);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo listar los sílabos';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, syllabus, validation, generate, validate, listByProgram };
}

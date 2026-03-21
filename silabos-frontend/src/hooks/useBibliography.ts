import { useState } from 'react';
import { api } from '../api/client';
import { BibliographyReference, BibliographySearchRequest } from '../api/types';

export function useBibliography() {
  const [references, setReferences] = useState<BibliographyReference[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourcesConsulted, setSourcesConsulted] = useState<string[]>([]);

  const searchBibliography = async (request: BibliographySearchRequest) => {
    setIsSearching(true);
    setError(null);

    try {
      const response = await api.searchBibliography(request);
      setReferences(response.data?.references || []);
      setSourcesConsulted(response.data?.sources_consulted || []);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo buscar bibliografía';
      setError(message);
      throw err;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    references,
    isSearching,
    error,
    sourcesConsulted,
    searchBibliography,
  };
}

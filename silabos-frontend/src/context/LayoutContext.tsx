import { createContext, useContext } from 'react';

interface LayoutContextValue {
  hasMasterLayout: boolean;
}

export const LayoutContext = createContext<LayoutContextValue>({ hasMasterLayout: false });

export function useLayoutContext() {
  return useContext(LayoutContext);
}

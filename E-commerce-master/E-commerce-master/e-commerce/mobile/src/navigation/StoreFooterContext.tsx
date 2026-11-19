import React, { createContext, useContext } from 'react';

export const StoreFooterContext = createContext<React.ReactNode>(null);

export function useStoreFooter(): React.ReactNode {
  return useContext(StoreFooterContext);
}

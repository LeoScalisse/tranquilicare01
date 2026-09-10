import { createContext } from 'react';

// Route shells own the mobile navigation; standalone screens retain their fallback.
export const NavigationContext = createContext(false);

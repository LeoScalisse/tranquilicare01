import { createContext, type RefObject } from 'react';

const DiscoveryScrollContext = createContext<RefObject<HTMLElement> | undefined>(undefined);

export default DiscoveryScrollContext;

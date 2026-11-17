import { useEffect, useRef } from 'react';

/**
 * Re-runs `refetch` when a keep-alive panel goes from hidden -> visible.
 *
 * It deliberately does NOT run on the first render. A panel is now mounted the
 * first time it is visited, and its own mount effect already loads the data,
 * so firing here as well would request the same data twice.
 */
export function useRefetchOnActivate(isActive: boolean | undefined, refetch: () => void) {
  const wasActive = useRef(isActive);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (isActive && !wasActive.current) {
      refetchRef.current();
    }
    wasActive.current = isActive;
  }, [isActive]);
}

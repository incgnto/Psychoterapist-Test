'use client';

import { useMemo } from 'react';

export function useEmail() {
  return useMemo(() => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      return params.get('email') || 'guest@pj.com';
    } catch {
      return 'guest@pj.com';
    }
  }, []);
}

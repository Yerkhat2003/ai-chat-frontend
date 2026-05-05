'use client';

import { useEffect } from 'react';
import { applyThemeClass, getThemePreset } from '@/lib/preferences';

export function ThemeBootstrap() {
  useEffect(() => {
    applyThemeClass(getThemePreset());
  }, []);

  return null;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AppState } from '../types';
import { markDirty } from '../utils/sheetSync';
import type { ModuleKey } from '../utils/sheetSync';

const STORAGE_KEY = 'fintrack_pro_data';

// Map from AppState key → ModuleKey for dirty-marking
const STATE_TO_MODULE: Partial<Record<keyof AppState, ModuleKey>> = {
  onlineInvestments: 'onlineInvestments',
  sukuks:            'sukuk',
  mutualFunds:       'mutualFunds',
  fdrs:              'fixedDeposits',
};

const initialData: AppState = {
  dseHoldings: [],
  mutualFunds: [],
  onlineInvestments: [],
  sukuks: [],
  fdrs: [],
  transactions: [],
  cashBalance: 0,
  pin: null,
  isLocked: true,
};

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialData, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
    return initialData;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please delete some data or backups.');
      }
    }
  }, [state]);

  const updateState = (updater: (prev: AppState) => AppState, dirtyModules?: ModuleKey[]) => {
    setState(prev => {
      const newState = updater(prev);

      // Auto-detect which module arrays changed and mark them dirty
      const modulesToMark = dirtyModules ?? (Object.entries(STATE_TO_MODULE) as [keyof AppState, ModuleKey][])
        .filter(([stateKey]) => newState[stateKey] !== prev[stateKey])
        .map(([, moduleKey]) => moduleKey);

      modulesToMark.forEach(m => markDirty(m));

      return newState;
    });
  };

  return { state, updateState };
}
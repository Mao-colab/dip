/**
 * useCurrency — глобальная валюта + курсы Нацбанка РБ
 * Для диплома оставлена только BYN (исключены USD/EUR/RUB).
 */
import { useState, useEffect, useCallback } from 'react';
import { getUserPrefix } from './useStore';

const BASE_KEY   = 'currency';
const userDefault = 'BYN';

export const CURRENCIES = [
  { code: 'BYN', symbol: 'Br', label: 'Белорусский рубль' },
];

export function useCurrency() {
  const userKey = getUserPrefix() + BASE_KEY;

  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem(userKey) || userDefault
  );

  useEffect(() => {
    // принудительно держим только BYN, чтобы убрать любые старые значения
    if (currency !== 'BYN') setCurrency('BYN');
  }, []);

  useEffect(() => {
    const h = e => setCurrencyState(e.detail);
    window.addEventListener('mt:currencychange', h);
    return () => window.removeEventListener('mt:currencychange', h);
  }, []);

  const setCurrency = useCallback((code) => {
    const next = code === 'BYN' ? 'BYN' : 'BYN';
    localStorage.setItem(userKey, next);
    setCurrencyState(next);
    window.dispatchEvent(new CustomEvent('mt:currencychange', { detail: next }));
  }, [userKey]);

  const convert = useCallback((amountBYN) => {
    const a = Number(amountBYN);
    if (!a || isNaN(a)) return 0;
    return a; // BYN → BYN
  }, []);

  const formatAmount = useCallback((amountBYN) => {
    const val = convert(amountBYN);
    if (!val) return '—';
    const sym = CURRENCIES.find(c => c.code === currency)?.symbol || 'Br';
    return `${val.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${sym}`;
  }, [convert, currency]);

  const currencySymbol = 'Br';

  // чтобы не ломать существующие компоненты по форме данных:
  return {
    currency: 'BYN',
    setCurrency,
    rates: {},
    ratesDate: '',
    convert,
    formatAmount,
    currencySymbol,
  };
}

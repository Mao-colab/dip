/**
 * useMode — всегда грузовой режим (пассажирские перевозки удалены)
 */
export function useMode() {
  return {
    mode: 'freight',
    isFreight: true,
    isPassenger: false,
    setMode: () => {},
  };
}

export const M = {
  freight: {
    primary: '#d97706',
    light:   '#fffbeb',
    badge:   '#b45309',
    accent:  '#f59e0b',
    label:   'Грузовые',
  },
};

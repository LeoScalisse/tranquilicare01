import { describe, expect, it } from 'vitest';

import { normalizeFounderCode } from '@/lib/founderCode';

describe('normalizeFounderCode', () => {
  it.each([
    ['TC-EXEMPLO', 'TC-EXEMPLO'],
    ['tc-exemplo', 'TC-EXEMPLO'],
    [' tc exemplo ', 'TC-EXEMPLO'],
    ['tc_exemplo', 'TC-EXEMPLO'],
    ['Tc_Outro-Codigo', 'TC-OUTROCODIGO'],
    ['tc-cades', 'TC-CADES'],
    [' Tc Monte Azul ', 'TC-MONTEAZUL'],
    ['tc_care', 'TC-CARE'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeFounderCode(input)).toBe(expected);
  });

  it('does not decide whether a code is authorized', () => {
    expect(normalizeFounderCode('convite externo')).toBe('CONVITEEXTERNO');
  });
});

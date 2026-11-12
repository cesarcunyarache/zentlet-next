import { describe, expect, it } from 'vitest';
import { parseBankEmail } from './bank-email-parser.js';

const BCP_BODY = `Realizaste un consumo de S/ 14.50 con tu Tarjeta de Débito BCP en IKF A53 PIURA 21.
Total del consumo\tS/ 14.50
Fecha y hora\t24 de setiembre de 2026 - 06:54 PM
Número de operación\t576278`;

describe('parseBankEmail', () => {
  it('reads amount, merchant, date and reference from a labeled bank email', () => {
    const movement = parseBankEmail(BCP_BODY, 'Constancia de consumo');

    expect(movement).toEqual({
      type: 'expense',
      amount: 14.5,
      currency: 'PEN',
      merchant: 'Ikf A53 Piura 21',
      description: 'Ikf A53 Piura 21',
      transactionDate: '2026-09-24',
      cardLast4: null,
      reference: '576278',
    });
  });

  it('classifies a deposit as income', () => {
    const movement = parseBankEmail('Recibiste una transferencia de S/ 50.00 de Juan Perez.', 'Transferencia recibida');

    expect(movement?.type).toBe('income');
  });

  it('returns null when no amount can be found', () => {
    expect(parseBankEmail('Hola, tenemos ofertas para ti', 'Promo')).toBeNull();
  });
});

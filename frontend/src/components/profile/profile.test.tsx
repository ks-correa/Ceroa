import { describe, it, expect } from 'vitest';
import { validateProfileUpdate, validateEmail } from './profile.validation';

describe('profile.validation', () => {
  describe('validateProfileUpdate', () => {
    it('validates a correct profile update with all fields', () => {
      const errors = validateProfileUpdate({
        fullName: 'Juan Pérez',
        phone: '+573001234567',
        birthDate: '1990-05-15'
      });
      expect(errors).toEqual({});
    });

    it('rejects an empty or whitespace-only fullName', () => {
      const emptyErr = validateProfileUpdate({ fullName: '' });
      expect(emptyErr.fullName).toBeDefined();

      const spaceErr = validateProfileUpdate({ fullName: '   ' });
      expect(spaceErr.fullName).toBeDefined();
    });

    it('rejects an invalid phone format', () => {
      const errors = validateProfileUpdate({
        fullName: 'Valid Name',
        phone: '123'
      });
      expect(errors.phone).toBeDefined();
    });

    it('accepts an empty phone string as valid (optional field)', () => {
      const errors = validateProfileUpdate({
        fullName: 'Valid Name',
        phone: ''
      });
      expect(errors.phone).toBeUndefined();
    });

    it('rejects a future birth date', () => {
      const errors = validateProfileUpdate({
        fullName: 'Valid Name',
        birthDate: '2099-01-01'
      });
      expect(errors.birthDate).toBe('La fecha no puede ser futura.');
    });

    it('rejects an underage birth date (< 18 years)', () => {
      const underageYear = new Date().getFullYear() - 10;
      const errors = validateProfileUpdate({
        fullName: 'Valid Name',
        birthDate: `${underageYear}-01-01`
      });
      expect(errors.birthDate).toBe('Debes tener al menos 18 años.');
    });

    it('accepts a valid birth date (>= 18 years)', () => {
      const validYear = new Date().getFullYear() - 25;
      const errors = validateProfileUpdate({
        fullName: 'Valid Name',
        birthDate: `${validYear}-01-01`
      });
      expect(errors.birthDate).toBeUndefined();
    });
  });

  describe('validateEmail', () => {
    it('returns error for empty email', () => {
      expect(validateEmail('')).toBe('Ingresa el nuevo correo electrónico.');
    });

    it('returns error for invalid email structure', () => {
      expect(validateEmail('invalid-email')).toBe('Ingresa un correo válido, sin espacios.');
    });

    it('returns undefined for valid email', () => {
      expect(validateEmail('nuevo@ejemplo.com')).toBeUndefined();
    });
  });
});


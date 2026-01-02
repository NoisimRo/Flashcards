import { describe, it, expect } from 'vitest';
import {
  SUBJECTS,
  SUBJECT_NAME_TO_ID,
  SUBJECT_ID_TO_NAME,
  getSubjectId,
  getSubjectDisplayName,
} from '../../src/constants/subjects';

describe('Subject Mapping', () => {
  describe('SUBJECTS array', () => {
    it('should contain all 8 subjects', () => {
      expect(SUBJECTS).toHaveLength(8);
    });

    it('should have correct structure for each subject', () => {
      SUBJECTS.forEach(subject => {
        expect(subject).toHaveProperty('id');
        expect(subject).toHaveProperty('displayName');
        expect(subject).toHaveProperty('color');
        expect(subject).toHaveProperty('icon');
        expect(typeof subject.id).toBe('string');
        expect(typeof subject.displayName).toBe('string');
        expect(typeof subject.color).toBe('string');
        expect(typeof subject.icon).toBe('string');
      });
    });

    it('should contain expected subjects', () => {
      const subjectIds = SUBJECTS.map(s => s.id);
      expect(subjectIds).toContain('romana');
      expect(subjectIds).toContain('matematica');
      expect(subjectIds).toContain('istorie');
      expect(subjectIds).toContain('geografie');
      expect(subjectIds).toContain('engleza');
      expect(subjectIds).toContain('biologie');
      expect(subjectIds).toContain('fizica');
      expect(subjectIds).toContain('chimie');
    });
  });

  describe('SUBJECT_NAME_TO_ID mapping', () => {
    it('should map display names to database IDs', () => {
      expect(SUBJECT_NAME_TO_ID['Limba Română']).toBe('romana');
      expect(SUBJECT_NAME_TO_ID['Matematică']).toBe('matematica');
      expect(SUBJECT_NAME_TO_ID['Istorie']).toBe('istorie');
      expect(SUBJECT_NAME_TO_ID['Geografie']).toBe('geografie');
      expect(SUBJECT_NAME_TO_ID['Engleză']).toBe('engleza');
      expect(SUBJECT_NAME_TO_ID['Biologie']).toBe('biologie');
      expect(SUBJECT_NAME_TO_ID['Fizică']).toBe('fizica');
      expect(SUBJECT_NAME_TO_ID['Chimie']).toBe('chimie');
    });

    it('should have exactly 8 mappings', () => {
      expect(Object.keys(SUBJECT_NAME_TO_ID)).toHaveLength(8);
    });
  });

  describe('SUBJECT_ID_TO_NAME mapping', () => {
    it('should map database IDs to display names', () => {
      expect(SUBJECT_ID_TO_NAME['romana']).toBe('Limba Română');
      expect(SUBJECT_ID_TO_NAME['matematica']).toBe('Matematică');
      expect(SUBJECT_ID_TO_NAME['istorie']).toBe('Istorie');
      expect(SUBJECT_ID_TO_NAME['geografie']).toBe('Geografie');
      expect(SUBJECT_ID_TO_NAME['engleza']).toBe('Engleză');
      expect(SUBJECT_ID_TO_NAME['biologie']).toBe('Biologie');
      expect(SUBJECT_ID_TO_NAME['fizica']).toBe('Fizică');
      expect(SUBJECT_ID_TO_NAME['chimie']).toBe('Chimie');
    });

    it('should have exactly 8 mappings', () => {
      expect(Object.keys(SUBJECT_ID_TO_NAME)).toHaveLength(8);
    });

    it('should be bidirectional with SUBJECT_NAME_TO_ID', () => {
      Object.entries(SUBJECT_NAME_TO_ID).forEach(([name, id]) => {
        expect(SUBJECT_ID_TO_NAME[id]).toBe(name);
      });
    });
  });

  describe('getSubjectId', () => {
    it('should convert display name to database ID', () => {
      expect(getSubjectId('Limba Română')).toBe('romana');
      expect(getSubjectId('Matematică')).toBe('matematica');
      expect(getSubjectId('Istorie')).toBe('istorie');
    });

    it('should return default "romana" for unknown subject', () => {
      expect(getSubjectId('Unknown Subject')).toBe('romana');
      expect(getSubjectId('')).toBe('romana');
    });
  });

  describe('getSubjectDisplayName', () => {
    it('should convert database ID to display name', () => {
      expect(getSubjectDisplayName('romana')).toBe('Limba Română');
      expect(getSubjectDisplayName('matematica')).toBe('Matematică');
      expect(getSubjectDisplayName('istorie')).toBe('Istorie');
    });

    it('should return the ID itself for unknown ID', () => {
      expect(getSubjectDisplayName('unknown')).toBe('unknown');
      expect(getSubjectDisplayName('')).toBe('');
    });
  });

  describe('Integration: Round-trip conversion', () => {
    it('should preserve data through round-trip conversion', () => {
      const testCases = [
        'Limba Română',
        'Matematică',
        'Istorie',
        'Geografie',
        'Engleză',
        'Biologie',
        'Fizică',
        'Chimie',
      ];

      testCases.forEach(displayName => {
        const id = getSubjectId(displayName);
        const nameBack = getSubjectDisplayName(id);
        expect(nameBack).toBe(displayName);
      });
    });
  });
});

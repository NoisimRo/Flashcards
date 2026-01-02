// Subject mappings for database integration
// Maps display names (UI) to database IDs and vice versa

export interface Subject {
  id: string;
  displayName: string;
  color: string;
  icon: string;
}

export const SUBJECTS: Subject[] = [
  { id: 'romana', displayName: 'Limba Română', color: '#1f2937', icon: 'book-open' },
  { id: 'matematica', displayName: 'Matematică', color: '#3b82f6', icon: 'calculator' },
  { id: 'istorie', displayName: 'Istorie', color: '#f97316', icon: 'landmark' },
  { id: 'geografie', displayName: 'Geografie', color: '#22c55e', icon: 'globe' },
  { id: 'engleza', displayName: 'Engleză', color: '#8b5cf6', icon: 'languages' },
  { id: 'biologie', displayName: 'Biologie', color: '#10b981', icon: 'leaf' },
  { id: 'fizica', displayName: 'Fizică', color: '#6366f1', icon: 'atom' },
  { id: 'chimie', displayName: 'Chimie', color: '#ec4899', icon: 'flask-conical' },
];

// Map display name to database ID
export const SUBJECT_NAME_TO_ID: Record<string, string> = {
  'Limba Română': 'romana',
  'Matematică': 'matematica',
  'Istorie': 'istorie',
  'Geografie': 'geografie',
  'Engleză': 'engleza',
  'Biologie': 'biologie',
  'Fizică': 'fizica',
  'Chimie': 'chimie',
};

// Map database ID to display name
export const SUBJECT_ID_TO_NAME: Record<string, string> = {
  romana: 'Limba Română',
  matematica: 'Matematică',
  istorie: 'Istorie',
  geografie: 'Geografie',
  engleza: 'Engleză',
  biologie: 'Biologie',
  fizica: 'Fizică',
  chimie: 'Chimie',
};

// Helper function to get subject ID from display name
export function getSubjectId(displayName: string): string {
  return SUBJECT_NAME_TO_ID[displayName] || 'romana';
}

// Helper function to get display name from subject ID
export function getSubjectDisplayName(id: string): string {
  return SUBJECT_ID_TO_NAME[id] || id;
}

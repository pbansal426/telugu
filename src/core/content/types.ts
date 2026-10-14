export interface VocabularyItem {
  id: string;
  te: string;
  roman: string;
  en: string;
  category: 'greetings' | 'conversation' | 'food' | 'survival' | 'family';
  telanganaNote?: string;
  audioPath?: string;
}

export interface LanguagePack {
  id: string;
  name: string;
  language: string;
  dialect?: string;
  version: string;
  description: string;
  items: VocabularyItem[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

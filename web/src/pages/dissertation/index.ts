// Dissertation module barrel exports
export type { Chapter, DocumentType, DocumentTypeConfig, Dissertation, Citation, AIMessage } from './types';
export { DOCUMENT_TYPES, SCIENCE_FIELDS } from './constants';
export { formatCitationGOST, checkUniqueness, generateBibliography } from './utils';
export { getHumanWritingSystemPrompt } from './prompts';
export { exportToPDF } from './exportPDF';

// All AI calls go through the backend API via aiServer.ts.
// Never expose API keys in the frontend bundle.

export const getOpenAI = (): null => null;
export const isOpenAIConfigured = (): boolean => true; // All AI is server-side
export const hasBuiltInKey = (): boolean => true;
export const testOpenAIConnection = async (): Promise<boolean> => true;

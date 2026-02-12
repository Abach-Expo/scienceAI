import { API_URL } from '../config';
import { getAuthorizationHeaders } from './apiClient';

interface PresentationSummary {
  id: string;
  title: string;
  topic: string | null;
  theme: string;
  slideCount: number;
  hasImages: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SavePresentationPayload {
  id?: string;
  title: string;
  topic?: string;
  slides: unknown[];
  theme?: string;
  slideCount?: number;
  hasImages?: boolean;
}

export async function listPresentations(): Promise<PresentationSummary[]> {
  const res = await fetch(`${API_URL}/presentations`, { headers: getAuthorizationHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to list presentations');
  return data.presentations;
}

export async function getPresentation(id: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}/presentations/${id}`, { headers: getAuthorizationHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to get presentation');
  return data.presentation;
}

export async function savePresentation(payload: SavePresentationPayload): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}/presentations`, {
    method: 'POST',
    headers: getAuthorizationHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to save presentation');
  return data.presentation;
}

export async function deletePresentation(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/presentations/${id}`, {
    method: 'DELETE',
    headers: getAuthorizationHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to delete presentation');
}

import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    localStorage.clear();
  });

  it('should start with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should login and set token + user', () => {
    const userData = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    useAuthStore.getState().login('jwt-token-123', userData);

    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-token-123');
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('test@example.com');
    expect(state.user?.name).toBe('Test User');
    expect(state.user?.isLoggedIn).toBe(true);
  });

  it('should set token in localStorage for backward compatibility', () => {
    useAuthStore.getState().login('jwt-token-123', {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(localStorage.getItem('token')).toBe('jwt-token-123');
    const storedUser = JSON.parse(localStorage.getItem('user')!);
    expect(storedUser.email).toBe('test@example.com');
  });

  it('should logout and clear all data', () => {
    useAuthStore.getState().login('jwt-token-123', {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should update user data partially', () => {
    useAuthStore.getState().login('jwt-token-123', {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });

    useAuthStore.getState().updateUser({ name: 'Updated Name', organization: 'MIT' });

    const state = useAuthStore.getState();
    expect(state.user?.name).toBe('Updated Name');
    expect(state.user?.organization).toBe('MIT');
    expect(state.user?.email).toBe('test@example.com'); // unchanged
  });

  it('should provide helper getters', () => {
    useAuthStore.getState().login('jwt-token-123', {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(useAuthStore.getState().getToken()).toBe('jwt-token-123');
    expect(useAuthStore.getState().getUser()?.email).toBe('test@example.com');
    expect(useAuthStore.getState().getUserEmail()).toBe('test@example.com');
  });

  it('should return empty string for email when logged out', () => {
    expect(useAuthStore.getState().getUserEmail()).toBe('');
  });
});

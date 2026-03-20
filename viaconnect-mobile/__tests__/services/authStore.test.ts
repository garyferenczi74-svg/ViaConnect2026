/**
 * Tests for Zustand auth store — session, profile, role, activity tracking.
 */
import { useAuthStore } from '../../src/lib/auth/store';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts with null session/user/profile/role', () => {
      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.role).toBeNull();
    });

    it('starts with isLoading = false after reset', () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('has lastActivity timestamp', () => {
      const state = useAuthStore.getState();
      expect(typeof state.lastActivity).toBe('number');
      expect(state.lastActivity).toBeGreaterThan(0);
    });
  });

  describe('setSession', () => {
    it('sets session and extracts user', () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'token',
      } as any;
      useAuthStore.getState().setSession(mockSession);
      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockSession.user);
    });

    it('clears user when session is null', () => {
      useAuthStore.getState().setSession(null);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('setProfile', () => {
    it('sets profile and maps patient role to consumer', () => {
      useAuthStore.getState().setProfile({ role: 'patient' } as any);
      const state = useAuthStore.getState();
      expect(state.profile).toEqual({ role: 'patient' });
      expect(state.role).toBe('consumer');
    });

    it('maps practitioner role correctly', () => {
      useAuthStore.getState().setProfile({ role: 'practitioner' } as any);
      expect(useAuthStore.getState().role).toBe('practitioner');
    });

    it('maps admin role to practitioner', () => {
      useAuthStore.getState().setProfile({ role: 'admin' } as any);
      expect(useAuthStore.getState().role).toBe('practitioner');
    });

    it('maps unknown role to consumer', () => {
      useAuthStore.getState().setProfile({ role: 'unknown' } as any);
      expect(useAuthStore.getState().role).toBe('consumer');
    });

    it('clears role when profile is null', () => {
      useAuthStore.getState().setProfile(null);
      expect(useAuthStore.getState().role).toBeNull();
    });
  });

  describe('setRole', () => {
    it('directly sets role', () => {
      useAuthStore.getState().setRole('naturopath');
      expect(useAuthStore.getState().role).toBe('naturopath');
    });
  });

  describe('touchActivity', () => {
    it('updates lastActivity timestamp', () => {
      const before = Date.now();
      useAuthStore.getState().touchActivity();
      const { lastActivity } = useAuthStore.getState();
      expect(lastActivity).toBeGreaterThanOrEqual(before);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      useAuthStore.getState().setSession({ user: { id: '1' }, access_token: 'x' } as any);
      useAuthStore.getState().setProfile({ role: 'practitioner' } as any);
      useAuthStore.getState().reset();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.role).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('toggles loading state', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });
});

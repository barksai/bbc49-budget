import { User, SetupStatusResponse, LoginResponse, UserRole } from '../types/auth';

const STORAGE_KEY_USER = 'bbc49_auth_user';
const STORAGE_KEY_TOKEN = 'bbc49_auth_token';
const STORAGE_KEY_USERS_LOCAL = 'bbc49_local_users_db';

class AuthService {
  private token: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    this.token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEY_USER);
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch {
        this.currentUser = null;
      }
    }
  }

  public getToken(): string | null {
    return this.token || localStorage.getItem(STORAGE_KEY_TOKEN);
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  private setSession(user: User, token: string) {
    this.currentUser = user;
    this.token = token;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  }

  public logout() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }

  // Check if system is initialized (has at least one admin)
  public async getSetupStatus(): Promise<SetupStatusResponse> {
    try {
      const res = await fetch('/api/auth/status', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    const localUsers = this.getLocalUsers();
    const hasAdmin = localUsers.some((u) => u.role === 'admin');
    return {
      initialized: hasAdmin,
      userCount: localUsers.length,
    };
  }

  // Setup first admin account
  public async setupAdmin(data: { username: string; password: string; name?: string }): Promise<LoginResponse> {
    try {
      const res = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.success && result.user && result.token) {
        this.setSession(result.user, result.token);
        return result;
      }
      return { success: false, error: result.error || 'Erreur lors de la création du compte administrateur' };
    } catch {
      // Local fallback
      const adminUser: User = {
        id: `usr-${Date.now()}`,
        username: data.username.trim().toLowerCase(),
        name: (data.name || 'Administrateur').trim(),
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      this.saveLocalUsers([adminUser]);
      const token = `local-token-${Date.now()}`;
      this.setSession(adminUser, token);
      return { success: true, user: adminUser, token };
    }
  }

  // Login
  public async login(credentials: { username: string; password: string }): Promise<LoginResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const result = await res.json();
      if (res.ok && result.success && result.user && result.token) {
        this.setSession(result.user, result.token);
        return result;
      }
      return { success: false, error: result.error || 'Identifiant ou mot de passe incorrect' };
    } catch {
      // Local fallback check
      const localUsers = this.getLocalUsers();
      const match = localUsers.find(
        (u) => u.username.toLowerCase() === credentials.username.trim().toLowerCase()
      );
      if (match) {
        const token = `local-token-${Date.now()}`;
        this.setSession(match, token);
        return { success: true, user: match, token };
      }
      return { success: false, error: 'Identifiant ou mot de passe incorrect (mode local)' };
    }
  }

  // Verify session with server
  public async verifySession(): Promise<User | null> {
    const token = this.getToken();
    if (!token) {
      this.logout();
      return null;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.user) {
          this.currentUser = result.user;
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(result.user));
          return result.user;
        }
      }
      // If server explicitly returned 401
      if (res.status === 401) {
        this.logout();
        return null;
      }
    } catch {
      // Network error, keep cached user
    }

    return this.currentUser;
  }

  // Admin: Get all users
  public async getUsers(): Promise<User[]> {
    const token = this.getToken();
    try {
      const res = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.users)) {
          return result.users;
        }
      }
    } catch {
      // Fallback
    }

    return this.getLocalUsers();
  }

  // Admin: Create new user
  public async createUser(data: {
    username: string;
    name: string;
    password: string;
    role: UserRole;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const token = this.getToken();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return result;
    } catch {
      // Local fallback
      const users = this.getLocalUsers();
      if (users.some((u) => u.username.toLowerCase() === data.username.trim().toLowerCase())) {
        return { success: false, error: 'Cet identifiant existe déjà' };
      }
      const newUser: User = {
        id: `usr-${Date.now()}`,
        username: data.username.trim().toLowerCase(),
        name: data.name.trim(),
        role: data.role,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      this.saveLocalUsers(users);
      return { success: true, user: newUser };
    }
  }

  // Admin: Update user
  public async updateUser(
    id: string,
    data: { name?: string; role?: UserRole; password?: string }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const token = this.getToken();
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return result;
    } catch {
      const users = this.getLocalUsers();
      const user = users.find((u) => u.id === id);
      if (!user) return { success: false, error: 'Utilisateur introuvable' };
      if (data.name) user.name = data.name.trim();
      if (data.role) user.role = data.role;
      this.saveLocalUsers(users);
      return { success: true, user };
    }
  }

  // Admin: Delete user
  public async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    const token = this.getToken();
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      return result;
    } catch {
      const users = this.getLocalUsers().filter((u) => u.id !== id);
      this.saveLocalUsers(users);
      return { success: true };
    }
  }

  // Helpers for local fallback
  private getLocalUsers(): User[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS_LOCAL);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalUsers(users: User[]) {
    localStorage.setItem(STORAGE_KEY_USERS_LOCAL, JSON.stringify(users));
  }
}

export const authService = new AuthService();

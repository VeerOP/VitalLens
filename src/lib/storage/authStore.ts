/**
 * VitalLens Storage - User Authentication & Session Store
 *
 * Provides persistent authentication, user registration, credential validation,
 * and session state management with local persistence.
 *
 * Pre-configured credentials:
 * Username: admin
 * Password: admin123
 */

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'Administrator' | 'Clinician' | 'Patient';
  avatarInitials: string;
  createdAt: number;
  lastLoginAt: number;
}

interface StoredAccount extends AuthUser {
  passwordHash: string; // Plain/stored credential hash for offline client app
}

const USERS_STORAGE_KEY = 'vitallens_users_v1';
const SESSION_STORAGE_KEY = 'vitallens_current_user_v1';
const AUTH_EVENT_KEY = 'vitallens_auth_change';

// Default Admin Credentials
export const DEFAULT_ADMIN_USER = {
  username: 'admin',
  password: 'admin123',
  fullName: 'Clinical Administrator',
  email: 'admin@vitallens.health',
  role: 'Administrator' as const,
};

function getStoredUsers(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredAccount[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users to localStorage', e);
  }
}

/**
 * Initializes and ensures the default admin account exists.
 */
export function initializeAuthStore(): StoredAccount[] {
  let users = getStoredUsers();
  const adminExists = users.some(
    (u) => u.username.toLowerCase() === DEFAULT_ADMIN_USER.username.toLowerCase()
  );

  if (!adminExists) {
    const adminAccount: StoredAccount = {
      id: 'usr-admin-system-001',
      username: DEFAULT_ADMIN_USER.username,
      passwordHash: DEFAULT_ADMIN_USER.password,
      fullName: DEFAULT_ADMIN_USER.fullName,
      email: DEFAULT_ADMIN_USER.email,
      role: DEFAULT_ADMIN_USER.role,
      avatarInitials: 'AD',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    users = [adminAccount, ...users];
    saveStoredUsers(users);
  }

  return users;
}

/**
 * Retrieves the currently authenticated session user, or null if unauthenticated.
 */
export function getCurrentUser(): AuthUser | null {
  try {
    initializeAuthStore();
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function notifyAuthChange(user: AuthUser | null) {
  window.dispatchEvent(
    new CustomEvent(AUTH_EVENT_KEY, {
      detail: { user },
    })
  );
}

export function subscribeAuth(callback: (user: AuthUser | null) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ user: AuthUser | null }>;
    callback(custom.detail.user);
  };
  window.addEventListener(AUTH_EVENT_KEY, handler);
  return () => window.removeEventListener(AUTH_EVENT_KEY, handler);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'VL';
}

/**
 * Attempt to log in with username and password.
 */
export function loginUser(
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: AuthUser; error?: string } {
  const username = usernameInput.trim();
  const password = passwordInput;

  if (!username) {
    return { success: false, error: 'Please enter your username.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  const users = initializeAuthStore();
  const match = users.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() ||
      (u.email && u.email.toLowerCase() === username.toLowerCase())
  );

  if (!match) {
    return {
      success: false,
      error: 'Account not found. Please check your credentials or register a new account.',
    };
  }

  if (match.passwordHash !== password) {
    return {
      success: false,
      error: 'Incorrect password. Please verify and try again.',
    };
  }

  // Update last login
  const updatedAccount: StoredAccount = {
    ...match,
    lastLoginAt: Date.now(),
  };

  const updatedUsers = users.map((u) => (u.id === match.id ? updatedAccount : u));
  saveStoredUsers(updatedUsers);

  const { passwordHash: _, ...authUser } = updatedAccount;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
  } catch (e) {
    console.error('Failed to set current user session', e);
  }

  notifyAuthChange(authUser);
  return { success: true, user: authUser };
}

/**
 * Register a new user account.
 */
export function registerUser(params: {
  fullName: string;
  username: string;
  email?: string;
  password: string;
  role?: 'Clinician' | 'Patient';
}): { success: boolean; user?: AuthUser; error?: string } {
  const fullName = params.fullName.trim();
  const username = params.username.trim();
  const email = (params.email || '').trim();
  const password = params.password;
  const role = params.role || 'Clinician';

  if (!fullName) {
    return { success: false, error: 'Please enter your full name.' };
  }
  if (!username || username.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return {
      success: false,
      error: 'Username can only contain letters, numbers, dots, and hyphens.',
    };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const users = initializeAuthStore();

  const isUsernameTaken = users.some(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (isUsernameTaken) {
    return { success: false, error: `The username "${username}" is already taken.` };
  }

  if (email) {
    const isEmailTaken = users.some(
      (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
    );
    if (isEmailTaken) {
      return { success: false, error: `An account with email "${email}" already exists.` };
    }
  }

  const newAccount: StoredAccount = {
    id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    username,
    passwordHash: password,
    fullName,
    email: email || `${username}@vitallens.local`,
    role,
    avatarInitials: getInitials(fullName),
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  const updatedUsers = [newAccount, ...users];
  saveStoredUsers(updatedUsers);

  const { passwordHash: _, ...authUser } = newAccount;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
  } catch (e) {
    console.error('Failed to set session', e);
  }

  notifyAuthChange(authUser);
  return { success: true, user: authUser };
}

/**
 * Log out current session.
 */
export function logoutUser(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
  notifyAuthChange(null);
}

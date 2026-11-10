export const ROLE_PRIORITY = ['super_admin', 'admin', 'inventory_manager', 'delivery_manager', 'kitchen_staff', 'cashier', 'staff', 'rider', 'customer'] as const;
export type Role = typeof ROLE_PRIORITY[number];
export function resolveRole(roles: string[]): Role | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}
export const adminRole = (role: Role | null) => role === 'admin' || role === 'super_admin';
export function safeDestination(value?: string): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return undefined;
  const url = new URL(value, 'https://internal.invalid');
  if (url.origin !== 'https://internal.invalid' || ['/auth', '/reset-password'].includes(url.pathname)) return undefined;
  return url.pathname + url.search + url.hash;
}
export function loginDestination(role: Role | null, intended?: string) {
  const target = safeDestination(intended);
  if (adminRole(role)) return target?.startsWith('/admin') ? target : '/admin';
  if (target?.startsWith('/admin')) return '/account';
  if (role === 'customer') return target ?? '/account';
  return '/account';
}
export function validateRegistration(input: { name: string; email: string; phone: string; password: string; confirmation: string }) {
  if (!input.name.trim()) return 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Enter a valid email address.';
  if (!/^(?:\+?254|0)[71]\d{8}$/.test(input.phone.replace(/\s/g, ''))) return 'Enter a valid Kenyan phone number.';
  if (input.password.length < 8) return 'Use a password with at least 8 characters.';
  if (input.password !== input.confirmation) return 'Passwords do not match.';
  return null;
}
export function authError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login|invalid credentials/i.test(message)) return 'Incorrect email or password.';
  if (/email not confirmed|verification required/i.test(message)) return 'Verify your email before signing in.';
  if (/already registered|already exists/i.test(message)) return 'This email is already registered. Sign in or reset your password.';
  if (/weak|password.*(short|least)/i.test(message)) return 'Choose a stronger password with at least 8 characters.';
  if (/rate.limit|after \d+ seconds|429/i.test(message)) return 'Please wait a minute before requesting another email.';
  if (/network|fetch|connection/i.test(message)) return 'Connection failed. Check your internet and try again.';
  if (/unauthorized|invalid token|session expired/i.test(message)) return 'Your session has expired. Please sign in again.';
  if (/profile not found/i.test(message)) return 'Your profile could not be loaded. Please try again.';
  if (/permission|row.level/i.test(message)) return 'Your account does not have permission for this action.';
  return 'We could not complete this request. Please try again.';
}
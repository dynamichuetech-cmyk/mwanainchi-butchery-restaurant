import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { getAuthIdentity } from './auth.functions';
import { adminRole, authError, type Role, validateRegistration } from './auth-rules';

type State = { user: User | null; session: Session | null; profile: Database['public']['Tables']['profiles']['Row'] | null; role: Role | null; isLoading: boolean; error: string | null };
const initial: State = { user: null, session: null, profile: null, role: null, isLoading: true, error: null };
let state = initial;
let revision = 0;
const listeners = new Set<() => void>();
const publish = (next: State) => { state = next; listeners.forEach((fn) => fn()); };

let pending: { token: string; promise: Promise<State> } | null = null;
function hydrate(session: Session | null): Promise<State> {
  if (session && pending?.token === session.access_token) return pending.promise;
  const promise = loadIdentity(session);
  if (session) {
    pending = { token: session.access_token, promise };
    void promise.finally(() => { if (pending?.promise === promise) pending = null; });
  }
  return promise;
}
async function loadIdentity(session: Session | null) {
  const version = ++revision;
  if (!session) { publish({ ...initial, isLoading: false }); return state; }
  publish({ ...initial, session, isLoading: true });
  try {
    const identity = await getAuthIdentity();
    if (version === revision) publish({ ...identity, session, isLoading: false, error: null });
  } catch (error) {
    if (version === revision) publish({ ...initial, session, isLoading: false, error: authError(error) });
  }
  return state;
}
async function refreshProfile() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return hydrate(data.session);
}
async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  const resolved = await hydrate(data.session);
  if (!resolved.user || resolved.error) throw new Error(resolved.error ?? 'Session expired');
  return resolved;
}
async function register(input: { name: string; email: string; phone: string; password: string; confirmation: string }) {
  const invalid = validateRegistration(input);
  if (invalid) throw new Error(invalid);
  const { data, error } = await supabase.auth.signUp({ email: input.email.trim(), password: input.password, options: { emailRedirectTo: window.location.origin + '/auth', data: { full_name: input.name.trim(), phone: input.phone.trim() } } });
  if (error) throw error;
  if (data.user?.identities?.length === 0) throw new Error('Email already registered');
  if (data.session) return { pendingVerification: false, identity: await hydrate(data.session) };
  return { pendingVerification: true, identity: null };
}
async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) { publish({ ...initial, isLoading: false, error: authError(error) }); throw error; }
  return hydrate(data.session);
}
type Auth = State & { isAuthenticated: boolean; isAdmin: boolean; isCustomer: boolean; isRider: boolean; login: typeof login; register: typeof register; logout: () => Promise<void>; refreshSession: typeof refreshSession; refreshProfile: typeof refreshProfile };
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => state, () => initial);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    let previousId: string | undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Return immediately: auth methods must never be awaited inside the auth lock.
      if (event === 'TOKEN_REFRESHED' && state.user?.id === session?.user.id) {
        publish({ ...state, session }); return;
      }
      if (!['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event)) return;
      if (event === 'SIGNED_IN' && state.user?.id === session?.user.id && !state.isLoading) return;
      setTimeout(() => {
        if (!active) return;
        void (async () => {
          if (previousId && previousId !== session?.user.id) { await queryClient.cancelQueries(); queryClient.clear(); }
          previousId = session?.user.id;
          await hydrate(session);
          if (!active) return;
          await router.invalidate();
          if (event === 'USER_UPDATED') await queryClient.invalidateQueries();
        })();
      }, 0);
    });
    void refreshProfile().catch(() => { if (active) publish({ ...initial, isLoading: false, error: "Connection failed. Please try again." }); });
    return () => { active = false; ++revision; data.subscription.unsubscribe(); };
  }, [queryClient, router]);
  const logout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    ++revision;
    publish({ ...initial, isLoading: false });
    await router.navigate({ to: '/auth', replace: true });
  };
  return <AuthContext.Provider value={{ ...snapshot, isAuthenticated: !!snapshot.user && !snapshot.isLoading, isAdmin: adminRole(snapshot.role), isCustomer: snapshot.role === 'customer', isRider: snapshot.role === 'rider', login, register, logout, refreshProfile, refreshSession }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('Authentication provider missing');
  return auth;
}
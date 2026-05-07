import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
  SUPABASE_PUBLIC_ENV_MESSAGE,
} from './supabase-public-env';

let _client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = getPublicSupabaseUrl();
  const key = getPublicSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(SUPABASE_PUBLIC_ENV_MESSAGE);
  }
  _client = createClient(url, key);
  return _client;
}

/** Lazy Supabase client — safe to import without env at module load time */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const c = getClient();
    const value = Reflect.get(c, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(c);
    }
    return value;
  },
});

export async function getCurrentUser() {
  const { data: { user } } = await getClient().auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await getClient()
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: Record<string, any>) {
  const { data, error } = await getClient()
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

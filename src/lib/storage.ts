import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem(TOKEN_KEY); }
  catch { return null; }
}

export async function setToken(token: string): Promise<void> {
  try { await AsyncStorage.setItem(TOKEN_KEY, token); }
  catch {}
}

export async function removeToken(): Promise<void> {
  try { await AsyncStorage.removeItem(TOKEN_KEY); }
  catch {}
}
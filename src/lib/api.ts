// ~/verblizrRN/src/lib/api.ts
import axios from 'axios';
import { Platform } from 'react-native';

const DEV_HOST =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000'   // Android emulator
    : 'http://192.168.40.23:4000'; // iOS simulator - use host machine IP

const BASE = __DEV__ ? DEV_HOST : 'https://your-prod-api.example.com';

export const API = axios.create({
  baseURL: `${BASE}/api`,   // <-- IMPORTANT: keep /api here
  withCredentials: true,
});

// TEMP debug: log full URL + status for each request
API.interceptors.request.use(cfg => {
  const full = (API.defaults.baseURL || '') + (cfg.url || '');
  console.log('[API:req]', cfg.method?.toUpperCase(), full);
  return cfg;
});
API.interceptors.response.use(
  res => {
    console.log('[API:res]', res.status, res.config.url);
    return res;
  },
  err => {
    const url = err?.config?.url;
    const status = err?.response?.status ?? 'NO_RESPONSE';
    const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
    console.log('[API:err]', status, url, msg);
    throw err;
  }
);

// import { API, setAuthToken } from '../../lib/api';

// export type LoginRequest = { email: string; password: string };
// export type LoginResponse = { token: string; user: { id: string; email: string; name?: string } };

// export async function login(req: LoginRequest): Promise<LoginResponse> {
//   // hit the correct backend path
//   const { data } = await API.post<LoginResponse>('/auth/login', req);

//   // critical: set bearer so future requests (billing) run as this user
//   setAuthToken(data.token);

//   return data;
// }



import { API } from '../../lib/api';
export type LoginRequest = { email: string; password: string };
export type LoginResponse = { token: string; user: { id: string; email: string; name?: string } };

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const { data } = await API.post<LoginResponse>('/auth/login', req);
    return data;
}
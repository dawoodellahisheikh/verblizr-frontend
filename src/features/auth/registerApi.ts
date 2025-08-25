import {API} from '../../lib/api';

// DES Added: Updated RegisterPayload to include phoneNumber field
export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
};
export type RegisterResponse = { token: string; user: { id: string; email: string; name?: string } };

export async function registerUser(body: RegisterPayload): Promise<RegisterResponse> {
  const {data} = await API.post<RegisterResponse>('/auth/register', body);
  return data;
}

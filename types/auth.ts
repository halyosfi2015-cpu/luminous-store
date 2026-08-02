export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  building: string;
  isDefault: boolean;
};

export type AuthState = {
  user: User | null;
  isLoggedIn: boolean;
};

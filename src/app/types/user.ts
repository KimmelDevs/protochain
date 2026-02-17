export interface UserData {

  id?: string;        // ← Add this (Firestore document ID)
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  role: 'resident' | 'admin';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
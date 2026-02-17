import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

// Register new user
// Update createDocumentRequest in firestore.ts to include extra fields
export const registerUser = async (
  email: string,
  password: string,
  userData: {
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
    role?: 'resident' | 'admin';
  }
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      address: userData.address || '',
      role: userData.role || 'resident',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.code };
  }
};

// Login user
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    return { success: true, user, userData };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
};

// Get current user data
export const getCurrentUserData = async (user: User) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.data();
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './config';

// ============= USERS =============

// Get user data by UID
export const getUserById = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found', user: null };
    }
    return { 
      success: true, 
      user: { id: userDoc.id, ...userDoc.data() } as Record<string, any>,
      error: null 
    };
  } catch (error: any) {
    console.error('Error getting user:', error);
    return { success: false, error: error.message, user: null };
  }
};

// Get all users (Admin)
export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, users };
  } catch (error: any) {
    console.error('Error getting users:', error);
    return { success: false, error: error.message };
  }
};

// Update user data
export const updateUserData = async (uid: string, data: any) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
};

// ============= DOCUMENT REQUESTS =============

// Create document request
export const createDocumentRequest = async (userId: string, requestData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'documentRequests'), {
      userId,
      ...requestData,
      status: 'pending',
      priority: 'normal',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error creating request:', error);
    return { success: false, error: error.message };
  }
};

// Get single request by ID
export const getRequestById = async (requestId: string) => {
  try {
    const requestDoc = await getDoc(doc(db, 'documentRequests', requestId));
    if (!requestDoc.exists()) {
      return { success: false, error: 'Request not found' };
    }
    return { success: true, request: { id: requestDoc.id, ...requestDoc.data() } };
  } catch (error: any) {
    console.error('Error getting request:', error);
    return { success: false, error: error.message };
  }
};

// Get all requests for a user
export const getUserRequests = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'documentRequests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, requests };
  } catch (error: any) {
    console.error('Error getting user requests:', error);
    return { success: false, error: error.message };
  }
};

// Get all pending requests (Admin)
export const getPendingRequests = async () => {
  try {
    const q = query(
      collection(db, 'documentRequests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, requests };
  } catch (error: any) {
    console.error('Error getting pending requests:', error);
    return { success: false, error: error.message };
  }
};

// Get all requests (Admin)
export const getAllRequests = async () => {
  try {
    const q = query(
      collection(db, 'documentRequests'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, requests };
  } catch (error: any) {
    console.error('Error getting all requests:', error);
    return { success: false, error: error.message };
  }
};

// Get rejected requests (Admin)
export const getRejectedRequests = async () => {
  try {
    const q = query(
      collection(db, 'documentRequests'),
      where('status', '==', 'rejected'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, requests };
  } catch (error: any) {
    console.error('Error getting rejected requests:', error);
    return { success: false, error: error.message };
  }
};

// Update request status (Approve/Reject)
export const updateRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected',
  notes?: string,
  processedBy?: string
) => {
  try {
    await updateDoc(doc(db, 'documentRequests', requestId), {
      status,
      notes: notes || '',
      processedBy: processedBy || '',
      processedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating request status:', error);
    return { success: false, error: error.message };
  }
};

// ============= APPROVED DOCUMENTS =============

// Create approved document
export const createApprovedDocument = async (documentData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'approvedDocuments'), {
      ...documentData,
      issuedAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error creating document:', error);
    return { success: false, error: error.message };
  }
};

// Get single document by ID
export const getDocumentById = async (documentId: string) => {
  try {
    const documentDoc = await getDoc(doc(db, 'approvedDocuments', documentId));
    if (!documentDoc.exists()) {
      return { success: false, error: 'Document not found' };
    }
    return { success: true, document: { id: documentDoc.id, ...documentDoc.data() } };
  } catch (error: any) {
    console.error('Error getting document:', error);
    return { success: false, error: error.message };
  }
};

// Get all documents for a user
export const getUserDocuments = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'approvedDocuments'),
      where('userId', '==', userId),
      orderBy('issuedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, documents };
  } catch (error: any) {
    console.error('Error getting user documents:', error);
    return { success: false, error: error.message };
  }
};

// Get all approved documents (Admin)
export const getAllApprovedDocuments = async () => {
  try {
    const q = query(
      collection(db, 'approvedDocuments'),
      orderBy('issuedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, documents };
  } catch (error: any) {
    console.error('Error getting approved documents:', error);
    return { success: false, error: error.message };
  }
};

// Verify document by QR code
export const verifyDocumentByQR = async (qrCode: string) => {
  try {
    const q = query(
      collection(db, 'approvedDocuments'),
      where('qrCode', '==', qrCode)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Document not found or invalid QR code' };
    }

    const documentDoc = querySnapshot.docs[0];
    return { 
      success: true, 
      document: { id: documentDoc.id, ...documentDoc.data() } 
    };
  } catch (error: any) {
    console.error('Error verifying document:', error);
    return { success: false, error: error.message };
  }
};
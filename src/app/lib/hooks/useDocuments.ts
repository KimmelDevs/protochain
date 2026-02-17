'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  createDocumentRequest,
  getUserRequests,
  getUserDocuments,
  getPendingRequests,
  getAllRequests,
  getAllApprovedDocuments,
  updateRequestStatus,
} from '@/app/firebase/firestore';

export const useDocuments = () => {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // If no user, stop loading and return empty
    if (!user) {
      setRequests([]);
      setDocuments([]);
      setLoading(false);
      return;
    }

    fetchUserData();
  }, [user, authLoading]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [requestsResult, documentsResult] = await Promise.all([
        getUserRequests(user.uid),
        getUserDocuments(user.uid),
      ]);

      setRequests(requestsResult.success ? (requestsResult.requests ?? []) : []);
      setDocuments(documentsResult.success ? (documentsResult.documents ?? []) : []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setRequests([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async (requestData: any) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const result = await createDocumentRequest(user.uid, requestData);
    if (result.success) {
      await fetchUserData();
    }
    return result;
  };

  return {
    requests,
    documents,
    loading,
    submitRequest,
    refreshData: fetchUserData,
  };
};

export const useAdminDocuments = () => {
  const { loading: authLoading } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [approvedDocuments, setApprovedDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    fetchAdminData();
  }, [authLoading]);

  const fetchAdminData = async () => {
    setLoading(true);

    try {
      const [pendingResult, allResult, approvedResult] = await Promise.all([
        getPendingRequests(),
        getAllRequests(),
        getAllApprovedDocuments(),
      ]);

      setPendingRequests(pendingResult.success ? (pendingResult.requests ?? []) : []);
      setAllRequests(allResult.success ? (allResult.requests ?? []) : []);
      setApprovedDocuments(approvedResult.success ? (approvedResult.documents ?? []) : []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setPendingRequests([]);
      setAllRequests([]);
      setApprovedDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string, notes?: string, processedBy?: string) => {
    const result = await updateRequestStatus(requestId, 'approved', notes, processedBy);
    if (result.success) await fetchAdminData();
    return result;
  };

  const rejectRequest = async (requestId: string, reason: string, processedBy?: string) => {
    const result = await updateRequestStatus(requestId, 'rejected', reason, processedBy);
    if (result.success) await fetchAdminData();
    return result;
  };

  return {
    pendingRequests,
    allRequests,
    approvedDocuments,
    loading,
    approveRequest,
    rejectRequest,
    refreshData: fetchAdminData,
  };
};
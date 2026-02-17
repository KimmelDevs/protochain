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

// Hook for resident document features
export const useDocuments = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);

    const [requestsResult, documentsResult] = await Promise.all([
      getUserRequests(user.uid),
      getUserDocuments(user.uid),
    ]);

    if (requestsResult.success) {
      setRequests(requestsResult.requests || []);
    }
    if (documentsResult.success) {
      setDocuments(documentsResult.documents || []);
    }

    setLoading(false);
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

// Hook for admin document features
export const useAdminDocuments = () => {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [approvedDocuments, setApprovedDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);

    const [pendingResult, allResult, approvedResult] = await Promise.all([
      getPendingRequests(),
      getAllRequests(),
      getAllApprovedDocuments(),
    ]);

    if (pendingResult.success) setPendingRequests(pendingResult.requests || []);
    if (allResult.success) setAllRequests(allResult.requests || []);
    if (approvedResult.success) setApprovedDocuments(approvedResult.documents || []);

    setLoading(false);
  };

  const approveRequest = async (requestId: string, notes?: string, processedBy?: string) => {
    const result = await updateRequestStatus(requestId, 'approved', notes, processedBy);
    if (result.success) {
      await fetchAdminData();
    }
    return result;
  };

  const rejectRequest = async (requestId: string, reason: string, processedBy?: string) => {
    const result = await updateRequestStatus(requestId, 'rejected', reason, processedBy);
    if (result.success) {
      await fetchAdminData();
    }
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
}
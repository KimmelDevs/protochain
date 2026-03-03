'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';

export const useDocuments = () => {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
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
      const [{ data: requestsData }, { data: documentsData }] = await Promise.all([
        supabase.from('requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setRequests(requestsData ?? []);
      setDocuments(documentsData ?? []);
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
    const { error } = await supabase.from('requests').insert({
      ...requestData,
      user_id: user.id,
      status: 'pending',
    });
    if (error) return { success: false, error: error.message };
    await fetchUserData();
    return { success: true };
  };

  return { requests, documents, loading, submitRequest, refreshData: fetchUserData };
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
      const [{ data: pending }, { data: all }, { data: approved }] = await Promise.all([
        supabase.from('requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('requests').select('*').order('created_at', { ascending: false }),
        supabase.from('documents').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
      ]);
      setPendingRequests(pending ?? []);
      setAllRequests(all ?? []);
      setApprovedDocuments(approved ?? []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string, notes?: string, processedBy?: string) => {
    const { error } = await supabase.from('requests').update({
      status: 'approved',
      notes,
      processed_by: processedBy,
      processed_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) return { success: false, error: error.message };
    await fetchAdminData();
    return { success: true };
  };

  const rejectRequest = async (requestId: string, reason: string, processedBy?: string) => {
    const { error } = await supabase.from('requests').update({
      status: 'rejected',
      notes: reason,
      processed_by: processedBy,
      processed_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) return { success: false, error: error.message };
    await fetchAdminData();
    return { success: true };
  };

  return { pendingRequests, allRequests, approvedDocuments, loading, approveRequest, rejectRequest, refreshData: fetchAdminData };
};
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';

// ─── Upload file to Supabase Storage ─────────────────────────────────────────
export const uploadRequestFile = async (userId: string, file: File): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Upload error:', error.message);
    return null;
  }

  return filePath;
};

// ─── Get signed URL for a private file ───────────────────────────────────────
export const getFileUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

  if (error) return null;
  return data.signedUrl;
};

// ─── Resident hook ────────────────────────────────────────────────────────────
export const useDocuments = () => {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }
    fetchUserData();
  }, [user, authLoading]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data ?? []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async (requestData: {
    type: string;
    purpose?: string;
    priority?: string;
    file?: File;
  }) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    let file_url: string | null = null;

    // Upload file if provided
    if (requestData.file) {
      file_url = await uploadRequestFile(user.id, requestData.file);
      if (!file_url) return { success: false, error: 'File upload failed' };
    }

    const { error } = await supabase.from('requests').insert({
      user_id: user.id,
      type: requestData.type,
      purpose: requestData.purpose ?? null,
      priority: requestData.priority ?? 'normal',
      status: 'pending',
      file_url,
    });

    if (error) return { success: false, error: error.message };

    await fetchUserData();
    return { success: true };
  };

  return { requests, loading, submitRequest, refreshData: fetchUserData };
};

// ─── Admin hook ───────────────────────────────────────────────────────────────
export const useAdminDocuments = () => {
  const { loading: authLoading } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalResidents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    fetchAdminData();
  }, [authLoading]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [
        { data: all },
        { data: pending },
        { count: residentCount },
      ] = await Promise.all([
        supabase
          .from('requests')
          .select('*, profiles(firstName, lastName, email)')
          .order('created_at', { ascending: false }),
        supabase
          .from('requests')
          .select('*, profiles(firstName, lastName, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'resident'),
      ]);

      const allData = all ?? [];
      setAllRequests(allData);
      setPendingRequests(pending ?? []);
      setStats({
        total: allData.length,
        pending: allData.filter((r) => r.status === 'pending').length,
        approved: allData.filter((r) => r.status === 'approved').length,
        rejected: allData.filter((r) => r.status === 'rejected').length,
        totalResidents: residentCount ?? 0,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string, notes?: string, processedBy?: string) => {
    const { error } = await supabase
      .from('requests')
      .update({
        status: 'approved',
        notes: notes ?? null,
        processed_by: processedBy ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) return { success: false, error: error.message };
    await fetchAdminData();
    return { success: true };
  };

  const rejectRequest = async (requestId: string, reason: string, processedBy?: string) => {
    const { error } = await supabase
      .from('requests')
      .update({
        status: 'rejected',
        notes: reason,
        processed_by: processedBy ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) return { success: false, error: error.message };
    await fetchAdminData();
    return { success: true };
  };

  return {
    pendingRequests,
    allRequests,
    stats,
    loading,
    approveRequest,
    rejectRequest,
    refreshData: fetchAdminData,
  };
};
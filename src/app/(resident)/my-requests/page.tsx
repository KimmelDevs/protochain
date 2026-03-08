'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { Search, Eye, FileText, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface Request {
  id: string;
  type: string;
  document_type: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  purpose: string;
  custom_purpose: string | null;
}

export default function MyRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(false);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    setDarkMode(savedTheme === 'dark');
  }, []);

  // Apply theme
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Load user requests
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data, error } = await supabase
          .from('requests')
          .select('id, type, document_type, status, created_at, processed_at, purpose, custom_purpose')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(data ?? []);
      } catch (err) {
        console.error('Failed to load requests:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const filtered = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = r.id.toLowerCase().includes(q) || (r.type ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const count = (status: string) => requests.filter(r => r.status === status).length;
  const displayPurpose = (r: Request) =>
    r.purpose === 'others' && r.custom_purpose ? r.custom_purpose : r.purpose ?? '—';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f23] transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#0f0f23] transition-colors duration-300 text-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Requests</h1>
          <p className="text-gray-500 dark:text-gray-400">Track and manage all your document requests</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: requests.length, color: 'text-gray-900 dark:text-white' },
            { label: 'Pending', value: count('pending'), color: 'text-yellow-400' },
            { label: 'Approved', value: count('approved'), color: 'text-green-400' },
            { label: 'Rejected', value: count('rejected'), color: 'text-red-400' },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
            </CardContent></Card>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by ID or document type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Fixed Select usage: no darkMode prop */}
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader><CardTitle>All Requests ({filtered.length})</CardTitle></CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-medium mb-1">No requests yet</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">You haven't submitted any document requests.</p>
                  <Link href="/request-document">
                    <button className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                      Request a Document
                    </button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Date Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                          No requests match your search
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-mono text-xs">{req.id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                              {req.type ?? req.document_type ?? '—'}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{displayPurpose(req)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              {new Date(req.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={req.status as any}>{req.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/my-requests/${req.id}`}>
                              <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm">
                                <Eye className="w-4 h-4" />View
                              </button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { Search, Eye, FileText, User, Calendar, Loader2, Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Request {
  id: string;
  type: string;
  document_type: string;
  purpose: string;
  custom_purpose: string | null;
  created_at: string;
  processed_at: string | null;
  file_url: string | null;
  notes: string | null;
  user_id: string;
  profiles: Profile | null;
}

export default function ApprovedDocumentsPage() {

  const router = useRouter();

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {

    const load = async () => {

      try {

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const reqRes = await fetch('/api/requests?status=approved');
        if (!reqRes.ok) throw new Error('Failed to fetch approved requests');

        const reqJson = await reqRes.json();
        const approved: any[] = reqJson.data ?? [];

        if (approved.length === 0) {
          setRequests([]);
          return;
        }

        const userIds = [...new Set(approved.map((r: any) => r.user_id))];

        const profileEntries = await Promise.all(
          userIds.map(async (uid) => {

            try {

              const res = await fetch(`/api/profile?id=${uid}`);
              if (!res.ok) return null;

              const json = await res.json();
              const p = json.data;

              if (!p) return null;

              const profile: Profile = {
                id: uid,
                firstName: p.firstName ?? p.first_name ?? '',
                lastName: p.lastName ?? p.last_name ?? '',
                email: p.email ?? '',
              };

              return [uid, profile] as [string, Profile];

            } catch {
              return null;
            }

          })
        );

        const profileMap: Record<string, Profile> = Object.fromEntries(
          (profileEntries.filter(Boolean) as [string, Profile][])
        );

        setRequests(
          approved.map((r: any) => ({
            ...r,
            profiles: profileMap[r.user_id] ?? null,
          }))
        );

      } catch (err: any) {
        console.error('[approved] error:', err?.message);
      } finally {
        setLoading(false);
      }

    };

    load();

  }, [router]);

  const isToday = (dateStr: string) =>
    new Date(dateStr).toDateString() === new Date().toDateString();

  const isThisWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek;
  };

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const isThisYear = (dateStr: string) =>
    new Date(dateStr).getFullYear() === new Date().getFullYear();

  const filtered = requests.filter((r) => {

    const name = r.profiles ? `${r.profiles.firstName} ${r.profiles.lastName}` : '';
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      r.id.toLowerCase().includes(q) ||
      name.toLowerCase().includes(q) ||
      (r.type ?? '').toLowerCase().includes(q);

    const matchesType =
      typeFilter === 'all' || r.type === typeFilter;

    const dateRef = r.processed_at ?? r.created_at;

    const matchesDate =
      dateFilter === 'all' ||
      (dateFilter === 'today' && isToday(dateRef)) ||
      (dateFilter === 'week' && isThisWeek(dateRef)) ||
      (dateFilter === 'month' && isThisMonth(dateRef));

    return matchesSearch && matchesType && matchesDate;

  });

  const uniqueTypes = ['all', ...Array.from(new Set(requests.map(r => r.type).filter(Boolean)))];

  const displayPurpose = (r: Request) =>
    r.purpose === 'others' && r.custom_purpose ? r.custom_purpose : r.purpose ?? '—';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f23]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 dark:text-orange-400" />
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23] p-4 lg:p-8 transition-colors">

      <div className="max-w-7xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Approved Documents
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all approved barangay documents
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >

          {[
            { label: 'Total Approved', value: requests.length, color: 'text-gray-900 dark:text-white' },
            { label: 'This Week', value: requests.filter(r => isThisWeek(r.processed_at ?? r.created_at)).length, color: 'text-green-500 dark:text-green-400' },
            { label: 'This Month', value: requests.filter(r => isThisMonth(r.processed_at ?? r.created_at)).length, color: 'text-blue-500 dark:text-blue-400' },
            { label: 'This Year', value: requests.filter(r => isThisYear(r.processed_at ?? r.created_at)).length, color: 'text-purple-500 dark:text-purple-400' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{s.label}</div>
              </CardContent>
            </Card>
          ))}

        </motion.div>

        <Card className="mb-6">
          <CardContent className="p-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by name, ID, or document type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={uniqueTypes.map(t => ({
                  value: t,
                  label: t === 'all' ? 'All Document Types' : t,
                }))}
              />

              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                ]}
              />

            </div>

          </CardContent>
        </Card>

        <Card>

          <CardHeader>
            <CardTitle>All Approved Documents ({filtered.length})</CardTitle>
          </CardHeader>

          <CardContent>

            {requests.length === 0 ? (

              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-900 dark:text-white font-medium mb-1">
                  No approved documents yet
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Approved requests will appear here.
                </p>
              </div>

            ) : (

              <Table>

                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date Approved</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>

                  {filtered.map((req) => {

                    const name = req.profiles
                      ? `${req.profiles.firstName} ${req.profiles.lastName}`
                      : 'Unknown';

                    const approvedDate = req.processed_at ?? req.created_at;

                    return (

                      <TableRow key={req.id}>

                        <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {req.id.slice(0, 8).toUpperCase()}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            <div>
                              <p className="text-gray-900 dark:text-white">{name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{req.profiles?.email ?? ''}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-500 dark:text-green-400" />
                            {req.type ?? req.document_type ?? '—'}
                          </div>
                        </TableCell>

                        <TableCell className="capitalize">
                          {displayPurpose(req)}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(approvedDate).toLocaleDateString()}
                          </div>
                        </TableCell>

                        <TableCell>
                          {req.file_url ? (
                            <a href={req.file_url} target="_blank" rel="noopener noreferrer" download>
                              <Button variant="ghost" size="sm" className="gap-1 text-green-500 dark:text-green-400">
                                <Download className="w-4 h-4" />
                                Download
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500">No file</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Link href={`/approved-documents/${req.id}`}>
                            <Button variant="orange" size="sm" className="gap-2">
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </Link>
                        </TableCell>

                      </TableRow>

                    );

                  })}

                </TableBody>

              </Table>

            )}

          </CardContent>

        </Card>

      </div>

    </div>

  );

}
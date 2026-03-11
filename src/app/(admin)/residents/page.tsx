'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { Search, Eye, User, Mail, Phone, MapPin, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  role: string | null;
  avatar_base64: string | null;
  totalRequests?: number;
}

export default function ResidentsPage() {
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, firstName, lastName, email, role, avatar_base64, created_at')
          .eq('role', 'resident')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!profilesData || profilesData.length === 0) { setResidents([]); return; }

        const userIds = profilesData.map((p: any) => p.id);
        const { data: requestsData } = await supabase
          .from('requests')
          .select('user_id')
          .in('user_id', userIds);

        const countMap: Record<string, number> = {};
        (requestsData ?? []).forEach((r: any) => {
          countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1;
        });

        const residentsWithDecrypted = await Promise.all(
          profilesData.map(async (p: any) => {
            try {
              const res = await fetch(`/api/profile?id=${p.id}`);
              if (res.ok) {
                const json = await res.json();
                return {
                  ...p,
                  phone: json.data?.phone ?? '',
                  address: json.data?.address ?? '',
                  totalRequests: countMap[p.id] ?? 0,
                };
              }
            } catch {}
            return { ...p, phone: '', address: '', totalRequests: countMap[p.id] ?? 0 };
          })
        );

        setResidents(residentsWithDecrypted);
      } catch (err) {
        console.error('Error loading residents:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const filtered = residents.filter((r) => {
    const name = `${r.firstName} ${r.lastName}`;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      name.toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || r.role === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getInitials = (first: string, last: string) =>
    `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f23]">
        <Loader2 className="w-8 h-8 text-orange-400 dark:text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23] p-4 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Residents</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage registered residents and their information</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {[
            { label: 'Total Residents', value: residents.length, color: 'text-gray-900 dark:text-white' },
            { label: 'New This Month', value: residents.filter(r => isThisMonth(r.created_at)).length, color: 'text-blue-400 dark:text-blue-500' },
            { label: 'Total Requests', value: residents.reduce((sum, r) => sum + (r.totalRequests ?? 0), 0), color: 'text-green-400 dark:text-green-500' },
            { label: 'Avg. Requests', value: residents.length ? Math.round(residents.reduce((sum, r) => sum + (r.totalRequests ?? 0), 0) / residents.length) : 0, color: 'text-purple-400 dark:text-purple-500' },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{s.label}</div>
            </CardContent></Card>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by name, email, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Residents' },
                    { value: 'resident', label: 'Residents' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader><CardTitle>All Residents ({filtered.length})</CardTitle></CardHeader>
            <CardContent>
              {residents.length === 0 ? (
                <div className="text-center py-16">
                  <User className="w-12 h-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-900 dark:text-white font-medium mb-1">No residents yet</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Registered residents will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resident</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">
                          No residents match your search
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((resident) => (
                        <TableRow key={resident.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {resident.avatar_base64 ? (
                                <img src={resident.avatar_base64} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                  {getInitials(resident.firstName, resident.lastName)}
                                </div>
                              )}
                              <div>
                                <p className="text-gray-900 dark:text-white font-medium">{resident.firstName} {resident.lastName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{resident.id.slice(0, 8).toUpperCase()}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-3 h-3 text-gray-400 dark:text-gray-400 shrink-0" />
                                <span className="text-gray-400 dark:text-gray-300">{resident.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3 text-gray-400 dark:text-gray-400 shrink-0" />
                                <span className="text-gray-400 dark:text-gray-300">{resident.phone || '—'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-400 dark:text-gray-300">{resident.address || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-400 dark:text-gray-300">
                              <Calendar className="w-4 h-4" />
                              {new Date(resident.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-900 dark:text-white font-medium">{resident.totalRequests}</span>
                          </TableCell>
                          <TableCell>
                            <Link href={`/residents/${resident.id}`}>
                              <Button variant="orange" size="sm" className="gap-2">
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
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
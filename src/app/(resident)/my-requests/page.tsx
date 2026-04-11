'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { Search, Eye, FileText, Calendar, Loader2, Plus } from 'lucide-react';
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

/* ─── Variants ───────────────────────────────────────────────── */
const EASE = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const rowVariants: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: EASE } },
  exit:    { opacity: 0, x: 8,  transition: { duration: 0.18 } },
};

const statVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.35, ease: EASE } },
};

export default function MyRequestsPage() {
  const router = useRouter();
  const [requests,     setRequests]     = useState<Request[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const res = await fetch(`/api/requests?user_id=${user.id}`);
        if (!res.ok) throw new Error('Failed to load requests');
        const json = await res.json();
        setRequests(json.data ?? []);
      } catch (err) {
        console.error('Failed to load requests:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const filtered = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (r.id ?? '').toLowerCase().includes(q) || (r.type ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const count = (status: string) => requests.filter(r => r.status === status).length;

  const displayPurpose = (r: Request) =>
    r.purpose === 'others' && r.custom_purpose ? r.custom_purpose : r.purpose ?? '—';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#171717] transition-colors duration-300">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-[#0d74ce]" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#171717] transition-colors duration-300 text-[#1c2024] dark:text-white">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Requests</h1>
          <p className="text-[#60646c] dark:text-[#b0b4ba]">Track and manage all your document requests</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {[
            { label: 'Total',    value: requests.length, color: 'text-[#1c2024] dark:text-white' },
            { label: 'Pending',  value: count('pending'),  color: 'text-[#ab6400]' },
            { label: 'Approved', value: count('approved'), color: 'text-green-500'  },
            { label: 'Rejected', value: count('rejected'), color: 'text-[#eb8e90]'    },
          ].map(s => (
            <motion.div
              key={s.label}
              variants={statVariants}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
            >
              <Card>
                <CardContent className="p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                    className={`text-2xl font-bold ${s.color}`}
                  >
                    {s.value}
                  </motion.div>
                  <div className="text-sm text-[#60646c] dark:text-[#b0b4ba]">{s.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div {...fadeUp(0.2)} className="mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b4ba] w-5 h-5" />
                  <Input
                    placeholder="Search by ID or document type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-[#1c2024] dark:text-white transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all',      label: 'All Status' },
                    { value: 'pending',  label: 'Pending'    },
                    { value: 'approved', label: 'Approved'   },
                    { value: 'rejected', label: 'Rejected'   },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div {...fadeUp(0.3)}>
          <Card>
            <CardHeader>
              <CardTitle>All Requests ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="text-center py-16"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  >
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  </motion.div>
                  <p className="text-[#1c2024] dark:text-white font-medium mb-1">No requests yet</p>
                  <p className="text-[#60646c] dark:text-[#b0b4ba] text-sm mb-6">You haven't submitted any document requests.</p>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link href="/request-document">
                      <button className="bg-[#E8500A] hover:opacity-90 text-white px-8 py-3 rounded-[9999px] font-semibold transition inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" />Request a Document
                      </button>
                    </Link>
                  </motion.div>
                </motion.div>
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
                    <AnimatePresence mode="popLayout">
                      {filtered.length === 0 ? (
                        <TableRow key="no-results">
                          <TableCell colSpan={6} className="text-center py-8">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-[#b0b4ba]"
                            >
                              No requests match your search
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((req, idx) => (
                          <motion.tr
                            key={req.id}
                            variants={rowVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            layout
                            style={{ animationDelay: `${idx * 0.03}s` }}
                            className="border-b border-gray-200 dark:border-white/5 hover:bg-[#f0f0f3] dark:hover:bg-white/5 transition-colors duration-150"
                          >
                            <TableCell className="font-mono text-xs">
                              {req.id.slice(0, 8).toUpperCase()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <motion.div
                                  whileHover={{ rotate: 8, scale: 1.1 }}
                                  transition={{ type: 'spring', stiffness: 400 }}
                                >
                                  <FileText className="w-4 h-4 text-[#0d74ce] shrink-0" />
                                </motion.div>
                                {req.type ?? req.document_type ?? '—'}
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{displayPurpose(req)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-[#60646c] dark:text-[#b0b4ba]">
                                <Calendar className="w-4 h-4" />
                                {new Date(req.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, delay: idx * 0.03 + 0.1 }}
                              >
                                <Badge variant={req.status as any}>{req.status}</Badge>
                              </motion.div>
                            </TableCell>
                            <TableCell>
                              <Link href={`/my-requests/${req.id}`}>
                                <motion.div
                                  whileHover={{ scale: 1.05, x: 2 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button variant="default">
                                    <Eye className="w-4 h-4" /> View
                                  </Button>
                                </motion.div>
                              </Link>
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
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
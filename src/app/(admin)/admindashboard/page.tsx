'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import {
  FileText, Users, CheckCircle, Clock, XCircle,
  Eye, ArrowRight, Loader2, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface RequestRow {
  id: string;
  type: string;
  document_type: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: { firstName: string; lastName: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [residentCount, setResidentCount] = useState(0);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('firstName, lastName')
          .eq('id', user.id)
          .single();

        if (profile) setAdminName(`${profile.firstName} ${profile.lastName}`);

        const { data: reqData } = await supabase
          .from('requests')
          .select('id, type, document_type, status, created_at, user_id')
          .order('created_at', { ascending: false });

        const allReqs = reqData ?? [];

        const recentIds = allReqs.slice(0, 5).map((r: any) => r.user_id);
        const uniqueIds = [...new Set(recentIds)];

        let profileMap: Record<string, { firstName: string; lastName: string }> = {};

        if (uniqueIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, firstName, lastName')
            .in('id', uniqueIds);

          profileMap = Object.fromEntries((profilesData ?? []).map((p: any) => [p.id, p]));
        }

        setRequests(
          allReqs.slice(0, 5).map((r: any) => ({
            ...r,
            profiles: profileMap[r.user_id] ?? null,
          }))
        );

        (window as any).__allRequests = allReqs;

        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'resident');

        setResidentCount(count ?? 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const allReqs: RequestRow[] =
    typeof window !== 'undefined'
      ? ((window as any).__allRequests ?? [])
      : [];

  const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();

  const isThisMonth = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  };

  const stats = {
    total: allReqs.length,
    pending: allReqs.filter(r => r.status === 'pending').length,
    approved: allReqs.filter(r => r.status === 'approved').length,
    rejected: allReqs.filter(r => r.status === 'rejected').length,
    today: allReqs.filter(r => isToday(r.created_at)).length,
    thisMonth: allReqs.filter(r => isThisMonth(r.created_at)).length,
  };

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
  };

  const requestLink = (r: RequestRow) => {
    if (r.status === 'approved') return `/approved-documents/${r.id}`;
    if (r.status === 'rejected') return `/rejected-requests/${r.id}`;
    return `/pending-requests/${r.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f23]">
        <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Requests', value: stats.total, icon: FileText, color: 'from-blue-500 to-blue-600', href: '/pending-requests' },
    { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'from-yellow-500 to-yellow-600', href: '/pending-requests' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'from-green-500 to-green-600', href: '/approved-documents' },
    { label: 'Residents', value: residentCount, icon: Users, color: 'from-purple-500 to-purple-600', href: '/residents' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23] p-4 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back{adminName ? `, ${adminName.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's what's happening in your barangay today.
          </p>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {statCards.map(s => {
            const Icon = s.icon;

            return (
              <Link href={s.href} key={s.label}>
                <Card className="hover:ring-1 hover:ring-gray-300 dark:hover:ring-white/20 transition-all cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`bg-gradient-to-r ${s.color} p-3 rounded-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>

                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                      {s.value}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {s.label}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Requests</CardTitle>
                  <Link href="/pending-requests">
                    <Button variant="ghost" size="sm" className="gap-1 text-gray-600 dark:text-gray-400">
                      View all <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm">No requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map(req => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 bg-gray-100 dark:bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {statusIcon(req.status)}

                          <div>
                            <p className="text-gray-900 dark:text-white text-sm font-medium">
                              {req.profiles
                                ? `${req.profiles.firstName} ${req.profiles.lastName}`
                                : 'Unknown'}
                            </p>

                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {req.type ?? req.document_type ?? '—'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant={req.status as any}>{req.status}</Badge>

                          <Link href={requestLink(req)}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >

            {/* Today's summary */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Summary</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {[
                  { label: 'New Requests', value: stats.today, color: 'text-blue-500 dark:text-blue-400' },
                  { label: 'This Month', value: stats.thisMonth, color: 'text-purple-500 dark:text-purple-400' },
                  { label: 'Pending Action', value: stats.pending, color: 'text-yellow-500 dark:text-yellow-400' },
                  { label: 'Rejected', value: stats.rejected, color: 'text-red-500 dark:text-red-400' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {s.label}
                    </span>
                    <span className={`font-bold ${s.color}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Urgent alert */}
            {stats.pending > 0 && (
              <Card className="border border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mt-0.5" />

                    <div>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-1">
                        Action Required
                      </p>

                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {stats.pending} request{stats.pending > 1 ? 's' : ''} waiting for your review.
                      </p>

                      <Link href="/pending-requests">
                        <Button variant="orange" size="sm">
                          Review Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}
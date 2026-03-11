'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Select from '@/app/components/ui/Select';
import {
  Download, TrendingUp, FileText, Users, Clock, CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';

interface RequestRow {
  id: string;
  status: string;
  type: string;
  document_type: string;
  created_at: string;
  user_id: string;
}

interface MonthBucket {
  month: string;
  requests: number;
  approved: number;
  rejected: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [residentCount, setResidentCount] = useState(0);
  const [dateRange, setDateRange] = useState('last-30-days');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: reqData } = await supabase
          .from('requests')
          .select('id, status, type, document_type, created_at, user_id')
          .order('created_at', { ascending: true });

        setRequests(reqData ?? []);

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

  const filtered = requests.filter((r) => {
    const d = new Date(r.created_at);
    const now = new Date();
    if (dateRange === 'last-7-days') return d >= new Date(Date.now() - 7 * 86400000);
    if (dateRange === 'last-30-days') return d >= new Date(Date.now() - 30 * 86400000);
    if (dateRange === 'last-90-days') return d >= new Date(Date.now() - 90 * 86400000);
    if (dateRange === 'this-year') return d.getFullYear() === now.getFullYear();
    return true;
  });

  const total = filtered.length;
  const approved = filtered.filter(r => r.status === 'approved').length;
  const pending = filtered.filter(r => r.status === 'pending').length;
  const rejected = filtered.filter(r => r.status === 'rejected').length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  const typeCounts: Record<string, number> = {};
  filtered.forEach(r => {
    const t = r.type ?? r.document_type ?? 'Unknown';
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  });

  const typeData = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

  const monthlyData: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const bucket = requests.filter(r => {
      const rd = new Date(r.created_at);
      return rd.getFullYear() === yr && rd.getMonth() === mo;
    });
    monthlyData.push({
      month: label,
      requests: bucket.length,
      approved: bucket.filter(r => r.status === 'approved').length,
      rejected: bucket.filter(r => r.status === 'rejected').length,
    });
  }
  const maxMonthly = Math.max(...monthlyData.map(m => m.requests), 1);

  const handleExport = () => {
    const rows = [
      ['ID', 'Type', 'Status', 'Date'],
      ...filtered.map(r => [r.id, r.type ?? r.document_type, r.status, new Date(r.created_at).toLocaleDateString()]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report_${dateRange}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f23]">
        <Loader2 className="w-8 h-8 text-blue-400 dark:text-blue-500 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Requests', value: total, icon: FileText, color: 'from-blue-500 to-blue-600' },
    { label: 'Approved', value: approved, icon: CheckCircle, color: 'from-green-500 to-green-600' },
    { label: 'Pending', value: pending, icon: Clock, color: 'from-yellow-500 to-yellow-600' },
    { label: 'Residents', value: residentCount, icon: Users, color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23] p-4 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Reports & Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400">View statistics and generate reports</p>
            </div>
            <Button variant="orange" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {/* Date filter */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="mb-6 bg-white/5 dark:bg-white/5">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Date Range"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  options={[
                    { value: 'last-7-days', label: 'Last 7 Days' },
                    { value: 'last-30-days', label: 'Last 30 Days' },
                    { value: 'last-90-days', label: 'Last 90 Days' },
                    { value: 'this-year', label: 'This Year' },
                    { value: 'all', label: 'All Time' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {statCards.map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="bg-white/5 dark:bg-white/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`bg-gradient-to-r ${s.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{s.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{s.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Document type distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/5 dark:bg-white/5">
              <CardHeader><CardTitle>Document Types</CardTitle></CardHeader>
              <CardContent>
                {typeData.length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-300 text-sm text-center py-8">
                    No data for this period.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {typeData.map(item => (
                      <div key={item.type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-700 dark:text-gray-200 text-sm">{item.type}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{item.percentage}%</span>
                            <span className="text-gray-900 dark:text-white text-sm font-medium w-6 text-right">{item.count}</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-700 via-purple-600 to-purple-500 h-2 rounded-full transition-all dark:from-blue-500 dark:via-purple-400 dark:to-purple-400"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly trends */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white/5 dark:bg-white/5">
              <CardHeader>
                <CardTitle>Monthly Trends (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3"> 
                  {monthlyData.map(data => (
                    <div key={data.month}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-16">{data.month}</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-blue-700 dark:text-blue-400">{data.requests} total</span>
                          <span className="text-green-700 dark:text-green-400">{data.approved} approved</span>
                          <span className="text-red-700 dark:text-red-400">{data.rejected} rejected</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-700 via-green-700 to-green-500 h-2 rounded-full transition-all dark:from-blue-500 dark:via-green-400"
                          style={{ width: `${(data.requests / maxMonthly) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Performance summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="bg-white/5 dark:bg-white/5">
            <CardHeader><CardTitle>Performance Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Approval Rate', value: `${approvalRate}%`, color: 'text-green-600 dark:text-green-400', sub: 'Of all requests' },
                  { label: 'Rejection Rate', value: total > 0 ? `${Math.round((rejected / total) * 100)}%` : '0%', color: 'text-red-600 dark:text-red-400', sub: 'Of all requests' },
                  { label: 'Pending Rate', value: total > 0 ? `${Math.round((pending / total) * 100)}%` : '0%', color: 'text-yellow-600 dark:text-yellow-400', sub: 'Awaiting review' },
                  { label: 'Total Processed', value: approved + rejected, color: 'text-blue-600 dark:text-blue-400', sub: 'Approved + Rejected' },
                ].map(s => (
                  <div key={s.label} className="text-center p-6 bg-gray-200/10 dark:bg-white/10 rounded-lg">
                    <div className={`text-4xl font-bold mb-2 ${s.color}`}>{s.value}</div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.label}</div>
                    <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">{s.sub}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
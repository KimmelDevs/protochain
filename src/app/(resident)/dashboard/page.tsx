'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Clock, CheckCircle, XCircle,
  TrendingUp, Calendar, Eye, ArrowRight, Plus, Inbox, Loader2,
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
  notes: string | null;
  purpose: string;
  custom_purpose: string | null;
}

const quickActions = [
  { title: 'Request New Document', description: 'Apply for barangay documents', icon: FileText, href: '/request-document', color: 'from-blue-500 to-purple-600' },
  { title: 'View All Requests', description: 'Track your applications', icon: Clock, href: '/my-requests', color: 'from-purple-500 to-pink-600' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'approved': return { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle };
    case 'pending':  return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock };
    case 'rejected': return { color: 'text-red-400',   bg: 'bg-red-500/10',    icon: XCircle };
    default:         return { color: 'text-gray-400',  bg: 'bg-gray-500/10',   icon: Clock };
  }
};

export default function ResidentDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('firstName')
          .eq('id', user.id)
          .single();
        if (profile) setFirstName(profile.firstName ?? '');

        const { data: reqData } = await supabase
          .from('requests')
          .select('id, type, document_type, status, created_at, notes, purpose, custom_purpose')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setRequests(reqData ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const total    = requests.length;
  const pending  = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;
  const recent   = requests.slice(0, 3);

  const stats = [
    { label: 'Total Requests', value: total,    icon: FileText,    color: 'from-blue-500 to-blue-600',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
    { label: 'Pending',        value: pending,  icon: Clock,       color: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    { label: 'Approved',       value: approved, icon: CheckCircle, color: 'from-green-500 to-green-600',  bg: 'bg-green-500/10',   border: 'border-green-500/30' },
    { label: 'Rejected',       value: rejected, icon: XCircle,     color: 'from-red-500 to-red-600',      bg: 'bg-red-500/10',     border: 'border-red-500/30' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23] p-4 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
            Welcome Back, {firstName || 'Resident'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
            {loading ? 'Loading your documents...'
              : total === 0 ? "You haven't made any requests yet. Get started below."
              : "Here's what's happening with your documents today."}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-5 bg-white dark:bg-white/5 transition-colors duration-300`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`bg-gradient-to-r ${s.color} p-2.5 rounded-lg transition-colors duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400 transition-colors duration-300" />
                </div>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 dark:bg-white/10 rounded w-10 mb-2" />
                    <div className="h-3 bg-gray-300 dark:bg-white/10 rounded w-20" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">{s.value}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{s.label}</div>
                  </>
                )}
              </div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Recent Requests</h2>
              {!loading && total > 3 && (
                <Link href="/my-requests" className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors duration-300">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-blue-500 dark:text-blue-400 animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-full flex items-center justify-center mx-auto mb-5 transition-colors duration-300">
                  <Inbox className="w-10 h-10 text-gray-500 dark:text-gray-400 transition-colors duration-300" />
                </div>
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2 transition-colors duration-300">No requests yet</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 max-w-xs transition-colors duration-300">
                  You haven't submitted any document requests yet.
                </p>
                <Link href="/request-document">
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" />Request a Document
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((req) => {
                  const style = getStatusStyle(req.status);
                  const StatusIcon = style.icon;
                  return (
                    <div key={req.id} className="bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg p-4 hover:border-blue-500/30 transition-all transition-colors duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 transition-colors duration-300" />
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate transition-colors duration-300">{req.type ?? req.document_type}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 transition-colors duration-300" />
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                            <span className="font-mono text-xs hidden sm:block">
                              #{req.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className={`${style.bg} ${style.color} px-2.5 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1 transition-colors duration-300`}>
                            <StatusIcon className="w-3 h-3" />
                            {req.status}
                          </span>
                          <Link href={`/my-requests/${req.id}`}>
                            <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>
                      </div>
                      {req.notes && (
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-white/5 pt-2 truncate transition-colors duration-300">
                          📝 {req.notes}
                        </p>
                      )}
                    </div>
                  );
                })}

                {total <= 3 && (
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-white/10 transition-colors duration-300">
                    <Link href="/request-document">
                      <span className="inline-flex items-center gap-2 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300">
                        <Plus className="w-4 h-4" />Submit another request
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Quick Actions</h2>

            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href} className="block bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-all transition-colors duration-300 group">
                  <div className={`bg-gradient-to-r ${action.color} w-11 h-11 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-300 text-sm">{action.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{action.description}</p>
                </Link>
              );
            })}

            {!loading && total > 0 && (
              <div className="bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-5 transition-colors duration-300">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm transition-colors duration-300">Your Status</h3>
                <div className="space-y-2">
                  {[ 
                    { label: 'Pending',  count: pending,  color: 'text-yellow-400', Icon: Clock },
                    { label: 'Approved', count: approved, color: 'text-green-400',  Icon: CheckCircle },
                    { label: 'Rejected', count: rejected, color: 'text-red-400',    Icon: XCircle },
                  ].filter(s => s.count > 0).map(({ label, count, color, Icon }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 transition-colors duration-300">
                        <Icon className={`w-3.5 h-3.5 ${color}`} />{label}
                      </span>
                      <span className={`text-xs font-semibold ${color}`}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-5 transition-colors duration-300">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm transition-colors duration-300">Need Help?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300">Contact the barangay office for assistance.</p>
              <div className="space-y-1.5 text-xs">
                <a href="tel:+63123456789" className="text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors block">📞 (02) 1234-5678</a>
                <a href="mailto:help@barangay.gov.ph" className="text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors block">✉️ help@barangay.gov.ph</a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
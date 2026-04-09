'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  { title: 'View All Requests',    description: 'Track your applications',       icon: Clock,    href: '/my-requests',        color: 'from-purple-500 to-pink-600' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'approved': return { color: 'text-green-400',  bg: 'bg-green-500/10',  icon: CheckCircle };
    case 'pending':  return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock };
    case 'rejected': return { color: 'text-red-400',    bg: 'bg-red-500/10',    icon: XCircle };
    default:         return { color: 'text-gray-400',   bg: 'bg-gray-500/10',   icon: Clock };
  }
};

/* ─── Reusable variants ─────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial:   { opacity: 0, y: 20 },
  animate:   { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  initial:   { opacity: 0, y: 16 },
  animate:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ─── Animated counter ──────────────────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const duration = 600;
    const stepTime = Math.max(Math.floor(duration / end), 16);
    const timer = setInterval(() => {
      start += 1;
      setDisplay(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display}</>;
}

export default function ResidentDashboard() {
  const router = useRouter();
  const [requests,  setRequests]  = useState<RequestRow[]>([]);
  const [loading,   setLoading]   = useState(true);
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
    { label: 'Total Requests', value: total,    icon: FileText,    color: 'from-blue-500 to-blue-600',     bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
    { label: 'Pending',        value: pending,  icon: Clock,       color: 'from-yellow-500 to-yellow-600', bg: 'bg-white dark:bg-white/5', border: 'border-yellow-500/30' },
    { label: 'Approved',       value: approved, icon: CheckCircle, color: 'from-green-500 to-green-600',   bg: 'bg-green-500/10',  border: 'border-green-500/30' },
    { label: 'Rejected',       value: rejected, icon: XCircle,     color: 'from-red-500 to-red-600',       bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23] p-4 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
            Welcome Back,{' '}
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              {firstName || 'Resident'}
            </motion.span>
            {' '}👋
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="text-gray-600 dark:text-gray-400 transition-colors duration-300"
          >
            {loading
              ? 'Loading your documents...'
              : total === 0
                ? "You haven't made any requests yet. Get started below."
                : "Here's what's happening with your documents today."}
          </motion.p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className={`${s.bg} border ${s.border} rounded-xl p-5 bg-white dark:bg-white/5 transition-colors duration-300 cursor-default`}
              >
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    whileHover={{ rotate: 8, scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className={`bg-gradient-to-r ${s.color} p-2.5 rounded-lg`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </motion.div>
                  <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400 transition-colors duration-300" />
                </div>

                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 dark:bg-white/10 rounded w-10 mb-2" />
                    <div className="h-3 bg-gray-300 dark:bg-white/10 rounded w-20" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">
                      <AnimatedNumber value={s.value} />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{s.label}</div>
                  </>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent requests */}
          <motion.div
            {...fadeUp(0.2)}
            className="lg:col-span-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-6 transition-colors duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Recent Requests</h2>
              {!loading && total > 3 && (
                <motion.div whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400 }}>
                  <Link
                    href="/my-requests"
                    className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors duration-300"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                >
                  <Loader2 className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                </motion.div>
              </div>
            ) : recent.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="w-20 h-20 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-full flex items-center justify-center mx-auto mb-5 transition-colors duration-300"
                >
                  <Inbox className="w-10 h-10 text-gray-500 dark:text-gray-400 transition-colors duration-300" />
                </motion.div>
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2 transition-colors duration-300">No requests yet</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 max-w-xs transition-colors duration-300">
                  You haven't submitted any document requests yet.
                </p>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link href="/request-document">
                    <span className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                      <Plus className="w-4 h-4" />Request a Document
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-3"
              >
                {recent.map((req) => {
                  const style = getStatusStyle(req.status);
                  const StatusIcon = style.icon;
                  return (
                    <motion.div
                      key={req.id}
                      variants={staggerItem}
                      whileHover={{ x: 3, transition: { duration: 0.15 } }}
                      className="bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg p-4 hover:border-blue-500/30 transition-colors duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 transition-colors duration-300" />
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate transition-colors duration-300">
                              {req.type ?? req.document_type}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                            <span className="font-mono text-xs hidden sm:block">
                              #{req.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                            className={`${style.bg} ${style.color} px-2.5 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1 transition-colors duration-300`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {req.status}
                          </motion.span>
                          <Link href={`/my-requests/${req.id}`}>
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                          </Link>
                        </div>
                      </div>
                      {req.notes && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-white/5 pt-2 truncate transition-colors duration-300"
                        >
                          📝 {req.notes}
                        </motion.p>
                      )}
                    </motion.div>
                  );
                })}

                {total <= 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 pt-4 border-t border-gray-300 dark:border-white/10 transition-colors duration-300"
                  >
                    <Link href="/request-document">
                      <motion.span
                        whileHover={{ x: 3 }}
                        className="inline-flex items-center gap-2 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300"
                      >
                        <Plus className="w-4 h-4" />Submit another request
                      </motion.span>
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            {...fadeUp(0.3)}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Quick Actions</h2>

            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + idx * 0.08, duration: 0.35 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                >
                  <Link
                    href={action.href}
                    className="block bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-colors duration-300 group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.12, rotate: 4 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className={`bg-gradient-to-r ${action.color} w-11 h-11 rounded-lg flex items-center justify-center mb-3`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </motion.div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-300 text-sm">
                      {action.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{action.description}</p>
                  </Link>
                </motion.div>
              );
            })}

            <AnimatePresence>
              {!loading && total > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: 0.5, duration: 0.35 }}
                  className="bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-5 transition-colors duration-300"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm transition-colors duration-300">Your Status</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Pending',  count: pending,  color: 'text-yellow-400', Icon: Clock },
                      { label: 'Approved', count: approved, color: 'text-green-400',  Icon: CheckCircle },
                      { label: 'Rejected', count: rejected, color: 'text-red-400',    Icon: XCircle },
                    ].filter(s => s.count > 0).map(({ label, count, color, Icon }, i) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55 + i * 0.06 }}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 transition-colors duration-300">
                          <Icon className={`w-3.5 h-3.5 ${color}`} />{label}
                        </span>
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.6 + i * 0.06, type: 'spring', stiffness: 400 }}
                          className={`text-xs font-semibold ${color}`}
                        >
                          {count}
                        </motion.span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.35 }}
              className="bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-5 transition-colors duration-300"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm transition-colors duration-300">Need Help?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300">Contact the barangay office for assistance.</p>
              <div className="space-y-1.5 text-xs">
                <motion.a
                  whileHover={{ x: 3 }}
                  href="tel:+63123456789"
                  className="text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors block"
                >
                  📞 (02) 1234-5678
                </motion.a>
                <motion.a
                  whileHover={{ x: 3 }}
                  href="mailto:help@barangay.gov.ph"
                  className="text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors block"
                >
                  ✉️ help@barangay.gov.ph
                </motion.a>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
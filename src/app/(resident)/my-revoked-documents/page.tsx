'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import {
  Search, Eye, FileText, Calendar, ShieldOff, Loader2, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface RequestDoc {
  id: string;
  type: string;
  document_type: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  file_url: string | null;
  purpose: string;
  custom_purpose: string | null;
  revoke_tx_hash: string | null;
}

/* ─── Variants ───────────────────────────────────────────────── */
const EASE = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const cardVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.35, ease: EASE } },
  exit:    { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.2 } },
};

export default function MyRevokedDocumentsPage() {
  const router = useRouter();
  const [documents,   setDocuments]   = useState<RequestDoc[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter,  setTypeFilter]  = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const res = await fetch(`/api/requests?user_id=${user.id}&status=revoked`);
        if (!res.ok) throw new Error('Failed to load revoked documents');
        const json = await res.json();
        setDocuments(json.data ?? []);
      } catch {
        toast.error('Failed to load revoked documents.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const filtered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (doc.id   ?? '').toLowerCase().includes(q) ||
      (doc.type ?? '').toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = ['all', ...Array.from(new Set(documents.map(d => d.type).filter(Boolean)))];

  const displayPurpose = (doc: RequestDoc) =>
    doc.purpose === 'others' && doc.custom_purpose ? doc.custom_purpose : doc.purpose;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#171717] transition-colors duration-300">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-[#E8500A]" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#171717] transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1c2024] dark:text-white mb-2">
            Revoked Documents
          </h1>
          <p className="text-[#60646c] dark:text-[#b0b4ba]">
            Documents that have been revoked on-chain by the barangay
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: 'Total Revoked',  value: documents.length,                                icon: <ShieldOff className="w-8 h-8 text-red-400" /> },
            { label: 'Document Types', value: new Set(documents.map(d => d.type)).size,        icon: <FileText  className="w-8 h-8 text-[#60646c]" /> },
            { label: 'On-Chain Proof', value: documents.filter(d => !!d.revoke_tx_hash).length, icon: <ShieldOff className="w-8 h-8 text-orange-400" /> },
          ].map(s => (
            <motion.div
              key={s.label}
              variants={cardVariants}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-white/5 dark:bg-white/10 border border-[#e0e1e6] dark:border-white/10 rounded-xl p-4 transition-colors duration-300 cursor-default"
            >
              <div className="flex items-center justify-between">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                    className="text-2xl font-bold text-[#1c2024] dark:text-white"
                  >
                    {s.value}
                  </motion.div>
                  <div className="text-sm text-[#60646c] dark:text-[#b0b4ba]">{s.label}</div>
                </div>
                <motion.div whileHover={{ rotate: 8, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
                  {s.icon}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <AnimatePresence>
          {documents.length > 0 && (
            <motion.div
              {...fadeUp(0.2)}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 dark:bg-white/10 border border-[#e0e1e6] dark:border-white/10 rounded-xl p-6 mb-6 transition-colors duration-300"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b4ba] dark:text-gray-500 w-5 h-5" />
                  <Input
                    placeholder="Search revoked documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-[#1c2024] dark:text-white transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]"
                  />
                </div>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={uniqueTypes.map(t => ({ value: t, label: t === 'all' ? 'All Types' : t }))}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {documents.length === 0 && (
              <motion.div key="empty" variants={cardVariants} exit={{ opacity: 0, scale: 0.95 }} className="col-span-full">
                <div className="bg-white/5 dark:bg-white/10 border border-[#e0e1e6] dark:border-white/10 rounded-xl p-12 text-center transition-colors duration-300">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="w-20 h-20 bg-white/5 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <ShieldOff className="w-10 h-10 text-[#60646c] dark:text-[#b0b4ba]" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-[#1c2024] dark:text-white mb-2">No Revoked Documents</h3>
                  <p className="text-[#60646c] dark:text-[#b0b4ba]">None of your documents have been revoked.</p>
                </div>
              </motion.div>
            )}

            {documents.length > 0 && filtered.length === 0 && (
              <motion.div key="no-results" variants={cardVariants} exit={{ opacity: 0, scale: 0.95 }} className="col-span-full">
                <div className="bg-white/5 dark:bg-white/10 border border-[#e0e1e6] dark:border-white/10 rounded-xl p-12 text-center transition-colors duration-300">
                  <Search className="w-10 h-10 text-[#60646c] dark:text-[#b0b4ba] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#1c2024] dark:text-white mb-2">No Results Found</h3>
                  <button
                    onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
                    className="text-[#0d74ce] text-sm hover:opacity-80 transition-opacity"
                  >
                    Clear filters
                  </button>
                </div>
              </motion.div>
            )}

            {filtered.map((doc) => (
              <motion.div
                key={doc.id}
                variants={cardVariants}
                layout
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white/5 dark:bg-white/10 border border-red-200 dark:border-red-900/40 rounded-xl p-6 transition-colors duration-300 group"
              >
                {/* icon */}
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 3 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4"
                >
                  <ShieldOff className="w-6 h-6 text-red-500 dark:text-red-400" />
                </motion.div>

                <h3 className="text-lg font-bold text-[#1c2024] dark:text-white mb-3">
                  {doc.type ?? doc.document_type}
                </h3>

                <div className="space-y-2 mb-4">
                  <p className="text-xs font-mono text-[#60646c] dark:text-[#b0b4ba]">
                    {doc.id.slice(0, 8).toUpperCase()}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-[#b0b4ba]">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>
                      Revoked:{' '}
                      {new Date(doc.processed_at ?? doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-[#b0b4ba] capitalize">
                    Purpose: {displayPurpose(doc)}
                  </p>
                </div>

                {/* revoked badge */}
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <ShieldOff className="w-3 h-3" /> Revoked
                  </span>
                </div>

                {/* on-chain tx link */}
                {doc.revoke_tx_hash && (
                  <div className="mb-4">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${doc.revoke_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0d74ce] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on Sepolia
                    </a>
                  </div>
                )}

                <Link href={`/my-documents/${doc.id}`} className="block">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="default" size="sm" className="w-full gap-2">
                      <Eye className="w-4 h-4" /> View Details
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}

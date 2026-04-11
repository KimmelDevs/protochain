'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import Badge from '@/app/components/ui/Badge';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import {
  Search, Download, Eye, FileText, Calendar, CheckCircle, Loader2,
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
  file_url: string | null;
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
  animate: { transition: { staggerChildren: 0.06 } },
};

const cardVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.35, ease: EASE } },
  exit:    { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.2 } },
};

export default function MyDocumentsPage() {
  const router = useRouter();
  const [documents,    setDocuments]    = useState<RequestDoc[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [typeFilter,   setTypeFilter]   = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const res = await fetch(`/api/requests?user_id=${user.id}&status=approved`);
        if (!res.ok) throw new Error('Failed to load documents');
        const json = await res.json();
        setDocuments(json.data ?? []);
      } catch (err) {
        console.error(err);
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
        <Loader2 className="w-8 h-8 text-[#0d74ce]" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#171717] transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1c2024] dark:text-white mb-2">My Documents</h1>
          <p className="text-[#60646c] dark:text-[#b0b4ba]">View and download your approved barangay documents</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: 'Total Documents', value: documents.length,                         icon: <CheckCircle className="w-8 h-8 text-green-500" /> },
            { label: 'With File',       value: documents.filter(d => d.file_url).length, icon: <FileText    className="w-8 h-8 text-[#0d74ce]"  /> },
            { label: 'Document Types',  value: new Set(documents.map(d => d.type)).size, icon: <FileText    className="w-8 h-8 text-[#8145b5]" /> },
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
                <motion.div
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
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
                    placeholder="Search documents..."
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

        {/* Document Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {documents.length === 0 && (
              <motion.div
                key="empty"
                variants={cardVariants}
                exit={{ opacity: 0, scale: 0.95 }}
                className="col-span-full"
              >
                <div className="bg-white/5 dark:bg-white/10 border border-[#e0e1e6] dark:border-white/10 rounded-xl p-12 text-center transition-colors duration-300">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="w-20 h-20 bg-white/5 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <FileText className="w-10 h-10 text-[#60646c] dark:text-[#b0b4ba]" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-[#1c2024] dark:text-white mb-2">No Documents Yet</h3>
                  <p className="text-[#60646c] dark:text-[#b0b4ba] mb-2">You don't have any approved documents yet.</p>
                  <p className="text-sm text-[#60646c] dark:text-[#b0b4ba] mb-8">Once your request is approved, it will appear here.</p>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link href="/request-document">
                      <button className="bg-[#E8500A] hover:opacity-90 text-white px-8 py-3 rounded-[9999px] font-semibold transition">
                        Request a Document
                      </button>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {documents.length > 0 && filtered.length === 0 && (
              <motion.div
                key="no-results"
                variants={cardVariants}
                exit={{ opacity: 0, scale: 0.95 }}
                className="col-span-full"
              >
                <div className="bg-white/5 dark:bg-white/10 border border-[#e0e1e6] dark:border-white/10 rounded-xl p-12 text-center transition-colors duration-300">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <Search className="w-10 h-10 text-[#60646c] dark:text-[#b0b4ba] mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-[#1c2024] dark:text-white mb-2">No Results Found</h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
                    className="text-[#0d74ce] text-sm hover:text-[#0d74ce] dark:hover:text-blue-300 transition-colors"
                  >
                    Clear filters
                  </motion.button>
                </div>
              </motion.div>
            )}

            {filtered.map((doc) => (
              <motion.div
                key={doc.id}
                variants={cardVariants}
                layout
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white/5 dark:bg-white/10 border border-[#e0e1e6] dark:border-white/10 rounded-xl p-6 hover:border-[#0d74ce]/30 transition-colors duration-300 group"
              >
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 3 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-12 h-12 bg-[#E8500A] rounded-[9999px] flex items-center justify-center mb-4"
                >
                  <FileText className="w-6 h-6 text-white" />
                </motion.div>

                <h3 className="text-lg font-bold text-[#1c2024] dark:text-white mb-3 group-hover:text-[#0d74ce] transition-colors duration-200">
                  {doc.type ?? doc.document_type}
                </h3>

                <div className="space-y-2 mb-4">
                  <p className="text-xs font-mono text-[#60646c] dark:text-[#b0b4ba]">{doc.id.slice(0, 8).toUpperCase()}</p>
                  <div className="flex items-center gap-2 text-sm text-[#b0b4ba]">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Approved: {new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[#b0b4ba] capitalize">Purpose: {displayPurpose(doc)}</p>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-4"
                >
                  <Badge variant={doc.file_url ? 'approved' : 'pending'}>
                    {doc.file_url ? 'File Available' : 'Pending Upload'}
                  </Badge>
                </motion.div>

                <div className="flex gap-2">
                  <Link href={`/my-documents/${doc.id}`} className="flex-1">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      <Button variant="default" size="sm" className="w-full gap-2">
                        <Eye className="w-4 h-4" />View
                      </Button>
                    </motion.div>
                  </Link>

                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                      <motion.div whileHover={{ scale: 1.08, y: -1 }} whileTap={{ scale: 0.94 }}>
                        <Button variant="default" size="sm" className="px-3">
                          <Download className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
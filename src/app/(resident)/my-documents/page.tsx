'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

export default function MyDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<RequestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Load approved documents
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data, error } = await supabase
          .from('requests')
          .select('id, type, document_type, status, created_at, file_url, purpose, custom_purpose')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const filtered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doc.id.toLowerCase().includes(q) ||
      (doc.type ?? '').toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = ['all', ...Array.from(new Set(documents.map(d => d.type).filter(Boolean)))];

  const displayPurpose = (doc: RequestDoc) =>
    doc.purpose === 'others' && doc.custom_purpose ? doc.custom_purpose : doc.purpose;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f23] transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#0f0f23] transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">My Documents</h1>
          <p className="text-gray-500 dark:text-gray-400">View and download your approved barangay documents</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {[
            { label: 'Total Documents', value: documents.length, icon: <CheckCircle className="w-8 h-8 text-green-400" /> },
            { label: 'With File', value: documents.filter(d => d.file_url).length, icon: <FileText className="w-8 h-8 text-blue-400" /> },
            { label: 'Document Types', value: new Set(documents.map(d => d.type)).size, icon: <FileText className="w-8 h-8 text-purple-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-white/5 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-xl p-4 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
                </div>
                {s.icon}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        {documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white/5 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-xl p-6 mb-6 transition-colors duration-300"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-gray-900 dark:text-white"
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

        {/* Document Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {documents.length === 0 && (
            <div className="col-span-full">
              <div className="bg-white/5 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-xl p-12 text-center transition-colors duration-300">
                <div className="w-20 h-20 bg-white/5 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Documents Yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-2">You don't have any approved documents yet.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Once your request is approved, it will appear here.</p>
                <Link href="/request-document">
                  <button className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Request a Document
                  </button>
                </Link>
              </div>
            </div>
          )}

          {documents.length > 0 && filtered.length === 0 && (
            <div className="col-span-full">
              <div className="bg-white/5 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-xl p-12 text-center transition-colors duration-300">
                <Search className="w-10 h-10 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Results Found</h3>
                <button
                  onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
                  className="text-blue-500 dark:text-blue-400 text-sm hover:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}

          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white/5 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all transition-colors duration-300 group"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{doc.type ?? doc.document_type}</h3>

              <div className="space-y-2 mb-4">
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{doc.id.slice(0, 8).toUpperCase()}</p>
                <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Approved: {new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-400 capitalize">Purpose: {displayPurpose(doc)}</p>
              </div>

              <div className="mb-4">
                <Badge variant={doc.file_url ? 'approved' : 'pending'}>
                  {doc.file_url ? 'File Available' : 'Pending Upload'}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Link href={`/my-documents/${doc.id}`} className="flex-1">
                  <Button variant="orange" size="sm" className="w-full gap-2">
                    <Eye className="w-4 h-4" />View
                  </Button>
                </Link>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Button size="sm" className="px-3">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
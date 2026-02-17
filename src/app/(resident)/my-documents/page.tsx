'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Badge from '@/app/components/ui/Badge';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { 
  Search, 
  Download, 
  Eye, 
  FileText, 
  Calendar,
  QrCode,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { useDocuments } from '@/app/lib/hooks/useDocuments';
import { formatDate } from '@/app/lib/utils/helpers';

const isValid = (validUntil: any) => {
  if (!validUntil) return false;
  const date = validUntil?.toDate ? validUntil.toDate() : new Date(validUntil);
  return date > new Date();
};

export default function MyDocumentsPage() {
  const { documents, loading } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredDocuments = documents.filter((doc: any) => {
    const matchesSearch =
      doc.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = ['all', ...Array.from(new Set(documents.map((d: any) => d.type)))];

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            My Documents
          </h1>
          <p className="text-gray-400">
            View and download your approved barangay documents
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {/* Total */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-7 bg-white/10 rounded w-8 mb-1" />
                    <div className="h-3 bg-white/10 rounded w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">{documents.length}</div>
                    <div className="text-sm text-gray-400">Total Documents</div>
                  </>
                )}
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          {/* Valid */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-7 bg-white/10 rounded w-8 mb-1" />
                    <div className="h-3 bg-white/10 rounded w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {documents.filter((d: any) => isValid(d.validUntil)).length}
                    </div>
                    <div className="text-sm text-gray-400">Valid Documents</div>
                  </>
                )}
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          {/* Types */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-7 bg-white/10 rounded w-8 mb-1" />
                    <div className="h-3 bg-white/10 rounded w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {new Set(documents.map((d: any) => d.type)).size}
                    </div>
                    <div className="text-sm text-gray-400">Document Types</div>
                  </>
                )}
              </div>
              <QrCode className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* Filters - only show if there are documents */}
        {!loading && documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={uniqueTypes.map((type: any) => ({
                  value: type,
                  label: type === 'all' ? 'All Types' : type,
                }))}
              />
            </div>
          </motion.div>
        )}

        {/* Documents Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Loading skeletons */}
          {loading && (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse"
              >
                <div className="w-12 h-12 bg-white/10 rounded-lg mb-4" />
                <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                <div className="h-3 bg-white/10 rounded w-1/2 mb-2" />
                <div className="h-3 bg-white/10 rounded w-2/3 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2 mb-4" />
                <div className="h-6 bg-white/10 rounded w-16 mb-4" />
                <div className="flex gap-2">
                  <div className="h-9 bg-white/10 rounded flex-1" />
                  <div className="h-9 bg-white/10 rounded w-9" />
                </div>
              </div>
            ))
          )}

          {/* Empty - no documents at all */}
          {!loading && documents.length === 0 && (
            <div className="col-span-full">
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Documents Yet</h3>
                <p className="text-gray-400 mb-2">
                  You don&apos;t have any approved documents yet.
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  Once your document request is approved, it will appear here.
                </p>
                <Link href="/resident/request-document">
                  <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Request a Document
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Empty - search returned nothing */}
          {!loading && documents.length > 0 && filteredDocuments.length === 0 && (
            <div className="col-span-full">
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Results Found</h3>
                <p className="text-gray-400 mb-6">
                  No documents match your search.
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}

          {/* Document Cards */}
          {!loading && filteredDocuments.map((doc: any) => (
            <div
              key={doc.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all group"
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6 text-white" />
              </div>

              {/* Info */}
              <h3 className="text-lg font-bold text-white mb-3">{doc.type}</h3>
              <div className="space-y-2 mb-4">
                <p className="text-xs font-mono text-gray-500">{doc.id}</p>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Issued: {formatDate(doc.issuedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Valid Until: {formatDate(doc.validUntil)}</span>
                </div>
              </div>

              {/* Badge */}
              <div className="mb-4">
                <Badge variant={isValid(doc.validUntil) ? 'approved' : 'rejected'}>
                  {isValid(doc.validUntil) ? 'Valid' : 'Expired'}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/resident/my-documents/${doc.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </Link>
                <Button size="sm" className="gap-2 px-3">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
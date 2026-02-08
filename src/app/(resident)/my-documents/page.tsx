'use client';

import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Eye, 
  QrCode,
  Calendar,
  Shield,
  Search,
  Filter
} from 'lucide-react';
import { useState } from 'react';

// Mock documents data
const documents = [
  {
    id: 'DOC-001',
    type: 'Barangay Clearance',
    trackingNumber: 'BC-2024-001',
    issuedDate: '2024-01-16',
    expiryDate: '2024-07-16',
    status: 'active',
    qrCode: 'QR-BC-2024-001',
    purpose: 'Employment'
  },
  {
    id: 'DOC-002',
    type: 'Certificate of Residency',
    trackingNumber: 'CR-2024-002',
    issuedDate: '2024-01-20',
    expiryDate: '2024-07-20',
    status: 'active',
    qrCode: 'QR-CR-2024-002',
    purpose: 'School Requirements'
  },
  {
    id: 'DOC-003',
    type: 'Good Moral Certificate',
    trackingNumber: 'GMC-2024-003',
    issuedDate: '2024-01-10',
    expiryDate: '2024-07-10',
    status: 'active',
    qrCode: 'QR-GMC-2024-003',
    purpose: 'Job Application'
  },
  {
    id: 'DOC-004',
    type: 'Barangay Clearance',
    trackingNumber: 'BC-2023-045',
    issuedDate: '2023-12-01',
    expiryDate: '2024-06-01',
    status: 'expired',
    qrCode: 'QR-BC-2023-045',
    purpose: 'Business Permit'
  },
];

export default function MyDocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = documents.filter(d => d.status === 'active').length;
  const expiredCount = documents.filter(d => d.status === 'expired').length;

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            My Documents
          </h1>
          <p className="text-gray-400">
            View and download your approved documents
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-400" />
              <span className="text-3xl font-bold text-white">{documents.length}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Documents</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-bold text-white">{activeCount}</span>
            </div>
            <p className="text-gray-400 text-sm">Active Documents</p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-red-400" />
              <span className="text-3xl font-bold text-white">{expiredCount}</span>
            </div>
            <p className="text-gray-400 text-sm">Expired Documents</p>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="relative md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-all"
              >
                <option value="all" className="bg-[#1a1a2e]">All Status</option>
                <option value="active" className="bg-[#1a1a2e]">Active</option>
                <option value="expired" className="bg-[#1a1a2e]">Expired</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-12 text-center"
          >
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Documents Found</h3>
            <p className="text-gray-400">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter'
                : 'You don\'t have any documents yet'
              }
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDocuments.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all"
              >
                {/* Document Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {doc.type}
                      </h3>
                      <p className="text-white/80 text-sm font-mono">
                        {doc.trackingNumber}
                      </p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-lg">
                      <QrCode className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Document Body */}
                <div className="p-6 space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                      doc.status === 'active'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {doc.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Issued: {new Date(doc.issuedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                    </div>
                    <div className="text-gray-400">
                      <span className="font-medium">Purpose:</span> {doc.purpose}
                    </div>
                  </div>

                  {/* Blockchain Badge */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      <span className="font-semibold">Blockchain Verified</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <QrCode className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Blockchain Verification</h3>
              <p className="text-gray-300 text-sm">
                All documents are secured with blockchain technology and include a unique QR code for instant verification.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
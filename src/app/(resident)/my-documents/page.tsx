'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
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
  Filter,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

// Mock data
const approvedDocuments = [
  {
    id: 'DOC-001',
    requestId: 'REQ-001',
    type: 'Barangay Clearance',
    purpose: 'Employment',
    dateIssued: '2024-01-16',
    validUntil: '2024-07-16',
    qrCode: 'QR-ABC123XYZ',
    blockchainHash: '0x1a2b3c4d5e6f...',
  },
  {
    id: 'DOC-002',
    requestId: 'REQ-003',
    type: 'Certificate of Indigency',
    purpose: 'Medical Assistance',
    dateIssued: '2024-01-12',
    validUntil: '2024-07-12',
    qrCode: 'QR-DEF456ABC',
    blockchainHash: '0x7g8h9i0j1k2l...',
  },
  {
    id: 'DOC-003',
    requestId: 'REQ-006',
    type: 'Barangay Clearance',
    purpose: 'Travel',
    dateIssued: '2024-01-07',
    validUntil: '2024-07-07',
    qrCode: 'QR-GHI789DEF',
    blockchainHash: '0x3m4n5o6p7q8r...',
  },
];

export default function MyDocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredDocuments = approvedDocuments.filter((doc) => {
    const matchesSearch = 
      doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = ['all', ...Array.from(new Set(approvedDocuments.map(d => d.type)))];

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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{approvedDocuments.length}</div>
                  <div className="text-sm text-gray-400">Total Documents</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {approvedDocuments.filter(d => new Date(d.validUntil) > new Date()).length}
                  </div>
                  <div className="text-sm text-gray-400">Valid Documents</div>
                </div>
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {new Set(approvedDocuments.map(d => d.type)).size}
                  </div>
                  <div className="text-sm text-gray-400">Document Types</div>
                </div>
                <QrCode className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
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
                  options={uniqueTypes.map(type => ({
                    value: type,
                    label: type === 'all' ? 'All Types' : type
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredDocuments.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No documents found</p>
                  <p className="text-sm text-gray-500">Try adjusting your search filters</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <Card key={doc.id} hover>
                <CardContent className="p-6">
                  {/* Document Icon */}
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-white" />
                  </div>

                  {/* Document Info */}
                  <h3 className="text-lg font-bold text-white mb-2">{doc.type}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="font-mono">{doc.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Issued: {new Date(doc.dateIssued).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Valid Until: {new Date(doc.validUntil).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Validity Badge */}
                  <div className="mb-4">
                    {new Date(doc.validUntil) > new Date() ? (
                      <Badge variant="approved">Valid</Badge>
                    ) : (
                      <Badge variant="rejected">Expired</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/resident/my-documents/${doc.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </Link>
                    <Button size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
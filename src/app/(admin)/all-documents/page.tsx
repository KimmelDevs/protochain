'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { Search, Download, FileText, Calendar, Filter } from 'lucide-react';

// Mock data - combining all documents
const allDocuments = [
  {
    id: 'DOC-001',
    requestId: 'REQ-001',
    residentName: 'Juan Dela Cruz',
    type: 'Barangay Clearance',
    status: 'approved',
    dateIssued: '2024-01-16',
    issuedBy: 'Hon. Maria Santos',
  },
  {
    id: 'REQ-015',
    residentName: 'Maria Garcia',
    type: 'Barangay Clearance',
    status: 'pending',
    dateRequested: '2024-02-08',
  },
  {
    id: 'REQ-007',
    residentName: 'Carlos Mendoza',
    type: 'Business Clearance',
    status: 'rejected',
    dateRejected: '2024-02-06',
    rejectedBy: 'Hon. Maria Santos',
  },
  {
    id: 'DOC-002',
    requestId: 'REQ-003',
    residentName: 'Maria Garcia',
    type: 'Certificate of Indigency',
    status: 'approved',
    dateIssued: '2024-01-12',
    issuedBy: 'Hon. Maria Santos',
  },
  {
    id: 'REQ-014',
    residentName: 'Jose Reyes',
    type: 'Certificate of Indigency',
    status: 'pending',
    dateRequested: '2024-02-08',
  },
];

export default function AllDocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredDocuments = allDocuments.filter((doc) => {
    const matchesSearch = 
      doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const uniqueTypes = ['all', ...Array.from(new Set(allDocuments.map(d => d.type)))];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'approved';
      case 'pending':
        return 'pending';
      case 'rejected':
        return 'rejected';
      default:
        return 'default';
    }
  };

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
            All Documents
          </h1>
          <p className="text-gray-400">
            Complete list of all document requests and approvals
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{allDocuments.length}</div>
              <div className="text-sm text-gray-400">Total Documents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">
                {allDocuments.filter(d => d.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-400">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {allDocuments.filter(d => d.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-400">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-400">
                {allDocuments.filter(d => d.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-400">Rejected</div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                />
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={uniqueTypes.map(type => ({
                    value: type,
                    label: type === 'all' ? 'All Document Types' : type
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Documents ({filteredDocuments.length})</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Resident Name</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Processed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                        No documents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium font-mono">{doc.id}</TableCell>
                        <TableCell>{doc.residentName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-400" />
                            {doc.type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(doc.status) as any}>
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {doc.status === 'approved' && doc.dateIssued && 
                              new Date(doc.dateIssued).toLocaleDateString()}
                            {doc.status === 'pending' && doc.dateRequested && 
                              new Date(doc.dateRequested).toLocaleDateString()}
                            {doc.status === 'rejected' && doc.dateRejected && 
                              new Date(doc.dateRejected).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">
                          {doc.status === 'approved' ? doc.issuedBy : 
                           doc.status === 'rejected' ? doc.rejectedBy : 
                           '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
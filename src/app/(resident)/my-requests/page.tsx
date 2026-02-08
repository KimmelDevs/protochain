'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import { Search, Eye, FileText, Calendar, Filter } from 'lucide-react';
import Link from 'next/link';

// Mock data
const allRequests = [
  {
    id: 'REQ-001',
    type: 'Barangay Clearance',
    status: 'approved',
    dateRequested: '2024-01-15',
    dateProcessed: '2024-01-16',
    purpose: 'Employment',
  },
  {
    id: 'REQ-002',
    type: 'Certificate of Residency',
    status: 'pending',
    dateRequested: '2024-01-20',
    dateProcessed: null,
    purpose: 'School Requirement',
  },
  {
    id: 'REQ-003',
    type: 'Certificate of Indigency',
    status: 'approved',
    dateRequested: '2024-01-10',
    dateProcessed: '2024-01-12',
    purpose: 'Medical Assistance',
  },
  {
    id: 'REQ-004',
    type: 'Business Clearance',
    status: 'pending',
    dateRequested: '2024-01-25',
    dateProcessed: null,
    purpose: 'Business Permit',
  },
  {
    id: 'REQ-005',
    type: 'Job Seeker Certificate',
    status: 'rejected',
    dateRequested: '2024-01-08',
    dateProcessed: '2024-01-09',
    purpose: 'Job Application',
  },
  {
    id: 'REQ-006',
    type: 'Barangay Clearance',
    status: 'approved',
    dateRequested: '2024-01-05',
    dateProcessed: '2024-01-07',
    purpose: 'Travel',
  },
];

export default function MyRequestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRequests = allRequests.filter((request) => {
    const matchesSearch = 
      request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
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
            My Requests
          </h1>
          <p className="text-gray-400">
            Track and manage all your document requests
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
              <div className="text-2xl font-bold text-white">{allRequests.length}</div>
              <div className="text-sm text-gray-400">Total Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {allRequests.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-400">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">
                {allRequests.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-400">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-400">
                {allRequests.filter(r => r.status === 'rejected').length}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by ID or document type..."
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
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Requests Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>All Requests ({filteredRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                        No requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-400" />
                            {request.type}
                          </div>
                        </TableCell>
                        <TableCell>{request.purpose}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(request.dateRequested).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(request.status) as any}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/resident/my-requests/${request.id}`}>
                            <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                              <Eye className="w-4 h-4" />
                              <span className="text-sm">View</span>
                            </button>
                          </Link>
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
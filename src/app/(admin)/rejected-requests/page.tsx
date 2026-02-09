'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { Search, Eye, XCircle, FileText, User, Calendar } from 'lucide-react';
import Link from 'next/link';

// Mock data
const rejectedRequests = [
  {
    id: 'REQ-007',
    residentName: 'Carlos Mendoza',
    email: 'carlos.mendoza@email.com',
    type: 'Business Clearance',
    purpose: 'Business Permit',
    dateRequested: '2024-02-05',
    dateRejected: '2024-02-06',
    rejectedBy: 'Hon. Maria Santos',
    reason: 'Incomplete business documents. DTI registration is missing.',
  },
  {
    id: 'REQ-005',
    residentName: 'Lisa Fernandez',
    email: 'lisa.fernandez@email.com',
    type: 'Certificate of Residency',
    purpose: 'School Requirement',
    dateRequested: '2024-02-03',
    dateRejected: '2024-02-04',
    rejectedBy: 'Hon. Maria Santos',
    reason: 'Proof of residency is insufficient. Please provide utility bill or lease contract dated within the last 3 months.',
  },
  {
    id: 'REQ-002',
    residentName: 'Roberto Santos',
    email: 'roberto.santos@email.com',
    type: 'Barangay Clearance',
    purpose: 'Employment',
    dateRequested: '2024-01-28',
    dateRejected: '2024-01-29',
    rejectedBy: 'Hon. Maria Santos',
    reason: 'Invalid ID submitted. Please provide a valid government-issued ID.',
  },
];

export default function RejectedRequestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredRequests = rejectedRequests.filter((req) => {
    const matchesSearch = 
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || req.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = ['all', ...Array.from(new Set(rejectedRequests.map(r => r.type)))];

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
            Rejected Requests
          </h1>
          <p className="text-gray-400">
            View all rejected document requests
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
              <div className="text-2xl font-bold text-white">{rejectedRequests.length}</div>
              <div className="text-sm text-gray-400">Total Rejected</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-400">0</div>
              <div className="text-sm text-gray-400">This Week</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-400">2</div>
              <div className="text-sm text-gray-400">This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-400">12</div>
              <div className="text-sm text-gray-400">This Year</div>
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
                    placeholder="Search by name, ID, or document type..."
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
                    label: type === 'all' ? 'All Document Types' : type
                  }))}
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
              <CardTitle>Rejected Requests ({filteredRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Date Rejected</TableHead>
                    <TableHead>Rejected By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                        No rejected requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium font-mono">{request.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-400" />
                            <div>
                              <p className="text-white">{request.residentName}</p>
                              <p className="text-xs text-gray-400">{request.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-400" />
                            {request.type}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(request.dateRejected).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">{request.rejectedBy}</TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-400 line-clamp-2 max-w-xs">
                            {request.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
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
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { Search, Eye, Clock, AlertCircle, FileText, User, Calendar } from 'lucide-react';
import Link from 'next/link';

// Mock data
const pendingRequests = [
  {
    id: 'REQ-015',
    residentName: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    type: 'Barangay Clearance',
    purpose: 'Employment',
    dateRequested: '2024-02-08 09:30 AM',
    priority: 'high',
    daysWaiting: 0,
  },
  {
    id: 'REQ-014',
    residentName: 'Jose Reyes',
    email: 'jose.reyes@email.com',
    type: 'Certificate of Indigency',
    purpose: 'Medical Assistance',
    dateRequested: '2024-02-08 09:15 AM',
    priority: 'urgent',
    daysWaiting: 0,
  },
  {
    id: 'REQ-012',
    residentName: 'Pedro Cruz',
    email: 'pedro.cruz@email.com',
    type: 'Business Clearance',
    purpose: 'Business Permit',
    dateRequested: '2024-02-07 04:30 PM',
    priority: 'normal',
    daysWaiting: 1,
  },
  {
    id: 'REQ-011',
    residentName: 'Ana Santos',
    email: 'ana.santos@email.com',
    type: 'Certificate of Residency',
    purpose: 'School Requirement',
    dateRequested: '2024-02-07 02:15 PM',
    priority: 'normal',
    daysWaiting: 1,
  },
  {
    id: 'REQ-009',
    residentName: 'Carlos Lopez',
    email: 'carlos.lopez@email.com',
    type: 'Job Seeker Certificate',
    purpose: 'Job Application',
    dateRequested: '2024-02-06 11:00 AM',
    priority: 'normal',
    daysWaiting: 2,
  },
];

export default function PendingRequestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredRequests = pendingRequests.filter((req) => {
    const matchesSearch = 
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || req.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  });

  const uniqueTypes = ['all', ...Array.from(new Set(pendingRequests.map(r => r.type)))];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'normal':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
            Pending Requests
          </h1>
          <p className="text-gray-400">
            Review and process document requests from residents
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
              <div className="text-2xl font-bold text-white">{pendingRequests.length}</div>
              <div className="text-sm text-gray-400">Total Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-400">
                {pendingRequests.filter(r => r.priority === 'urgent').length}
              </div>
              <div className="text-sm text-gray-400">Urgent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-400">
                {pendingRequests.filter(r => r.priority === 'high').length}
              </div>
              <div className="text-sm text-gray-400">High Priority</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {pendingRequests.filter(r => r.daysWaiting >= 2).length}
              </div>
              <div className="text-sm text-gray-400">Waiting 2+ Days</div>
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
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Priorities' },
                    { value: 'urgent', label: 'Urgent' },
                    { value: 'high', label: 'High' },
                    { value: 'normal', label: 'Normal' },
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
              <CardTitle>Pending Requests ({filteredRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date Requested</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                        No pending requests found
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
                            <FileText className="w-4 h-4 text-purple-400" />
                            {request.type}
                          </div>
                        </TableCell>
                        <TableCell>{request.purpose}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm">{request.dateRequested}</p>
                              {request.daysWaiting > 0 && (
                                <p className="text-xs text-yellow-400">
                                  {request.daysWaiting} day{request.daysWaiting > 1 ? 's' : ''} ago
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                            {request.priority === 'urgent' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {request.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/pending-requests/${request.id}`}>
                            <Button size="sm" className="gap-2">
                              <Eye className="w-4 h-4" />
                              Review
                            </Button>
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
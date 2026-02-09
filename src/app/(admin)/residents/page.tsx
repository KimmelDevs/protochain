'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { Search, Eye, User, Mail, Phone, MapPin, Calendar, UserPlus } from 'lucide-react';
import Link from 'next/link';

// Mock data
const residents = [
  {
    id: 'RES-001',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@email.com',
    phone: '+63 912 345 6789',
    address: 'Block 5 Lot 10, Barangay Salawag',
    dateRegistered: '2024-01-15',
    totalRequests: 12,
    status: 'active',
  },
  {
    id: 'RES-002',
    name: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    phone: '+63 923 456 7890',
    address: 'Block 3 Lot 15, Barangay Salawag',
    dateRegistered: '2024-01-20',
    totalRequests: 8,
    status: 'active',
  },
  {
    id: 'RES-003',
    name: 'Jose Reyes',
    email: 'jose.reyes@email.com',
    phone: '+63 934 567 8901',
    address: 'Block 7 Lot 22, Barangay Salawag',
    dateRegistered: '2024-01-18',
    totalRequests: 5,
    status: 'active',
  },
  {
    id: 'RES-004',
    name: 'Ana Santos',
    email: 'ana.santos@email.com',
    phone: '+63 945 678 9012',
    address: 'Block 2 Lot 8, Barangay Salawag',
    dateRegistered: '2024-02-01',
    totalRequests: 3,
    status: 'active',
  },
  {
    id: 'RES-005',
    name: 'Pedro Cruz',
    email: 'pedro.cruz@email.com',
    phone: '+63 956 789 0123',
    address: 'Block 6 Lot 18, Barangay Salawag',
    dateRegistered: '2024-02-05',
    totalRequests: 2,
    status: 'active',
  },
  {
    id: 'RES-006',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@email.com',
    phone: '+63 967 890 1234',
    address: 'Block 4 Lot 12, Barangay Salawag',
    dateRegistered: '2024-01-10',
    totalRequests: 1,
    status: 'inactive',
  },
];

export default function ResidentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredResidents = residents.filter((resident) => {
    const matchesSearch = 
      resident.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resident.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resident.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || resident.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Residents
              </h1>
              <p className="text-gray-400">
                Manage registered residents and their information
              </p>
            </div>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Resident
            </Button>
          </div>
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
              <div className="text-2xl font-bold text-white">{residents.length}</div>
              <div className="text-sm text-gray-400">Total Residents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">
                {residents.filter(r => r.status === 'active').length}
              </div>
              <div className="text-sm text-gray-400">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-400">
                {residents.filter(r => r.status === 'inactive').length}
              </div>
              <div className="text-sm text-gray-400">Inactive</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-400">15</div>
              <div className="text-sm text-gray-400">New This Month</div>
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
                    placeholder="Search by name, email, or ID..."
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
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Residents Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>All Residents ({filteredResidents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                        No residents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResidents.map((resident) => (
                      <TableRow key={resident.id}>
                        <TableCell className="font-medium font-mono">{resident.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-400" />
                            {resident.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-400">{resident.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-400">{resident.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">{resident.address}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(resident.dateRegistered).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <span className="text-white font-medium">{resident.totalRequests}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={resident.status === 'active' ? 'approved' : 'default'}>
                            {resident.status}
                          </Badge>
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
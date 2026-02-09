'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Button from '@/app/components/ui/Button';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Users,
  TrendingUp,
  Calendar,
  Eye,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

// Mock data
const stats = [
  { 
    label: 'Pending Requests', 
    value: '15', 
    icon: Clock, 
    color: 'from-yellow-500 to-yellow-600',
    bgColor: 'bg-yellow-500/10',
    change: '+3 today',
    changeType: 'increase'
  },
  { 
    label: 'Approved Today', 
    value: '8', 
    icon: CheckCircle, 
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10',
    change: '+2 from yesterday',
    changeType: 'increase'
  },
  { 
    label: 'Total Residents', 
    value: '1,234', 
    icon: Users, 
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    change: '+45 this month',
    changeType: 'increase'
  },
  { 
    label: 'Rejected', 
    value: '3', 
    icon: XCircle, 
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-500/10',
    change: '-1 from last week',
    changeType: 'decrease'
  },
];

const recentRequests = [
  {
    id: 'REQ-015',
    name: 'Maria Garcia',
    type: 'Barangay Clearance',
    date: '2024-02-08 09:30 AM',
    status: 'pending',
    priority: 'high',
  },
  {
    id: 'REQ-014',
    name: 'Jose Reyes',
    type: 'Certificate of Indigency',
    date: '2024-02-08 09:15 AM',
    status: 'pending',
    priority: 'urgent',
  },
  {
    id: 'REQ-013',
    name: 'Ana Santos',
    type: 'Certificate of Residency',
    date: '2024-02-08 08:45 AM',
    status: 'approved',
    priority: 'normal',
  },
  {
    id: 'REQ-012',
    name: 'Pedro Cruz',
    type: 'Business Clearance',
    date: '2024-02-07 04:30 PM',
    status: 'pending',
    priority: 'normal',
  },
];

const documentStats = [
  { type: 'Barangay Clearance', count: 45, percentage: 35 },
  { type: 'Certificate of Residency', count: 32, percentage: 25 },
  { type: 'Certificate of Indigency', count: 28, percentage: 22 },
  { type: 'Business Clearance', count: 15, percentage: 12 },
  { type: 'Others', count: 8, percentage: 6 },
];

export default function AdminDashboard() {
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
            Admin Dashboard
          </h1>
          <p className="text-gray-400">
            Welcome back, Hon. Maria Santos! Here's what's happening today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <TrendingUp className={`w-5 h-5 ${stat.changeType === 'increase' ? 'text-green-400' : 'text-red-400'}`} />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400 mb-2">{stat.label}</div>
                  <div className={`text-xs ${stat.changeType === 'increase' ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.change}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Requests</CardTitle>
                  <Link href="/admin/pending-requests">
                    <Button variant="ghost" size="sm" className="gap-2">
                      View All
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Resident</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium font-mono">{request.id}</TableCell>
                        <TableCell>{request.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-400" />
                            {request.type}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{request.date}</TableCell>
                        <TableCell>
                          <Badge variant={request.status === 'approved' ? 'approved' : 'pending'}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/pending-requests/${request.id}`}>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Eye className="w-4 h-4" />
                              Review
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/admin/pending-requests">
                    <Button className="w-full gap-2 justify-start">
                      <Clock className="w-4 h-4" />
                      Review Pending ({stats[0].value})
                    </Button>
                  </Link>
                  <Link href="/admin/approved-documents">
                    <Button variant="outline" className="w-full gap-2 justify-start">
                      <CheckCircle className="w-4 h-4" />
                      View Approved
                    </Button>
                  </Link>
                  <Link href="/admin/residents">
                    <Button variant="outline" className="w-full gap-2 justify-start">
                      <Users className="w-4 h-4" />
                      Manage Residents
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Document Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Document Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {documentStats.map((doc) => (
                      <div key={doc.type}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">{doc.type}</span>
                          <span className="text-sm font-medium text-white">{doc.count}</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${doc.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-400 font-medium">2 Urgent Requests</p>
                    <p className="text-xs text-gray-400 mt-1">Require immediate attention</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-400 font-medium">System Update</p>
                    <p className="text-xs text-gray-400 mt-1">New features available</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
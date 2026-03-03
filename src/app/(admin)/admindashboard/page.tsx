'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Button from '@/app/components/ui/Button';
import {
  FileText, Clock, CheckCircle, XCircle, Users,
  TrendingUp, Eye, ArrowRight, AlertCircle, Inbox,
} from 'lucide-react';
import Link from 'next/link';
import { useAdminDocuments } from '@/app/lib/hooks/useDocuments';
import { useAuth } from '@/app/context/AuthContext';
import { formatDate } from '@/app/lib/utils/helpers';

const DOC_TYPES = [
  'Barangay Clearance',
  'Certificate of Residency',
  'Certificate of Indigency',
  'Business Clearance',
  'Others',
];

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(6)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-white/10 rounded animate-pulse w-20" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function EmptyTable() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Inbox className="w-8 h-8 text-gray-500" />
      </div>
      <p className="text-white font-medium mb-1">No requests yet</p>
      <p className="text-sm text-gray-500">Resident requests will appear here once submitted.</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { userData } = useAuth();
  const { pendingRequests, allRequests, stats, loading } = useAdminDocuments();

  const statCards = [
    { label: 'Pending Requests', value: stats.pending,        icon: Clock,        color: 'from-yellow-500 to-yellow-600' },
    { label: 'Approved',         value: stats.approved,       icon: CheckCircle,  color: 'from-green-500 to-green-600' },
    { label: 'Total Residents',  value: stats.totalResidents, icon: Users,        color: 'from-blue-500 to-blue-600' },
    { label: 'Rejected',         value: stats.rejected,       icon: XCircle,      color: 'from-red-500 to-red-600' },
  ];

  const docTypeCounts = DOC_TYPES.map((type) => {
    const count = allRequests.filter((r: any) => r.type === type).length;
    const percentage = allRequests.length > 0 ? Math.round((count / allRequests.length) * 100) : 0;
    return { type, count, percentage };
  });

  const urgentCount   = pendingRequests.filter((r: any) => r.priority === 'urgent').length;
  const recentRequests = allRequests.slice(0, 5);

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">
            Welcome back, {userData?.firstName ?? 'Admin'}!{' '}
            {loading ? 'Loading data...'
              : stats.pending === 0 ? 'Everything is up to date.'
              : `You have ${stats.pending} pending request${stats.pending > 1 ? 's' : ''} to review.`}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`bg-gradient-to-r ${stat.color} p-2.5 rounded-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                  </div>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-white/10 rounded w-10 mb-2" />
                      <div className="h-3 bg-white/10 rounded w-24" />
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-xs text-gray-400">{stat.label}</div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Requests Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Requests</CardTitle>
                  {!loading && allRequests.length > 5 && (
                    <Link href="/admin/pending-requests">
                      <Button variant="ghost" size="sm" className="gap-2">
                        View All <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {['ID', 'Resident', 'Type', 'Date', 'Status', 'Action'].map(h => (
                          <TableHead key={h}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SkeletonRow /><SkeletonRow /><SkeletonRow />
                    </TableBody>
                  </Table>
                ) : recentRequests.length === 0 ? (
                  <EmptyTable />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Resident</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentRequests.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-xs">
                            #{request.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            {request.profiles
                              ? `${request.profiles.firstName} ${request.profiles.lastName}`
                              : <span className="text-gray-500 italic text-xs">Unknown</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{request.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-400">
                            {formatDate(request.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              request.status === 'approved' ? 'approved'
                              : request.status === 'rejected' ? 'rejected'
                              : 'pending'
                            }>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/admin/pending-requests/${request.id}`}>
                              <Button variant="ghost" size="sm" className="gap-1.5">
                                <Eye className="w-4 h-4" /> Review
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  <Link href="/admin/pending-requests">
                    <Button className="w-full gap-2 justify-start">
                      <Clock className="w-4 h-4" />
                      Review Pending
                      {stats.pending > 0 && (
                        <span className="ml-auto bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                          {stats.pending}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link href="/admin/approved-documents">
                    <Button variant="outline" className="w-full gap-2 justify-start">
                      <CheckCircle className="w-4 h-4" /> View Approved
                    </Button>
                  </Link>
                  <Link href="/admin/residents">
                    <Button variant="outline" className="w-full gap-2 justify-start">
                      <Users className="w-4 h-4" /> Manage Residents
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Document Type Breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card>
                <CardHeader><CardTitle>Document Types</CardTitle></CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3 animate-pulse">
                      {[...Array(5)].map((_, i) => <div key={i} className="h-6 bg-white/10 rounded" />)}
                    </div>
                  ) : allRequests.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {docTypeCounts.map((doc) => (
                        <div key={doc.type}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-400 truncate max-w-[140px]">{doc.type}</span>
                            <span className="text-xs font-medium text-white ml-2">{doc.count}</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${doc.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Alerts */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400" /> Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {loading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-14 bg-white/10 rounded-lg" />
                      <div className="h-14 bg-white/10 rounded-lg" />
                    </div>
                  ) : (
                    <>
                      {urgentCount > 0 ? (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-sm text-yellow-400 font-medium">
                            {urgentCount} Urgent Request{urgentCount > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">Require immediate attention</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-sm text-green-400 font-medium">No Urgent Requests</p>
                          <p className="text-xs text-gray-400 mt-0.5">All caught up!</p>
                        </div>
                      )}

                      {stats.pending > 0 ? (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <p className="text-sm text-blue-400 font-medium">{stats.pending} Awaiting Review</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            <Link href="/admin/pending-requests" className="underline hover:text-blue-300">
                              Go to pending requests →
                            </Link>
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <p className="text-sm text-gray-400 font-medium">No Pending Requests</p>
                          <p className="text-xs text-gray-500 mt-0.5">All requests have been processed.</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
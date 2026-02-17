'use client';

import { motion } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Calendar,
  Eye,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useDocuments } from '@/app/lib/hooks/useDocuments';
import { formatDate } from '@/app/lib/utils/helpers';

const quickActions = [
  {
    title: 'Request New Document',
    description: 'Apply for barangay documents',
    icon: FileText,
    href: '/resident/request-document',
    color: 'from-blue-500 to-purple-600'
  },
  {
    title: 'View All Requests',
    description: 'Track your applications',
    icon: Clock,
    href: '/resident/my-requests',
    color: 'from-purple-500 to-pink-600'
  },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'approved': return { color: 'text-green-400', bg: 'bg-green-500/10' };
    case 'pending':  return { color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    case 'rejected': return { color: 'text-red-400', bg: 'bg-red-500/10' };
    default:         return { color: 'text-gray-400', bg: 'bg-gray-500/10' };
  }
};

export default function DashboardPage() {
  const { userData } = useAuth();
  const { requests, loading } = useDocuments();

  const stats = [
    { 
      label: 'Total Requests', 
      value: loading ? '...' : String(requests.length),
      icon: FileText, 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    },
    { 
      label: 'Pending', 
      value: loading ? '...' : String(requests.filter((r: any) => r.status === 'pending').length),
      icon: Clock, 
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    { 
      label: 'Approved', 
      value: loading ? '...' : String(requests.filter((r: any) => r.status === 'approved').length),
      icon: CheckCircle, 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
    },
    { 
      label: 'Rejected', 
      value: loading ? '...' : String(requests.filter((r: any) => r.status === 'rejected').length),
      icon: XCircle, 
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30'
    },
  ];

  const recentRequests = requests.slice(0, 3);

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
            Welcome Back, {userData?.firstName ?? 'Resident'}! 👋
          </h1>
          <p className="text-gray-400">
            Here&apos;s what&apos;s happening with your documents today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`${stat.bgColor} border ${stat.borderColor} rounded-xl p-6 backdrop-blur-sm`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                </div>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-white/10 rounded w-12 mb-2" />
                    <div className="h-3 bg-white/10 rounded w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </>
                )}
              </div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Requests</h2>
              {requests.length > 0 && (
                <Link 
                  href="/resident/my-requests"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 animate-pulse"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-5 h-5 bg-white/10 rounded" />
                      <div className="h-4 bg-white/10 rounded w-48" />
                    </div>
                    <div className="h-3 bg-white/10 rounded w-32" />
                  </div>
                ))
              ) : recentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-white font-medium mb-1">No requests yet</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Start by requesting your first barangay document
                  </p>
                  <Link href="/resident/request-document">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      Request a Document
                    </span>
                  </Link>
                </div>
              ) : (
                recentRequests.map((request: any) => {
                  const style = getStatusStyle(request.status);
                  return (
                    <div
                      key={request.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <h3 className="font-semibold text-white">{request.type}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(request.createdAt)}
                            </span>
                            <span className="font-mono text-xs">{request.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`${style.bg} ${style.color} px-3 py-1 rounded-full text-xs font-semibold uppercase`}>
                            {request.status}
                          </span>
                          <Link href={`/resident/my-requests/${request.id}`}>
                            <button className="text-gray-400 hover:text-white transition-colors">
                              <Eye className="w-5 h-5" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Right Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-white">Quick Actions</h2>

            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all group"
                >
                  <div className={`bg-gradient-to-r ${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-400">{action.description}</p>
                </Link>
              );
            })}

            {/* Help Card */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-2">Need Help?</h3>
              <p className="text-sm text-gray-400 mb-4">
                Contact the barangay office for assistance.
              </p>
              <div className="space-y-2 text-sm">
                <a
                  href="tel:+63123456789"
                  className="text-blue-400 hover:text-blue-300 transition-colors block"
                >
                  📞 (02) 1234-5678
                </a>
                <a
                  href="mailto:help@barangay.gov.ph"
                  className="text-blue-400 hover:text-blue-300 transition-colors block"
                >
                  ✉️ help@barangay.gov.ph
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Select from '@/app/components/ui/Select';
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  FileText,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useState } from 'react';

const stats = [
  {
    label: 'Total Requests',
    value: '128',
    change: '+12%',
    trend: 'up',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
  },
  {
    label: 'Approved Documents',
    value: '95',
    change: '+8%',
    trend: 'up',
    icon: CheckCircle,
    color: 'from-green-500 to-green-600',
  },
  {
    label: 'Pending Review',
    value: '15',
    change: '-5%',
    trend: 'down',
    icon: Clock,
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    label: 'Active Residents',
    value: '1,234',
    change: '+45',
    trend: 'up',
    icon: Users,
    color: 'from-purple-500 to-purple-600',
  },
];

const documentTypeData = [
  { type: 'Barangay Clearance', count: 45, percentage: 35 },
  { type: 'Certificate of Residency', count: 32, percentage: 25 },
  { type: 'Certificate of Indigency', count: 28, percentage: 22 },
  { type: 'Business Clearance', count: 15, percentage: 12 },
  { type: 'Others', count: 8, percentage: 6 },
];

const monthlyData = [
  { month: 'Jan', requests: 85, approved: 78, rejected: 5 },
  { month: 'Feb', requests: 92, approved: 85, rejected: 4 },
  { month: 'Mar', requests: 78, approved: 72, rejected: 3 },
  { month: 'Apr', requests: 95, approved: 88, rejected: 6 },
  { month: 'May', requests: 88, approved: 82, rejected: 4 },
  { month: 'Jun', requests: 102, approved: 95, rejected: 5 },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('monthly');
  const [dateRange, setDateRange] = useState('last-30-days');

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
                Reports & Analytics
              </h1>
              <p className="text-gray-400">
                View statistics and generate reports
              </p>
            </div>
            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Report Type"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  options={[
                    { value: 'monthly', label: 'Monthly Summary' },
                    { value: 'quarterly', label: 'Quarterly Report' },
                    { value: 'yearly', label: 'Yearly Overview' },
                    { value: 'custom', label: 'Custom Range' },
                  ]}
                />
                <Select
                  label="Date Range"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  options={[
                    { value: 'last-7-days', label: 'Last 7 Days' },
                    { value: 'last-30-days', label: 'Last 30 Days' },
                    { value: 'last-90-days', label: 'Last 90 Days' },
                    { value: 'this-year', label: 'This Year' },
                  ]}
                />
                <div className="flex items-end">
                  <Button variant="outline" className="w-full gap-2">
                    <Calendar className="w-4 h-4" />
                    Custom Date
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                    <div className={`flex items-center gap-1 text-sm ${
                      stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      <TrendingUp className="w-4 h-4" />
                      {stat.change}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Types Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Document Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documentTypeData.map((item) => (
                    <div key={item.type}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">{item.type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-400">{item.percentage}%</span>
                          <span className="text-sm font-medium text-white">{item.count}</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Trends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyData.map((data) => (
                    <div key={data.month} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-white w-12">{data.month}</div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-blue-400">
                            {data.requests} requests
                          </span>
                          <span className="text-green-400">
                            {data.approved} approved
                          </span>
                          <span className="text-red-400">
                            {data.rejected} rejected
                          </span>
                        </div>
                      </div>
                      <div className="w-24 bg-white/5 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${(data.approved / data.requests) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <div className="text-4xl font-bold text-green-400 mb-2">92%</div>
                  <div className="text-sm text-gray-400">Approval Rate</div>
                  <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <div className="text-4xl font-bold text-blue-400 mb-2">1.5</div>
                  <div className="text-sm text-gray-400">Avg. Processing Days</div>
                  <div className="text-xs text-gray-500 mt-1">For all documents</div>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <div className="text-4xl font-bold text-purple-400 mb-2">98%</div>
                  <div className="text-sm text-gray-400">Satisfaction Rate</div>
                  <div className="text-xs text-gray-500 mt-1">Based on feedback</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
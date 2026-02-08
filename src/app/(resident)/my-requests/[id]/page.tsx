'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Eye
} from 'lucide-react';
import Link from 'next/link';

// Mock data
const requestDetails: Record<string, any> = {
  'REQ-001': {
    id: 'REQ-001',
    type: 'Barangay Clearance',
    status: 'approved',
    dateRequested: '2024-01-15',
    dateProcessed: '2024-01-16',
    purpose: 'Employment',
    applicant: {
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@email.com',
      phone: '+63 912 345 6789',
      address: 'Block 5 Lot 10, Barangay Salawag, Dasmariñas, Cavite',
    },
    requirements: [
      { name: 'Valid ID', status: 'verified' },
      { name: 'Proof of Residency', status: 'verified' },
    ],
    timeline: [
      { date: '2024-01-15 09:30 AM', event: 'Request submitted', status: 'completed' },
      { date: '2024-01-15 10:15 AM', event: 'Documents verified', status: 'completed' },
      { date: '2024-01-16 02:00 PM', event: 'Request approved', status: 'completed' },
      { date: '2024-01-16 02:05 PM', event: 'Document issued', status: 'completed' },
    ],
    documentUrl: '/documents/REQ-001.pdf',
  },
  'REQ-002': {
    id: 'REQ-002',
    type: 'Certificate of Residency',
    status: 'pending',
    dateRequested: '2024-01-20',
    dateProcessed: null,
    purpose: 'School Requirement',
    applicant: {
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@email.com',
      phone: '+63 912 345 6789',
      address: 'Block 5 Lot 10, Barangay Salawag, Dasmariñas, Cavite',
    },
    requirements: [
      { name: 'Valid ID', status: 'verified' },
      { name: 'Proof of Residency', status: 'pending' },
    ],
    timeline: [
      { date: '2024-01-20 11:00 AM', event: 'Request submitted', status: 'completed' },
      { date: '2024-01-20 11:30 AM', event: 'Under review', status: 'current' },
    ],
  },
};

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const request = requestDetails[id];

  if (!request) {
    return (
      <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-400 mb-4">Request not found</p>
            <Link href="/resident/my-requests">
              <Button>Back to Requests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link href="/resident/my-requests">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Requests
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{request.type}</h1>
              <p className="text-gray-400">Request ID: {request.id}</p>
            </div>
            <Badge variant={request.status as any} className="text-sm px-4 py-2">
              {request.status}
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Document Type</p>
                    <p className="text-white font-medium">{request.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Purpose</p>
                    <p className="text-white font-medium">{request.purpose}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Date Requested</p>
                    <p className="text-white font-medium">
                      {new Date(request.dateRequested).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Date Processed</p>
                    <p className="text-white font-medium">
                      {request.dateProcessed 
                        ? new Date(request.dateProcessed).toLocaleDateString()
                        : 'Pending'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applicant Information */}
            <Card>
              <CardHeader>
                <CardTitle>Applicant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="text-white">{request.applicant.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{request.applicant.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="text-white">{request.applicant.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Address</p>
                    <p className="text-white">{request.applicant.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Submitted Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.requirements.map((req: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <span className="text-white">{req.name}</span>
                      </div>
                      <Badge variant={req.status === 'verified' ? 'approved' : 'pending'}>
                        {req.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.timeline.map((item: any, index: number) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            item.status === 'completed'
                              ? 'bg-green-500'
                              : item.status === 'current'
                              ? 'bg-blue-500 animate-pulse'
                              : 'bg-gray-600'
                          }`}
                        />
                        {index < request.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-700 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-white text-sm font-medium">{item.event}</p>
                        <p className="text-gray-400 text-xs">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {request.status === 'approved' && request.documentUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    Download Document
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Eye className="w-4 h-4" />
                    View Document
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
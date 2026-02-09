'use client';

import { use, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import TextArea from '@/app/components/ui/TextArea';
import Modal from '@/app/components/ui/Modal';
import Alert from '@/app/components/ui/Alert';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Mock data
const requestDetails: Record<string, any> = {
  'REQ-015': {
    id: 'REQ-015',
    type: 'Barangay Clearance',
    status: 'pending',
    priority: 'high',
    dateRequested: '2024-02-08 09:30 AM',
    purpose: 'Employment',
    applicant: {
      name: 'Maria Garcia',
      email: 'maria.garcia@email.com',
      phone: '+63 912 345 6789',
      address: 'Block 3 Lot 15, Barangay Salawag, Dasmariñas, Cavite',
      birthdate: '1995-03-20',
      civilStatus: 'Single',
    },
    requirements: [
      { name: 'Valid Government ID', status: 'verified', file: 'id-front.jpg' },
      { name: 'Proof of Residency', status: 'verified', file: 'utility-bill.pdf' },
      { name: '2x2 Photo', status: 'verified', file: 'photo.jpg' },
    ],
    additionalInfo: 'Needed for job application at SM City Dasmariñas. Requested rush processing if possible.',
  },
  'REQ-014': {
    id: 'REQ-014',
    type: 'Certificate of Indigency',
    status: 'pending',
    priority: 'urgent',
    dateRequested: '2024-02-08 09:15 AM',
    purpose: 'Medical Assistance',
    applicant: {
      name: 'Jose Reyes',
      email: 'jose.reyes@email.com',
      phone: '+63 923 456 7890',
      address: 'Block 7 Lot 22, Barangay Salawag, Dasmariñas, Cavite',
      birthdate: '1988-11-10',
      civilStatus: 'Married',
    },
    requirements: [
      { name: 'Valid Government ID', status: 'verified', file: 'id.jpg' },
      { name: 'Medical Documents', status: 'verified', file: 'medical-cert.pdf' },
      { name: 'Proof of Income', status: 'pending', file: null },
    ],
    additionalInfo: 'Urgent - needed for hospital admission. Patient requires immediate medical attention.',
  },
};

export default function ReviewRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const request = requestDetails[id];

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!request) {
    return (
      <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-400 mb-4">Request not found</p>
            <Link href="/admin/pending-requests">
              <Button>Back to Pending Requests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleApprove = async () => {
    setProcessing(true);
    // TODO: API call to approve request
    console.log('Approving request:', { id, notes: approvalNotes });
    
    setTimeout(() => {
      setProcessing(false);
      setShowApproveModal(false);
      router.push('/admin/pending-requests');
    }, 2000);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    // TODO: API call to reject request
    console.log('Rejecting request:', { id, reason: rejectReason });

    setTimeout(() => {
      setProcessing(false);
      setShowRejectModal(false);
      router.push('/admin/pending-requests');
    }, 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'rejected';
      case 'high':
        return 'pending';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link href="/admin/pending-requests">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Pending Requests
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
            <div className="flex gap-2">
              <Badge variant={getPriorityColor(request.priority) as any}>
                {request.priority} priority
              </Badge>
              <Badge variant="pending">Pending Review</Badge>
            </div>
          </div>
        </motion.div>

        {/* Alert if urgent */}
        {request.priority === 'urgent' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert variant="error" title="Urgent Request">
              This request requires immediate attention. {request.additionalInfo}
            </Alert>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle>Request Information</CardTitle>
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
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-white font-medium">{request.dateRequested}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Priority Level</p>
                    <p className="text-white font-medium capitalize">{request.priority}</p>
                  </div>
                </div>
                {request.additionalInfo && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Additional Information</p>
                    <p className="text-white bg-white/5 p-3 rounded-lg">{request.additionalInfo}</p>
                  </div>
                )}
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
                    <p className="text-sm text-gray-400">Full Name</p>
                    <p className="text-white font-medium">{request.applicant.name}</p>
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
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-gray-400">Birthdate</p>
                    <p className="text-white">{new Date(request.applicant.birthdate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Civil Status</p>
                    <p className="text-white">{request.applicant.civilStatus}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submitted Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Submitted Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.requirements.map((req: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-white font-medium">{req.name}</p>
                          {req.file && (
                            <p className="text-xs text-gray-400">{req.file}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={req.status === 'verified' ? 'approved' : 'pending'}>
                          {req.status}
                        </Badge>
                        {req.file && (
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full gap-2"
                  onClick={() => setShowApproveModal(true)}
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Request
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setShowRejectModal(true)}
                >
                  <XCircle className="w-4 h-4" />
                  Reject Request
                </Button>
              </CardContent>
            </Card>

            {/* Processing Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Processing Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Standard Processing</p>
                  <p className="text-white font-medium">1-2 business days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Documents Required</p>
                  <p className="text-white font-medium">{request.requirements.length} items</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Verified Documents</p>
                  <p className="text-white font-medium">
                    {request.requirements.filter((r: any) => r.status === 'verified').length} of {request.requirements.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Warning */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium mb-1">Important</p>
                    <p className="text-xs text-gray-400">
                      Please verify all submitted documents before approving. Approved documents 
                      will be recorded on the blockchain and cannot be modified.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Approve Modal */}
        <Modal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Request"
        >
          <div className="space-y-4">
            <Alert variant="success">
              You are about to approve this document request. The document will be generated 
              and sent to the applicant.
            </Alert>
            <TextArea
              label="Approval Notes (Optional)"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={4}
              placeholder="Add any notes for this approval..."
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowApproveModal(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleApprove}
                disabled={processing}
              >
                {processing ? (
                  'Processing...'
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Approval
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Reject Modal */}
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Request"
        >
          <div className="space-y-4">
            <Alert variant="warning">
              Please provide a clear reason for rejection. This will be sent to the applicant.
            </Alert>
            <TextArea
              label="Reason for Rejection *"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Explain why this request is being rejected..."
              required
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRejectModal(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2 bg-red-500 hover:bg-red-600"
                onClick={handleReject}
                disabled={processing}
              >
                {processing ? (
                  'Processing...'
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
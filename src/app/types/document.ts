export interface DocumentRequest {
  id: string;
  userId: string;
  type: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'normal' | 'high' | 'urgent';
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    birthdate?: string;
    civilStatus?: string;
  };
  requirements: Array<{
    name: string;
    status: 'pending' | 'verified';
    fileUrl?: string;
  }>;
  additionalInfo?: string;
  notes?: string;
  processedBy?: string;
  createdAt: any;
  updatedAt: any;
  processedAt?: any;
}

export interface ApprovedDocument {
  id: string;
  requestId: string;
  userId: string;
  type: string;
  purpose: string;
  qrCode: string;
  blockchainHash: string;
  transactionId: string;
  pdfUrl: string;
  issuedBy: string;
  issuedAt: any;
  validUntil: any;
  applicant: {
    name: string;
    address: string;
    birthdate?: string;
    civilStatus?: string;
  };
}
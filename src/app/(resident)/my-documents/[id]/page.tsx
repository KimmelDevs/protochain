'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  QrCode,
  FileText,
  Shield,
  CheckCircle,
  Printer
} from 'lucide-react';
import Link from 'next/link';
import { getDocumentById } from '@/app/firebase/firestore';
import { formatDate } from '@/app/lib/utils/helpers';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      const result = await getDocumentById(id);
      if (result.success && result.document) {
        setDocument(result.document);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };
    fetchDocument();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 lg:p-8">
        <div className="max-w-5xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-white/10 rounded w-48" />
          <div className="h-12 bg-white/10 rounded w-96" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-white/10 rounded-xl" />
            <div className="space-y-4">
              <div className="h-48 bg-white/10 rounded-xl" />
              <div className="h-48 bg-white/10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !document) {
    return (
      <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Document not found</p>
          <Link href="/resident/my-documents">
            <Button>Back to Documents</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isValid = () => {
    if (!document.validUntil) return false;
    const date = document.validUntil?.toDate 
      ? document.validUntil.toDate() 
      : new Date(document.validUntil);
    return date > new Date();
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link href="/resident/my-documents">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
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
              <h1 className="text-3xl font-bold text-white mb-2">{document.type}</h1>
              <p className="text-gray-400">Document ID: {document.id}</p>
            </div>
            <Badge variant={isValid() ? 'approved' : 'rejected'}>
              {isValid() ? 'Valid' : 'Expired'}
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-8 text-black">
                  {/* Official Header */}
                  <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-2xl font-bold">REPUBLIC OF THE PHILIPPINES</h2>
                    <p className="text-lg">Province of Cavite</p>
                    <p className="text-lg">Municipality of Dasmariñas</p>
                    <p className="text-xl font-bold mt-2">BARANGAY SALAWAG</p>
                  </div>

                  {/* Document Title */}
                  <h3 className="text-2xl font-bold text-center mb-6 uppercase">
                    {document.type}
                  </h3>

                  {/* Content */}
                  <div className="space-y-4 mb-8">
                    <p>TO WHOM IT MAY CONCERN:</p>
                    <p className="text-justify indent-8">
                      This is to certify that <strong>{document.applicant?.name}</strong>,
                      of legal age, {document.applicant?.civilStatus}, Filipino citizen,
                      and a bonafide resident of {document.applicant?.address}.
                    </p>
                    <p className="text-justify indent-8">
                      This certification is being issued upon the request of the above-named
                      person for <strong>{document.purpose}</strong> purposes.
                    </p>
                    <p className="text-justify indent-8">
                      Issued this {formatDate(document.issuedAt)} at Barangay Salawag,
                      Dasmariñas, Cavite.
                    </p>
                  </div>

                  {/* Signature */}
                  <div className="flex justify-end mt-12">
                    <div className="text-center">
                      <div className="border-t-2 border-black w-64 mb-1" />
                      <p className="font-bold">{document.issuedBy}</p>
                      <p className="text-sm">Barangay Captain</p>
                    </div>
                  </div>

                  {/* QR Code Placeholder */}
                  <div className="mt-8 text-center">
                    <div className="inline-block p-4 border-2 border-black">
                      <div className="w-32 h-32 bg-gray-200 flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="text-xs mt-2">Scan to verify</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Information */}
            <Card>
              <CardHeader>
                <CardTitle>Document Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Document ID</p>
                    <p className="text-white font-mono text-sm">{document.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Request ID</p>
                    <p className="text-white font-mono text-sm">{document.requestId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Date Issued</p>
                    <p className="text-white">{formatDate(document.issuedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Valid Until</p>
                    <p className="text-white">{formatDate(document.validUntil)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Purpose</p>
                    <p className="text-white">{document.purpose}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Issued By</p>
                    <p className="text-white">{document.issuedBy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="bg-white p-6 rounded-lg mb-4 inline-block">
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-gray-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">QR Code ID</p>
                <p className="text-white font-mono text-sm">{document.qrCode}</p>
              </CardContent>
            </Card>

            {/* Blockchain Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Blockchain Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Transaction ID</p>
                  <p className="text-white font-mono text-xs break-all">
                    {document.transactionId || 'Pending...'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Blockchain Hash</p>
                  <p className="text-white font-mono text-xs break-all">
                    {document.blockchainHash || 'Pending...'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {document.blockchainHash ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-green-400">Verified on Blockchain</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 text-yellow-400" />
                      <span className="text-sm text-yellow-400">Awaiting Verification</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Printer className="w-4 h-4" />
                  Print Document
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Document
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
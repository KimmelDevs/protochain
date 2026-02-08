'use client';

import { use, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import TextArea from '@/app/components/ui/TextArea';
import Button from '@/app/components/ui/Button';
import Alert from '@/app/components/ui/Alert';
import { 
  ArrowLeft, 
  Upload, 
  X,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Document type configurations
const documentConfig: Record<string, any> = {
  'barangay-clearance': {
    title: 'Barangay Clearance',
    description: 'General-purpose clearance for employment, business, and other transactions.',
    purposes: [
      { value: 'employment', label: 'Employment' },
      { value: 'business', label: 'Business' },
      { value: 'travel', label: 'Travel' },
      { value: 'loan', label: 'Loan Application' },
      { value: 'others', label: 'Others' },
    ],
    requiredDocuments: [
      'Valid Government-issued ID',
      'Proof of Residency (Utility Bill, Lease Contract, etc.)',
      'Recent 2x2 Photo (Optional)',
    ],
  },
  'certificate-of-residency': {
    title: 'Certificate of Residency',
    description: 'Official proof that you are a resident of the barangay.',
    purposes: [
      { value: 'school', label: 'School Requirement' },
      { value: 'employment', label: 'Employment' },
      { value: 'government', label: 'Government Transaction' },
      { value: 'others', label: 'Others' },
    ],
    requiredDocuments: [
      'Valid Government-issued ID',
      'Proof of Residency (Utility Bill, Lease Contract, etc.)',
      'Proof of address (at least 6 months residency)',
    ],
  },
  'certificate-of-indigency': {
    title: 'Certificate of Indigency',
    description: 'Certificate for availing government assistance and scholarships.',
    purposes: [
      { value: 'medical', label: 'Medical Assistance' },
      { value: 'scholarship', label: 'Scholarship' },
      { value: 'burial', label: 'Burial Assistance' },
      { value: 'financial', label: 'Financial Assistance' },
      { value: 'others', label: 'Others' },
    ],
    requiredDocuments: [
      'Valid Government-issued ID',
      'Proof of Residency',
      'Proof of Income (if applicable)',
      'Supporting documents for assistance',
    ],
  },
  'business-clearance': {
    title: 'Business Clearance',
    description: 'Required for business permit applications within the barangay.',
    purposes: [
      { value: 'new-business', label: 'New Business' },
      { value: 'renewal', label: 'Business Renewal' },
      { value: 'expansion', label: 'Business Expansion' },
    ],
    requiredDocuments: [
      'Valid Government-issued ID',
      'DTI/SEC Registration',
      'Business Location Map/Sketch',
      'Proof of Property Ownership or Lease Contract',
    ],
  },
  'job-seeker': {
    title: 'Job Seeker Certificate',
    description: 'Certification for first-time job seekers under RA 11261.',
    purposes: [
      { value: 'job-application', label: 'Job Application' },
    ],
    requiredDocuments: [
      'Valid Government-issued ID',
      'Birth Certificate',
      'Proof of Residency',
      'Diploma or Certificate of Graduation',
    ],
  },
  'barangay-certification': {
    title: 'Barangay Certification',
    description: 'General-purpose certification for various legal and personal needs.',
    purposes: [
      { value: 'legal', label: 'Legal Purpose' },
      { value: 'personal', label: 'Personal Purpose' },
      { value: 'government', label: 'Government Transaction' },
      { value: 'others', label: 'Others' },
    ],
    requiredDocuments: [
      'Valid Government-issued ID',
      'Proof of Residency',
      'Supporting documents (if applicable)',
    ],
  },
};

export default function RequestDocumentFormPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const config = documentConfig[type];

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    purpose: '',
    customPurpose: '',
    additionalInfo: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!config) {
    return (
      <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-400 mb-4">Document type not found</p>
            <Link href="/resident/request-document">
              <Button>Back to Document Types</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.address || !formData.purpose) {
      setError('Please fill in all required fields');
      return;
    }

    if (uploadedFiles.length === 0) {
      setError('Please upload at least one required document');
      return;
    }

    setLoading(true);

    // TODO: Submit to backend
    console.log('Form Data:', formData);
    console.log('Uploaded Files:', uploadedFiles);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      router.push('/resident/my-requests');
    }, 2000);
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/resident/request-document">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Document Types
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {config.title}
          </h1>
          <p className="text-gray-400">{config.description}</p>
        </motion.div>

        {/* Info Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Alert variant="info" title="Required Documents">
            <ul className="list-disc list-inside space-y-1">
              {config.requiredDocuments.map((doc: string, index: number) => (
                <li key={index}>{doc}</li>
              ))}
            </ul>
          </Alert>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert variant="error" title="Error" onClose={() => setError('')}>
              {error}
            </Alert>
          </motion.div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Application Form</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="First Name *"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                    <Input
                      label="Middle Name"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                    />
                    <Input
                      label="Last Name *"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email Address *"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                    <Input
                      label="Phone Number *"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+63 912 345 6789"
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <TextArea
                    label="Complete Address *"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Block, Lot, Street, Barangay, City/Municipality, Province"
                    required
                  />
                </div>

                {/* Purpose */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Purpose of Request</h3>
                  <div className="space-y-4">
                    <Select
                      label="Select Purpose *"
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleInputChange}
                      options={[
                        { value: '', label: 'Choose a purpose...' },
                        ...config.purposes,
                      ]}
                      required
                    />
                    {formData.purpose === 'others' && (
                      <Input
                        label="Specify Purpose *"
                        name="customPurpose"
                        value={formData.customPurpose}
                        onChange={handleInputChange}
                        placeholder="Please specify your purpose"
                        required
                      />
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <TextArea
                    label="Additional Information (Optional)"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Any additional details that may help process your request..."
                  />
                </div>

                {/* File Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Upload Requirements *</h3>
                  <div className="space-y-4">
                    {/* Upload Button */}
                    <div>
                      <label className="block w-full">
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-white mb-2">Click to upload documents</p>
                          <p className="text-sm text-gray-400">
                            PDF, JPG, PNG (Max 5MB per file)
                          </p>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                      </label>
                    </div>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">Uploaded Files:</p>
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-blue-400" />
                              <div>
                                <p className="text-white text-sm">{file.name}</p>
                                <p className="text-gray-400 text-xs">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <Link href="/resident/request-document" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
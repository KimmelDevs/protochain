'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/app/components/ui/Card';
import { 
  FileText, 
  Home, 
  Heart, 
  Briefcase, 
  Users,
  ArrowRight,
  Clock
} from 'lucide-react';
import Link from 'next/link';

const documentTypes = [
  {
    id: 'barangay-clearance',
    title: 'Barangay Clearance',
    description: 'General-purpose clearance for employment, business, and other transactions.',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    processingTime: '1-2 days',
    requirements: ['Valid ID', 'Proof of Residency'],
  },
  {
    id: 'certificate-of-residency',
    title: 'Certificate of Residency',
    description: 'Official proof that you are a resident of the barangay.',
    icon: Home,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    processingTime: '1-2 days',
    requirements: ['Valid ID', 'Proof of Residency'],
  },
  {
    id: 'certificate-of-indigency',
    title: 'Certificate of Indigency',
    description: 'Certificate for availing government assistance and scholarships.',
    icon: Heart,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    processingTime: '1 day',
    requirements: ['Valid ID', 'Proof of Income (if applicable)'],
  },
  {
    id: 'business-clearance',
    title: 'Business Clearance',
    description: 'Required for business permit applications within the barangay.',
    icon: Briefcase,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    processingTime: '2-3 days',
    requirements: ['Valid ID', 'Business Documents', 'Proof of Location'],
  },
  {
    id: 'job-seeker',
    title: 'Job Seeker Certificate',
    description: 'Certification for first-time job seekers under RA 11261.',
    icon: Users,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    processingTime: '1 day',
    requirements: ['Valid ID', 'Birth Certificate', 'Proof of Residency'],
  },
  {
    id: 'barangay-certification',
    title: 'Barangay Certification',
    description: 'General-purpose certification for various legal and personal needs.',
    icon: FileText,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    processingTime: '1-2 days',
    requirements: ['Valid ID', 'Proof of Residency'],
  },
];

export default function RequestDocumentPage() {
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
            Request a Document
          </h1>
          <p className="text-gray-400">
            Choose the type of document you want to request
          </p>
        </motion.div>

        {/* Document Types Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {documentTypes.map((doc, index) => {
            const Icon = doc.icon;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Link href={`/resident/request-document/${doc.id}`}>
                  <Card hover className="h-full">
                    <CardContent className="p-6">
                      {/* Icon */}
                      <div className={`w-14 h-14 bg-gradient-to-r ${doc.color} rounded-lg flex items-center justify-center mb-4`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {doc.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {doc.description}
                      </p>

                      {/* Processing Time */}
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-500">Processing: {doc.processingTime}</span>
                      </div>

                      {/* Requirements */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">Requirements:</p>
                        <div className="flex flex-wrap gap-1">
                          {doc.requirements.map((req, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400"
                            >
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <span className="text-sm font-medium text-blue-400">
                          Apply Now
                        </span>
                        <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Need help choosing?
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Not sure which document you need? Contact the barangay office for assistance,
                    or check our FAQ section for more information about each document type.
                  </p>
                  
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
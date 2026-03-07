'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/app/components/ui/Card';
import { FileText, Briefcase, Users, ScrollText, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

const documentTypes = [
  {
    id: 'barangay-clearance',
    title: 'Barangay Clearance',
    description: 'General-purpose clearance for employment, business, travel, and other transactions.',
    icon: FileText,
    color: 'from-green-700 to-green-800',
    processingTime: '1-2 days',
    purposes: ['Employment', 'Business', 'Travel', 'Loan Application', 'Others'],
  },
  {
    id: 'business-clearance',
    title: 'Business Clearance',
    description: 'Required for business permit applications within the barangay.',
    icon: Briefcase,
    color: 'from-blue-700 to-blue-800',
    processingTime: '2-3 days',
    purposes: ['New Business', 'Business Renewal', 'Business Expansion'],
  },
  {
    id: 'certification-of-death',
    title: 'Certification of Death',
    description: 'Official barangay certification for the death of a resident.',
    icon: ScrollText,
    color: 'from-purple-700 to-purple-800',
    processingTime: '1 day',
    purposes: ['Legal Purpose', 'Insurance', 'Government Transaction', 'Others'],
  },
  {
    id: 'job-seeker',
    title: 'First Time Jobseeker Certification',
    description: 'Certification for first-time job seekers under RA 11261.',
    icon: Users,
    color: 'from-orange-700 to-orange-800',
    processingTime: '1 day',
    purposes: ['Job Application'],
  },
  {
    id: 'oath-of-undertaking',
    title: 'Oath of Undertaking',
    description: 'Oath of undertaking for first-time job seekers under RA 11261.',
    icon: FileText,
    color: 'from-teal-700 to-teal-800',
    processingTime: '1 day',
    purposes: ['Job Application'],
  },
];

export default function RequestDocumentPage() {
  return (
    <div className="min-h-screen p-4 lg:p-8 bg-white dark:bg-[#0f0f23] transition-colors duration-300">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Request a Document
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose the type of document you want to request
          </p>
        </motion.div>

        {/* Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documentTypes.map((doc, index) => {
            const Icon = doc.icon;

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <Link href={`/request-document/${doc.id}`}>
                  <Card hover className="h-full">
                    <CardContent className="p-6">

                      {/* Icon */}
                      <div className={`w-14 h-14 bg-gradient-to-r ${doc.color} rounded-lg flex items-center justify-center mb-4`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {doc.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {doc.description}
                      </p>

                      {/* Processing */}
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-500 dark:text-gray-400">
                          Processing: {doc.processingTime}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-300 dark:border-white/10">
                        <span className="text-sm font-medium text-blue-500 dark:text-blue-400">
                          Apply Now
                        </span>
                        <ArrowRight className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      </div>

                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
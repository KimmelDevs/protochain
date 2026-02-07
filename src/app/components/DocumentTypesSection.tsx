"use client";

import { motion } from "framer-motion";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

const documents = [
  {
    title: "Barangay Clearance",
    description: "General-purpose clearance for employment, business, and other transactions.",
    processingTime: "1-2 days",
  },
  {
    title: "Certificate of Residency",
    description: "Official proof that you are a resident of the barangay.",
    processingTime: "1-2 days",
  },
  {
    title: "Certificate of Indigency",
    description: "Certificate for availing government assistance and scholarships.",
    processingTime: "1 day",
  },
  {
    title: "Business Clearance",
    description: "Required for business permit applications within the barangay.",
    processingTime: "2-3 days",
  },
  {
    title: "Job Seeker Certificate",
    description: "Certification for first-time job seekers under RA 11261.",
    processingTime: "1 day",
  },
  {
    title: "Barangay Certification",
    description: "General-purpose certification for various legal and personal needs.",
    processingTime: "1-2 days",
  },
];

export default function DocumentTypesSection() {
  return (
    <section className="py-24 bg-[#0f0f23]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
            Documents
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
            Available Documents
          </h2>
          <p className="text-gray-400 text-lg">
            Request any of these official barangay documents through our secure platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group p-5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1">{doc.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{doc.description}</p>
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                    ~{doc.processingTime}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link href="/login">
            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition transform hover:scale-105">
              Request a Document Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
"use client";

import { motion } from "framer-motion";
import {
  FileText,
  ShieldCheck,
  QrCode,
  Clock,
  Users,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Online Document Requests",
    description:
      "Request barangay clearances, certificates, and permits from anywhere — no need to visit the barangay hall.",
  },
  {
    icon: ShieldCheck,
    title: "Blockchain Security",
    description:
      "Every document hash is stored on an immutable blockchain ledger, making forgery virtually impossible.",
  },
  {
    icon: QrCode,
    title: "QR Code Verification",
    description:
      "Scan the embedded QR code on any document to instantly verify its authenticity against the blockchain.",
  },
  {
    icon: Clock,
    title: "Fast Processing",
    description:
      "Digital workflows eliminate manual paperwork, reducing processing time from days to hours.",
  },
  {
    icon: Users,
    title: "Admin Dashboard",
    description:
      "Barangay officials get a powerful dashboard to review, approve, and manage all document requests.",
  },
  {
    icon: BarChart3,
    title: "Full Audit Trail",
    description:
      "Every action is logged and traceable — from request submission to final issuance and verification.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="services" className="py-24 bg-[#0f0f23]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-orange-400 uppercase tracking-wider">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
            Modernizing Barangay Services
          </h2>
          <p className="text-gray-400 text-lg">
            A complete digital platform designed specifically for the Philippine
            barangay system, built with security and accessibility in mind.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
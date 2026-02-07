"use client";

import { motion } from "framer-motion";
import { FileEdit, CheckCircle2, Download, ScanLine } from "lucide-react";

const steps = [
  {
    icon: FileEdit,
    step: "01",
    title: "Request Online",
    description:
      "Fill out the document request form, upload your requirements, and submit — all from your phone or computer.",
  },
  {
    icon: CheckCircle2,
    step: "02",
    title: "Official Review",
    description:
      "Barangay officials review your request, verify your identity, and approve or provide feedback.",
  },
  {
    icon: Download,
    step: "03",
    title: "Receive Document",
    description:
      "Get your official document with a unique QR code, cryptographic hash stored permanently on the blockchain.",
  },
  {
    icon: ScanLine,
    step: "04",
    title: "Instant Verification",
    description:
      "Anyone can scan the QR code to instantly verify the document's authenticity against the blockchain record.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-[#1a1a2e]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
            Process
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-lg">
            From request to verification — a streamlined, transparent, and
            secure document issuance process.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-white/10" />
              )}

              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 mb-6 shadow-lg shadow-purple-500/30">
                <step.icon className="w-8 h-8 text-white" />
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {step.step}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
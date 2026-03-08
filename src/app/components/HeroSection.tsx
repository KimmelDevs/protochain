"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, QrCode } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#0f0f23]" />

      {/* Decorative particles */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-75" />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-cyan-500 rounded-full animate-pulse delay-150" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT — Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 mb-6">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">
                Blockchain-Secured Documents
              </span>
            </div>

            {/* App Name */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              ProtoChain
            </h1>

            {/* Headline */}
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
              <span className="text-white">Secure Barangay</span>
              <br />
              <span className="text-white">Documents with </span>
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Blockchain
              </span>
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-400 max-w-xl mb-8 leading-relaxed">
              Request, issue, and verify barangay documents instantly.
              Powered by blockchain technology and QR code verification
              for tamper-proof authenticity.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <button className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 px-8 rounded-lg transition transform hover:scale-105">
                  Request a Document
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>

              <Link href="/verify">
                <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-purple-500 text-white font-semibold py-3 px-8 rounded-lg transition">
                  <QrCode className="w-5 h-5" />
                  Verify a Document
                </button>
              </Link>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="grid grid-cols-3 gap-6 mt-16 max-w-lg"
            >
              {[
                { value: "100%", label: "Tamper-Proof" },
                { value: "< 1 min", label: "Verification" },
                { value: "24/7", label: "Accessible" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — Image */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full max-w-lg mx-auto">
              <Image
                src="/images/verify_document.png"
                alt="Verify Document"
                width={600}
                height={600}
                priority
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

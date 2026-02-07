import { Shield } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e] py-12 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight">
                  ProtoChain
                </span>
                <span className="text-[10px] text-gray-400 leading-tight">
                  Document Verification System
                </span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
              A blockchain-based barangay document issuance and verification system 
              with QR code technology for tamper-proof, accessible public services.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {["Home", "Services", "How It Works", "Verify Document"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-400 hover:text-purple-400 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">
              Portals
            </h4>
            <ul className="space-y-2.5">
              {["Resident Portal", "Admin Dashboard", "QR Verification"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-gray-400 hover:text-purple-400 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} ProtoChain. Blockchain-Based Barangay Document Issuance System.
          </p>
        </div>
      </div>
    </footer>
  );
}
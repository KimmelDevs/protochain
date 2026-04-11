import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    // banner-dark bg (#171717), surface-dark upper gradient
    <footer className="bg-[#171717] py-12 border-t border-[#e0e1e6]/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-[8px] overflow-hidden flex items-center justify-center">
                <Image
                  src="/protochain_logo2.jpg"
                  alt="ProtoChain Logo"
                  width={36}
                  height={36}
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight">
                  ProtoChain
                </span>
                {/* caption size, silver text */}
                <span className="text-[10px] text-[#b0b4ba] leading-tight">
                  Document Verification System
                </span>
              </div>
            </Link>
            {/* body text, silver color */}
            <p className="text-[#b0b4ba] text-[14px] max-w-sm leading-relaxed">
              A blockchain-based barangay document issuance and verification system
              with QR code technology for tamper-proof, accessible public services.
            </p>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {["Home", "Services", "How It Works", "Verify Document"].map((link) => (
                <li key={link}>
                  {/* footer links use footer-link token (#476cff) */}
                  <a href="#" className="text-[14px] text-[#b0b4ba] hover:text-[#476cff] transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-white mb-4">
              Portals
            </h4>
            <ul className="space-y-2.5">
              {["Resident Portal", "Admin Dashboard", "QR Verification"].map((link) => (
                <li key={link}>
                  {/* footer links use footer-link token (#476cff) */}
                  <a href="#" className="text-[14px] text-[#b0b4ba] hover:text-[#476cff] transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#e0e1e6]/10 mt-10 pt-6 text-center">
          {/* caption size, mid-slate color */}
          <p className="text-[12px] text-[#555860]">
            © {new Date().getFullYear()} ProtoChain. Blockchain-Based Barangay Document Issuance System.
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Image from "next/image";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Verify", href: "/verify" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    // banner-dark bg (#171717), border-token
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#171717]/90 backdrop-blur-lg border-b border-[#e0e1e6]/10">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link href="/" className="flex items-center gap-2.5">
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
            <span className="text-sm font-bold text-white leading-tight">ProtoChain</span>
            {/* caption size, silver text */}
            <span className="text-[10px] text-[#b0b4ba] leading-tight">Document Verification</span>
          </div>
        </Link>

        {/* Desktop Nav — slate text, hover white */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-[14px] font-medium rounded-[6px] text-[#b0b4ba] hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {/* Standard White button style */}
          <Link href="/login">
            <button className="px-4 py-2 text-[14px] font-medium text-white border border-[#e0e1e6]/20 rounded-[8px] hover:border-[#0d74ce] hover:text-[#0d74ce] transition">
              Login
            </button>
          </Link>
          {/* Primary Pill (Dark) */}
          <Link href="/register">
            <button className="px-4 py-2 text-[14px] font-medium text-white bg-[#000000] hover:opacity-80 rounded-[9999px] transition">
              Sign Up
            </button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#171717] border-b border-[#e0e1e6]/10">
          <nav className="flex flex-col p-4 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[14px] font-medium rounded-[6px] text-[#b0b4ba] hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[#e0e1e6]/10">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <button className="w-full px-4 py-2 text-[14px] font-medium text-white border border-[#e0e1e6]/20 rounded-[8px] hover:border-[#0d74ce] transition">
                  Login
                </button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                {/* Primary Pill (Dark) */}
                <button className="w-full px-4 py-2 text-[14px] font-medium text-white bg-[#000000] rounded-[9999px] hover:opacity-80 transition">
                  Sign Up
                </button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

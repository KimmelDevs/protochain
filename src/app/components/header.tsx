"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Verify", href: "/verify" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? "bg-[#0f0f23]/95 backdrop-blur-lg border-b border-white/10 shadow-lg shadow-black/20"
        : "bg-transparent"
    }`}>
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
            <span className="text-[10px] text-[#b0b4ba] leading-tight">Document Verification</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href.split("#")[0]));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-[14px] font-medium rounded-[6px] transition-colors ${
                  isActive
                    ? "text-white bg-white/10"
                    : "text-[#b0b4ba] hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <button className="px-4 py-2 text-[14px] font-medium text-[#b0b4ba] border border-white/20 rounded-[8px] hover:border-orange-500 hover:text-orange-400 transition-colors">
              Login
            </button>
          </Link>
          <Link href="/register">
            <button className="px-4 py-2 text-[14px] font-semibold text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-full transition-all transform hover:scale-105">
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
        <div className="md:hidden bg-[#0f0f23]/98 backdrop-blur-lg border-b border-white/10">
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
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <button className="w-full px-4 py-2 text-[14px] font-medium text-[#b0b4ba] border border-white/20 rounded-[8px] hover:border-orange-500 hover:text-orange-400 transition-colors">
                  Login
                </button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                <button className="w-full px-4 py-2 text-[14px] font-semibold text-white bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full hover:from-yellow-400 hover:to-orange-400 transition-all">
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
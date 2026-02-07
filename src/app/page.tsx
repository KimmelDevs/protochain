"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-gradient-dark">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        {/* App Name */}
        <h1 className="text-6xl md:text-7xl font-extrabold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          ProtoChain
        </h1>

        {/* Hero Headline */}
        <h2 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="gradient-text">
            Secure Barangay Documents
          </span>
          <br />
          <span className="text-white">
            with Blockchain Technology
          </span>
        </h2>
        
        <p className="text-gray-400 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
          Request, verify, and manage official barangay documents securely 
          using blockchain technology and QR code verification.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleGetStarted}
            className="bg-dark-light text-white px-8 py-3 rounded-lg font-semibold border border-primary-500/30 hover:border-primary-500 transition"
          >
            Get Started
          </button>
          <button className="bg-dark-light text-white px-8 py-3 rounded-lg font-semibold border border-primary-500/30 hover:border-primary-500 transition">
            Learn More
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why use this system?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature Card 1 */}
          <div className="card-gradient rounded-xl p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Secure & Tamper-proof</h3>
            <p className="text-gray-400">
              Documents are secured with blockchain technology, making them impossible to forge or tamper.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div className="card-gradient rounded-xl p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Fast Verification</h3>
            <p className="text-gray-400">
              Instant verification through QR codes - no need to visit the barangay office.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div className="card-gradient rounded-xl p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">Accessible Anywhere</h3>
            <p className="text-gray-400">
              Request and track documents from your phone or computer, 24/7.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

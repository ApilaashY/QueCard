"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MdMenu, MdClose } from "react-icons/md";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Hide navbar on /app routes
  if (pathname?.startsWith("/app")) {
    return null;
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 w-full">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-white tracking-tight">
              QueCard
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              <Link href="/login" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Log in
              </Link>
              <Link href="/signup" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg shadow-blue-500/20">
                Sign up
              </Link>
            </div>
          </div>
          
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none transition-colors"
            >
              {isOpen ? <MdClose className="h-6 w-6" /> : <MdMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-gray-900/95 backdrop-blur-md border-b border-white/10 absolute w-full">
          <div className="px-4 pt-2 pb-4 space-y-2 sm:px-3">
            <Link 
              href="/login" 
              onClick={() => setIsOpen(false)}
              className="text-gray-300 hover:text-white block px-3 py-3 rounded-md text-base font-medium transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/signup" 
              onClick={() => setIsOpen(false)}
              className="bg-blue-600 hover:bg-blue-500 text-white block px-3 py-3 rounded-md text-base font-semibold text-center transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

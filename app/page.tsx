import Link from "next/link";
import { MdUploadFile, MdFlashOn, MdScience } from "react-icons/md";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center pt-24 bg-linear-to-b from-black to-gray-900">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
      
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400">
        Master Your Studies with AI
      </h1>
      
      <p className="mt-4 text-xl md:text-2xl text-gray-400 max-w-3xl mb-12 leading-relaxed">
        Upload your documents and let QueCard generate smart, interactive flashcards in seconds.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
          href="/signup" 
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          Get Started for Free
        </Link>
        <Link 
          href="/login" 
          className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-lg transition-all backdrop-blur-sm cursor-pointer"
        >
          Log In
        </Link>
      </div>

      {/* Feature section */}
      <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full text-left">
        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm hover:transform hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6 text-2xl">
            <MdUploadFile />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">Upload Documents</h3>
          <p className="text-gray-400 leading-relaxed">Upload PDFs, text files, or paste YouTube links. Our AI reads and understands your content instantly.</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm hover:transform hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 text-2xl">
            <MdFlashOn />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">Instant Flashcards</h3>
          <p className="text-gray-400 leading-relaxed">QueCard automatically creates comprehensive flashcard sets based on your material{"'"}s key concepts.</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm hover:transform hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-6 text-2xl">
            <MdScience />
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">Learn Faster</h3>
          <p className="text-gray-400 leading-relaxed">Use our beautiful, distraction-free study interface to master your material efficiently.</p>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-copper">Via</span>
          <span className="text-xl font-bold">Connect</span>
          <span className="text-xs bg-teal/50 text-white px-2 py-0.5 rounded-full ml-2">
            GeneX360
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-copper hover:bg-copper/80 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            One Genome. One Formulation.{" "}
            <span className="text-copper">One Life at a Time.</span>
          </h1>
          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            Precision health powered by your unique genetic profile. Discover
            personalized supplement formulations with 10&ndash;27x
            bioavailability.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-copper hover:bg-copper/80 text-white px-8 py-3 rounded-xl font-medium transition-colors"
            >
              Start Your Journey
            </Link>
            <Link
              href="/login"
              className="border border-white/20 hover:border-white/40 text-white px-8 py-3 rounded-xl font-medium transition-colors"
            >
              Practitioner Portal
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} FarmCeutica Wellness LLC, Buffalo NY.
        All rights reserved.
      </footer>
    </div>
  );
}

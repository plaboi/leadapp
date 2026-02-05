import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="absolute top-0 z-20 flex w-full items-center justify-between px-6 py-4">
        <span className="text-xl font-semibold text-white">ALeadR</span>
        <div className="flex gap-3">
          <Button variant="ghost" className="bg-zinc-900 text-white hover:bg-zinc-400" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero Section - Dark with flowing blue gradient */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-slate-800 to-slate-900 px-6 py-32 pb-0 md:py-40 md:pb-0">
          {/* Flowing blue wave background */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-br from-blue-600/20 via-blue-500/30 to-cyan-400/20 blur-3xl"></div>
          <div className="absolute -bottom-32 left-0 right-0 h-96">
            <svg
              className="absolute bottom-0 w-full"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              style={{ height: "100%" }}
            >
              <path
                fill="rgba(59, 130, 246, 0.15)"
                d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              ></path>
              <path
                fill="rgba(96, 165, 250, 0.1)"
                d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,208C672,213,768,203,864,192C960,181,1056,171,1152,170.7C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              ></path>
            </svg>
          </div>
          
          <div className="relative z-10 mx-auto max-w-3xl text-center pb-32">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Autonomous AI Outreach That Feels Human
            </h1>
            <p className="mt-6 text-lg text-zinc-300 md:text-xl">
              Manage your pipeline, track every lead, and close more deals with
              one simple tool.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 px-12 py-8 text-lg" asChild>
                
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works Section - Light */}
        <section className="bg-gradient-to-b from-zinc-50 to-white px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-16 text-center text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
              How It Works
            </h2>
            
            {/* Timeline Steps */}
            <div className="relative">
              {/* Connector Line */}
              <div className="absolute left-6 top-8 hidden h-[calc(100%-4rem)] w-0.5 bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-300 md:left-1/2 md:block md:-translate-x-1/2"></div>
              
              <div className="space-y-16 md:space-y-24">
                {/* Step 1 */}
                <div className="relative flex flex-col md:flex-row md:items-center md:gap-16">
                  <div className="flex items-start gap-6 md:w-1/2 md:justify-end md:text-right">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white md:order-2">
                      1
                    </div>
                    <div className="md:order-1">
                      <h3 className="text-xl font-semibold text-zinc-900">Add Your Leads</h3>
                      <p className="mt-2 text-zinc-600">
                        Easily import your leads into the platform.
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block md:w-1/2"></div>
                </div>

                {/* Step 2 */}
                <div className="relative flex flex-col md:flex-row md:items-center md:gap-16">
                  <div className="hidden md:block md:w-1/2"></div>
                  <div className="flex items-start gap-6 md:w-1/2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-900">AI Drafts Outreach</h3>
                      <p className="mt-2 text-zinc-600">
                        AI writes personalized, human-like emails for you.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex flex-col md:flex-row md:items-center md:gap-16">
                  <div className="flex items-start gap-6 md:w-1/2 md:justify-end md:text-right">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white md:order-2">
                      3
                    </div>
                    <div className="md:order-1">
                      <h3 className="text-xl font-semibold text-zinc-900">Automate Follow-Ups</h3>
                      <p className="mt-2 text-zinc-600">
                        Schedule and manage follow-up emails automatically.
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block md:w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Old Way vs ALeadR Section */}
        <section className="bg-white px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-16 text-center text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
              The Old Way vs. ALeadR
            </h2>
            
            <div className="grid gap-12 md:grid-cols-2 md:gap-16">
              {/* Manual Sales Outreach */}
              <div className="space-y-6 md:pl-48"> {/* or md:pl-16 for more spacing */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                    <svg className="h-6 w-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900">Manual Sales Outreach</h3>
                </div>
                <ul className="space-y-3 pl-1">
                  <li className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-600">Repetitive manual work</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-600">Leads slipping through cracks</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-600">Generic, impersonal emails</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-600">Time-consuming follow-ups</span>
                  </li>
                </ul>
              </div>

              {/* AI-Powered Outreach */}
              <div className="space-y-6 md:pl-25">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900">AI-Powered Outreach</h3>
                </div>
                <ul className="space-y-3 pl-1">
                  <li className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-700">Automated outreach 24/7</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-700">Personalized, human-like emails</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-700">Organized lead pipeline</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-700">Consistent and timely follow-ups</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-16 text-center">
              <Button size="lg" className="bg-zinc-900 text-white hover:bg-zinc-800" asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
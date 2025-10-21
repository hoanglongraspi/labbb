import Link from 'next/link';

const features = [
  {
    title: 'Integrated Audiograms',
    description: 'View high-resolution audiograms, trend your progress, and share results securely with your care team.',
  },
  {
    title: 'Personalized Care Plans',
    description: 'Track therapy goals, follow appointment prep checklists, and receive reminders designed for you.',
  },
  {
    title: 'Evidence-Based Library',
    description: 'Access clinician-approved guides on tinnitus management, hearing protection, hearing aids, and more.',
  }
];

const workflow = [
  {
    step: '01',
    title: 'Create Your Account',
    detail: 'Register in minutes and tell us about your hearing journey so far.'
  },
  {
    step: '02',
    title: 'Upload or Capture Audiograms',
    detail: 'Bring historic records or use our upload tools to digitize new assessments instantly.'
  },
  {
    step: '03',
    title: 'Receive Guided Insights',
    detail: 'AI-assisted summaries translate clinical results into clear, actionable language.'
  },
  {
    step: '04',
    title: 'Stay Engaged',
    detail: 'Monitor goals, log symptoms, and receive tailored education between visits.'
  }
];

const testimonials = [
  {
    quote:
      'Having my audiograms and clinician guidance in one place has made it so much easier to understand my hearing changes.',
    name: 'Jordan P.',
    role: 'Patient, living with tinnitus'
  },
  {
    quote:
      'The portal keeps our clinic organized and lets patients arrive prepared. It has transformed how we deliver follow-up care.',
    name: 'Dr. Emilia Rhodes',
    role: 'Audiologist & Clinic Director'
  }
];

const stats = [
  { value: '15K+', label: 'Audiograms analyzed securely' },
  { value: '92%', label: 'Patients reporting improved clarity' },
  { value: '4.8★', label: 'Average satisfaction across clinics' }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-blue-600">
            Hearing Health Portal
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <Link href="/education" className="transition hover:text-blue-600">
              Education
            </Link>
            <Link href="/login" className="transition hover:text-blue-600">
              Patient Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-blue-900 sm:text-5xl lg:text-6xl">
                The modern patient portal for comprehensive hearing care
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Manage tinnitus symptoms, monitor hearing loss, and collaborate with audiologists in one secure hub.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Create Your Account
                </Link>
                <Link
                  href="/education"
                  className="rounded-lg border border-blue-300 px-6 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                >
                  Explore Resources
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-blue-100 bg-blue-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="text-center"
                >
                  <p className="text-4xl font-bold text-blue-600">{item.value}</p>
                  <p className="mt-2 text-sm text-gray-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-blue-900 sm:text-4xl">Everything your clinic needs in one hub</h2>
              <p className="mt-4 text-base text-gray-600">
                Built with audiologists, ENTs, and patients, the portal centralizes education, diagnostics, and
                follow-up care.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="space-y-3"
                >
                  <h3 className="text-lg font-semibold text-blue-700">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-blue-100 bg-blue-50">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <h2 className="text-3xl font-bold text-blue-900 sm:text-4xl">How the portal supports every visit</h2>
                <p className="mt-4 text-base text-gray-600">
                  From sign-up to long-term follow-up, the portal keeps your care collaborative, transparent, and easy
                  to navigate.
                </p>
              </div>
              <div className="space-y-6">
                {workflow.map((item) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-4"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                      {item.step}
                    </span>
                    <div>
                      <p className="font-semibold text-blue-900">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold text-blue-900 sm:text-4xl">Trusted by patients and clinics</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {testimonials.map((entry) => (
                <figure
                  key={entry.name}
                  className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-8"
                >
                  <blockquote className="text-base leading-relaxed text-gray-700">&ldquo;{entry.quote}&rdquo;</blockquote>
                  <figcaption className="text-sm font-semibold text-blue-900">
                    {entry.name}
                    <span className="ml-2 font-normal text-gray-600">• {entry.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-blue-100 bg-blue-50">
          <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-blue-900 sm:text-4xl">Ready to partner with your hearing team?</h2>
            <p className="mt-4 text-base text-gray-600">
              Create your secure portal account, invite your audiologist, and start making informed decisions about your
              hearing future.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Join the Portal
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-blue-300 px-6 py-3 text-sm font-semibold text-blue-600 transition hover:bg-white"
              >
                Clinic Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center text-xs text-gray-600 sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {new Date().getFullYear()} Hearing Health Portal. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/education" className="transition hover:text-blue-600">
              Education
            </Link>
            <Link href="/login" className="transition hover:text-blue-600">
              Patient Login
            </Link>
            <Link href="/register" className="transition hover:text-blue-600">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

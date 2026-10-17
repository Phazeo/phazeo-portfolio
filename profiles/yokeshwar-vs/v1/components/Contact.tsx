export function Contact() {
  return (
    <section
      id="contact"
      className="bg-(--color-background) py-16 md:py-24 relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-(--color-primary) rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-(--color-accent) rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-(--color-primary) rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              📬
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold bg-linear-to-r from-(--color-primary) to-(--color-accent) bg-clip-text text-transparent">
            Get in Touch
          </h2>
          <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
            I'm always open to discussing opportunities, collaborations, or just having a
            conversation about technology and innovation.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <a
            href="mailto:yokeshwarmecheri@gmail.com"
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-(--color-primary) flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
              ✉️
            </div>
            <h3 className="font-display font-semibold text-gray-900 mb-1">Email</h3>
            <p className="text-(--color-primary) text-sm break-all">yokeshwarmecheri@gmail.com</p>
          </a>

          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-(--color-secondary) flex items-center justify-center text-2xl shadow-lg">
              📞
            </div>
            <h3 className="font-display font-semibold text-gray-900 mb-1">Phone</h3>
            <p className="text-gray-500 text-sm">Available on request</p>
          </div>

          <a
            href="https://linkedin.com/in/yokeshwar-v-s-936188264"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-(--color-accent) flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
              💼
            </div>
            <h3 className="font-display font-semibold text-gray-900 mb-1">LinkedIn</h3>
            <p className="text-(--color-primary) text-sm">Connect with me</p>
          </a>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md text-gray-600">
            <svg
              className="w-5 h-5 text-(--color-primary)"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="font-medium">Salem, India</span>
          </div>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-gray-200">
        <p className="text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Yokeshwar. All rights reserved.
        </p>
      </footer>
    </section>
  );
}

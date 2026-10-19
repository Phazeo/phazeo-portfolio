import { EmailText } from "#kit";
export function Contact() {
  return (
    <section
      id="contact"
      className="bg-(--color-background) py-16 md:py-24 relative overflow-hidden"
    >
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
            Open to opportunities in AI, healthcare applications, and production support.
          </p>
        </div>

        <div className="grid sm:grid-cols-1 gap-6 max-w-md mx-auto">
          <a
            href="mailto:kayalvizhi.sm@tcs.com"
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-center group"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-(--color-secondary) flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
              ✉️
            </div>
            <h3 className="font-display font-semibold text-gray-900 mb-1">Email</h3>
            <p className="text-(--color-primary) text-sm">
              <EmailText email={"kayalvizhi.sm@tcs.com"} />
            </p>
          </a>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-gray-200">
        <p className="text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Kayalvizhi S M. All rights reserved.
        </p>
      </footer>
    </section>
  );
}

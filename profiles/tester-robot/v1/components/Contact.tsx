export function Contact() {
  return (
    <section id="contact" className="bg-white py-16">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">Contact</h2>
        <p className="text-gray-600">This is a test profile. No contact details.</p>
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Tester Robot. Test profile only.
          </p>
        </footer>
      </div>
    </section>
  );
}

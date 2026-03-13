export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-indigo-900 mb-6">
          Privacy Policy
        </h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-indigo-800 mb-3">
              What We Collect
            </h2>
            <p>
              To provide you with the best learning experience, we collect:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your email address (for account creation)</li>
              <li>Songs and vocabulary you save</li>
              <li>Usage data (to enforce fair use limits)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-indigo-800 mb-3">
              Why We Limit Usage
            </h2>
            <p>
              We limit song processing to <strong>3 songs per day per user</strong> to:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Keep the service free and sustainable for everyone</li>
              <li>Prevent abuse and ensure fair access</li>
              <li>Manage API costs (OpenAI, YouTube, lyrics services)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-indigo-800 mb-3">
              How We Protect Your Data
            </h2>
            <p>
              Your privacy matters to us:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your songs and vocabulary are private (only you can see them)</li>
              <li>We use industry-standard encryption</li>
              <li>We never sell your data to third parties</li>
              <li>You can delete your account and data at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-indigo-800 mb-3">
              Technical Details
            </h2>
            <p>
              Like all websites, we automatically collect certain technical information:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>IP addresses (for security and rate limiting)</li>
              <li>Browser type and device information</li>
              <li>Usage patterns (to improve the service)</li>
            </ul>
            <p className="mt-2">
              This is standard practice and required for basic website operation and security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-indigo-800 mb-3">
              Third-Party Services
            </h2>
            <p>
              We use the following services to provide our functionality:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>OpenAI:</strong> AI-powered vocabulary extraction</li>
              <li><strong>YouTube API:</strong> Fetch song information</li>
              <li><strong>Vercel:</strong> Web hosting</li>
            </ul>
            <p className="mt-2">
              Each service has its own privacy policy that we comply with.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-indigo-800 mb-3">
              Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Access your data</li>
              <li>Request data deletion</li>
              <li>Export your vocabulary</li>
              <li>Stop using the service at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-indigo-800 mb-3">
              Contact
            </h2>
            <p>
              This is an educational project. If you have questions about your privacy,
              feel free to reach out through GitHub or by creating an issue in the repository.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8 pt-4 border-t">
            Last updated: March 2026
          </p>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Back to App
          </a>
        </div>
      </div>
    </div>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-lg dark:prose-invert">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <p>
          This privacy policy describes how we collect, use, and protect your personal information.
        </p>
        {/* Add privacy policy content here */}
      </div>
    </div>
  );
}



export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-lg dark:prose-invert">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <p>
          Please read these terms of service carefully before using our service.
        </p>
        {/* Add terms content here */}
      </div>
    </div>
  );
}



type Params = Promise<{ slug: string }>;

export default async function TestsPage({ params }: { params: Params }) {
  const { slug } = await params;

  return (
    <div>
      <h1>Tests — {slug}</h1>
      <p>Smoke tests, integration tests, test history.</p>
    </div>
  );
}

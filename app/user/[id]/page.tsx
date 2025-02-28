export async function generateStaticParams() {
  // Return some dummy post IDs for the demo
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    // Add more as needed
  ];
}




export default function Page() {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Coming Soon</h1>
        <p>This page is under construction.</p>
      </div>
    );
  }
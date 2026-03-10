import { Sidebar } from "./Sidebar";

export function PageLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-56 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

import { Sidebar } from "@/components/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-[240px]">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}

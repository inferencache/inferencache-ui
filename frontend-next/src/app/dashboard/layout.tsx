export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell h-screen overflow-hidden flex flex-col">
      {children}
    </div>
  );
}

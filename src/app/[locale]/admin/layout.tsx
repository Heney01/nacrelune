
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/40 min-h-screen">
      {children}
    </div>
  );
}

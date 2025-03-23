// ./components/ui/admin-navbar.tsx
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Building, 
  PlusCircle, 
  Database 
} from 'lucide-react';

export function AdminNavbar() {
  return (
    <nav className="bg-[var(--secondary)] p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin" 
            className="flex items-center space-x-2 hover:text-[var(--primary)]"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          
          <Link 
            href="/admin/communities/create" 
            className="flex items-center space-x-2 hover:text-[var(--primary)]"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Create Community</span>
          </Link>
          
          <Link 
            href="/admin/communities/manage" 
            className="flex items-center space-x-2 hover:text-[var(--primary)]"
          >
            <Building className="h-5 w-5" />
            <span>Manage Roles</span>
          </Link>
          
          <Link 
            href="/admin/database" 
            className="flex items-center space-x-2 hover:text-[var(--primary)]"
          >
            <Database className="h-5 w-5" />
            <span>Database</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
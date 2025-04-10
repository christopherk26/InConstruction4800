// ./components/ui/admin-navbar.tsx
import Link from 'next/link';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Building, 
  PlusCircle, 
  Database 
} from 'lucide-react';
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AdminNavbar() {
  return (
    <nav className="bg-[var(--secondary)] p-4 border-b">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo and Site Name */}
        <Link href="/admin" className="flex items-center space-x-2">
          <Image 
            src="/mainlogo.png" 
            alt="Town Hall" 
            width={40} 
            height={40} 
            className="h-10 w-10"
          />
          <span className="text-xl font-bold text-[var(--foreground)]">
            Town Hall Admin
          </span>
        </Link>

        {/* Navigation Links */}
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

        {/* Theme Toggle */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
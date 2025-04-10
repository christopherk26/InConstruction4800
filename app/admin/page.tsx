// ./app/admin/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--foreground)]">Communities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--foreground)] mb-4">Manage community settings and roles</p>
            <div className="flex flex-col gap-2">
              <Link href="/admin/communities/manage">
                <Button className="w-full">
                  Manage Communities
                </Button>
              </Link>
              <Link href="/admin/communities/create">
                <Button variant="outline" className="w-full">
                  Create Community
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--foreground)]">Database</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--foreground)] mb-4">View and explore database contents</p>
            <Link href="/admin/database">
              <Button className="w-full">
                View Database
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--foreground)]">Role Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--foreground)] mb-4">Upload and manage community roles</p>
            <Link href="/admin/communities/manage">
              <Button className="w-full">
                Manage Roles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
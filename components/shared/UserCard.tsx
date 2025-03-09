// components/shared/UserCard.tsx
import { User as UserType } from "@/app/types/database";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { User } from "lucide-react";

interface UserCardProps {
  user: UserType;
  communityId: string;
  className?: string;
}


export function UserCard({ user, communityId, className = "" }: UserCardProps) {
  return (
    <Link 
      href={`/communities/${communityId}/users/${user.id}`}
      className="block"
    >
      <Card className={`h-full bg-[var(--card)] border-[var(--border)] hover:shadow-md transition-shadow cursor-pointer ${className}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            {/* User avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 bg-[var(--muted)]">
              {user.profilePhotoUrl ? (
                <img 
                  src={user.profilePhotoUrl} 
                  alt={`${user.firstName || ''} ${user.lastName || ''}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]">
                  <User className="h-10 w-10 text-[var(--primary-foreground)]" />
                </div>
              )}
            </div>
            
            {/* User name */}
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              {user.firstName || ''} {user.lastName || ''}
              {user.verification?.status === "verified" && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-blue-500 text-white rounded-full text-xs">✓</span>
              )}
            </h3>
            
            {/* User bio - truncated */}
            <p className="text-sm text-[var(--muted-foreground)] line-clamp-3">
              {user.bio || "No bio available"}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
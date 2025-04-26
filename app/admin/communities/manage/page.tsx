// ./app/admin/communities/manage/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  getCommunityUserRoles, 
  assignCommunityUserRole, 
  updateCommunityUserRole, 
  removeCommunityUserRole 
} from "@/app/services/communityRoleService";
import { getAllCommunities } from "@/app/services/communityService";
import { CommunityUserRole } from "@/app/types/database";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "../../../../components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { Footer } from "@/components/ui/footer";
import { getCurrentUser } from "@/app/services/authService";
import { UserModel } from "@/app/models/UserModel";

interface FormData {
  userId: string;
  title: string;
  fullName: string;
  permissions: {
    canPin: boolean;
    canArchive: boolean;
    canPostEmergency: boolean;
    canModerate: boolean;
  };
  badge: {
    emoji?: string;
    color?: string;
  };
}

export default function ManageCommunitiesPage() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [roles, setRoles] = useState<CommunityUserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CommunityUserRole | null>(null);
  const [user, setUser] = useState<UserModel | null>(null);
  const [formData, setFormData] = useState<FormData>({
    userId: "",
    title: "",
    fullName: "",
    permissions: {
      canPin: false,
      canArchive: false,
      canPostEmergency: false,
      canModerate: false
    },
    badge: {}
  });

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }
    
    fetchUser();
  }, []);

  // Fetch communities
  useEffect(() => {
    async function fetchCommunities() {
      try {
        const communitiesData = await getAllCommunities();
        setCommunities(communitiesData);
      } catch (error) {
        console.error("Error fetching communities:", error);
        toast.error("Failed to fetch communities");
      }
    }

    fetchCommunities();
  }, []);

  // Fetch roles when community is selected
  useEffect(() => {
    if (selectedCommunityId) {
      setLoading(true);
      getCommunityUserRoles(selectedCommunityId)
        .then(fetchedRoles => {
          setRoles(fetchedRoles);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching roles:", error);
          toast.error("Failed to fetch roles");
          setLoading(false);
        });
    } else {
      setRoles([]);
      setLoading(false);
    }
  }, [selectedCommunityId]);

  const handleCommunityChange = (communityId: string) => {
    setSelectedCommunityId(communityId);
  };

  const handleAddRole = async () => {
    if (!selectedCommunityId) {
      toast.error("Please select a community first");
      return;
    }

    try {
      await assignCommunityUserRole({
        communityId: selectedCommunityId,
        ...formData
      });
      toast.success("Role assigned successfully");
      setIsDialogOpen(false);
      // Refresh roles
      const updatedRoles = await getCommunityUserRoles(selectedCommunityId);
      setRoles(updatedRoles);
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error("Failed to assign role");
    }
  };

  const handleEditRole = async () => {
    if (!editingRole) return;

    try {
      await updateCommunityUserRole(editingRole.communityId, editingRole.userId, {
        title: formData.title,
        fullName: formData.fullName,
        permissions: formData.permissions,
        badge: formData.badge
      });
      toast.success("Role updated successfully");
      setIsDialogOpen(false);
      // Refresh roles
      const updatedRoles = await getCommunityUserRoles(selectedCommunityId);
      setRoles(updatedRoles);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleDeleteRole = async (role: CommunityUserRole) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      await removeCommunityUserRole(role.communityId, role.userId);
      toast.success("Role removed successfully");
      // Refresh roles
      const updatedRoles = await getCommunityUserRoles(selectedCommunityId);
      setRoles(updatedRoles);
    } catch (error) {
      console.error("Error removing role:", error);
      toast.error("Failed to remove role");
    }
  };

  const openEditDialog = (role: CommunityUserRole) => {
    setEditingRole(role);
    setFormData({
      userId: role.userId,
      title: role.title,
      fullName: role.fullName,
      permissions: role.permissions,
      badge: role.badge || {}
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingRole(null);
    setFormData({
      userId: "",
      title: "",
      fullName: "",
      permissions: {
        canPin: false,
        canArchive: false,
        canPostEmergency: false,
        canModerate: false
      },
      badge: {}
    });
    setIsDialogOpen(true);
  };

  const renderPermissions = (permissions: FormData['permissions']) => {
    const activePermissions = [];
    if (permissions.canPin) activePermissions.push("Can Pin Posts");
    if (permissions.canArchive) activePermissions.push("Can Archive Posts");
    if (permissions.canPostEmergency) activePermissions.push("Can Post Emergency Alerts");
    if (permissions.canModerate) activePermissions.push("Can Moderate Content");
    return activePermissions.join(", ");
  };

  const renderBadge = (badge: FormData['badge'] | undefined) => {
    if (!badge || (!badge.emoji && !badge.color)) return "-";
    return (
      <div className="flex items-center gap-2">
        {badge.emoji && <span>{badge.emoji}</span>}
        {badge.color && (
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: badge.color }}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-6">Manage Community Roles</h1>

      <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">Select Community</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCommunityId} onValueChange={handleCommunityChange}>
            <SelectTrigger className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
              <SelectValue placeholder="Select a community" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
              {communities.map(community => (
                <SelectItem key={community.id} value={community.id} className="text-[var(--foreground)]">
                  {community.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
            <p className="text-[var(--foreground)]">Loading roles...</p>
          </div>
        </div>
      ) : selectedCommunityId ? (
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[var(--foreground)]">Community Roles</CardTitle>
            <Button onClick={openAddDialog}>
              Add Role
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--secondary)]">
                    <th className="border border-[var(--border)] p-2 text-[var(--foreground)]">User ID</th>
                    <th className="border border-[var(--border)] p-2 text-[var(--foreground)]">Title</th>
                    <th className="border border-[var(--border)] p-2 text-[var(--foreground)]">Full Name</th>
                    <th className="border border-[var(--border)] p-2 text-[var(--foreground)]">Permissions</th>
                    <th className="border border-[var(--border)] p-2 text-[var(--foreground)]">Badge</th>
                    <th className="border border-[var(--border)] p-2 text-[var(--foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={`${role.communityId}_${role.userId}`} className="hover:bg-[var(--secondary)]">
                      <td className="border border-[var(--border)] p-2 text-[var(--foreground)]">{role.userId}</td>
                      <td className="border border-[var(--border)] p-2 text-[var(--foreground)]">{role.title}</td>
                      <td className="border border-[var(--border)] p-2 text-[var(--foreground)]">{role.fullName}</td>
                      <td className="border border-[var(--border)] p-2 text-[var(--foreground)]">{renderPermissions(role.permissions)}</td>
                      <td className="border border-[var(--border)] p-2 text-[var(--foreground)]">{renderBadge(role.badge)}</td>
                      <td className="border border-[var(--border)] p-2">
                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => openEditDialog(role)}
                            className="w-full"
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleDeleteRole(role)}
                            className="w-full"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardContent className="py-12">
            <p className="text-center text-[var(--muted-foreground)]">Please select a community to view and manage roles.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--foreground)]">
              {editingRole ? "Edit Role" : "Add Role"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="userId" className="text-[var(--foreground)]">User ID</Label>
              <Input
                id="userId"
                value={formData.userId}
                onChange={e => setFormData({ ...formData, userId: e.target.value })}
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
            <div>
              <Label htmlFor="title" className="text-[var(--foreground)]">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
            <div>
              <Label htmlFor="fullName" className="text-[var(--foreground)]">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canPin"
                  checked={formData.permissions.canPin}
                  onCheckedChange={(checked: boolean) => 
                    setFormData({ 
                      ...formData, 
                      permissions: { ...formData.permissions, canPin: checked }
                    })
                  }
                  className="border-[var(--border)]"
                />
                <Label htmlFor="canPin" className="text-[var(--foreground)]">Can Pin Posts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canArchive"
                  checked={formData.permissions.canArchive}
                  onCheckedChange={(checked: boolean) => 
                    setFormData({ 
                      ...formData, 
                      permissions: { ...formData.permissions, canArchive: checked }
                    })
                  }
                  className="border-[var(--border)]"
                />
                <Label htmlFor="canArchive" className="text-[var(--foreground)]">Can Archive Posts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canPostEmergency"
                  checked={formData.permissions.canPostEmergency}
                  onCheckedChange={(checked: boolean) => 
                    setFormData({ 
                      ...formData, 
                      permissions: { ...formData.permissions, canPostEmergency: checked }
                    })
                  }
                  className="border-[var(--border)]"
                />
                <Label htmlFor="canPostEmergency" className="text-[var(--foreground)]">Can Post Emergency Alerts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canModerate"
                  checked={formData.permissions.canModerate}
                  onCheckedChange={(checked: boolean) => 
                    setFormData({ 
                      ...formData, 
                      permissions: { ...formData.permissions, canModerate: checked }
                    })
                  }
                  className="border-[var(--border)]"
                />
                <Label htmlFor="canModerate" className="text-[var(--foreground)]">Can Moderate Content</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="emoji" className="text-[var(--foreground)]">Badge Emoji (optional)</Label>
              <Input
                id="emoji"
                value={formData.badge.emoji || ""}
                onChange={e => setFormData({ 
                  ...formData, 
                  badge: { ...formData.badge, emoji: e.target.value }
                })}
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                placeholder="e.g. 🛡️, 🚨, 👑"
              />
            </div>
            <div>
              <Label htmlFor="badgeColor" className="text-[var(--foreground)]">Badge Color (optional)</Label>
              <Input
                id="badgeColor"
                value={formData.badge.color || ""}
                onChange={e => setFormData({ 
                  ...formData, 
                  badge: { ...formData.badge, color: e.target.value }
                })}
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                placeholder="e.g. #4CAF50, #FF5722"
              />
            </div>
            <Button 
              onClick={editingRole ? handleEditRole : handleAddRole}
              className="w-full"
            >
              {editingRole ? "Update Role" : "Add Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ./app/admin/communities/manage/page.tsx
"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { processCommunityRolesFromCSV } from "@/app/services/communityRoleService";
import { getAllCommunities } from "@/app/services/communityService";

interface CSVRow {
    full_name: string;
    email: string;
    role_title: string;
    can_pin: string;
    can_archive: string;
    can_post_emergency: string;
    can_moderate: string;
    badge_emoji?: string;
    badge_color?: string;
}

export default function ManageCommunitiesPage() {
    const [communities, setCommunities] = useState<{ id: string, name: string }[]>([]);
    const [communityId, setCommunityId] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<CSVRow[]>([]);
    const [processingStatus, setProcessingStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Load communities on component mount
    React.useEffect(() => {
        async function fetchCommunities() {
            try {
                setLoading(true);
                const communityList = await getAllCommunities();
                setCommunities(communityList.map(community => ({
                    id: community.id || '',
                    name: community.name
                })));
            } catch (error) {
                console.error("Error fetching communities:", error);
                setProcessingStatus('Failed to load communities');
            } finally {
                setLoading(false);
            }
        }

        fetchCommunities();
    }, []);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCsvFile(file);

            Papa.parse<CSVRow>(file, {
                header: true,
                complete: (results) => {
                    setPreviewData(results.data);
                },
                error: (error) => {
                    console.error('CSV Parsing Error:', error);
                    setProcessingStatus('Error parsing CSV');
                }
            });
        }
    };

    const processRoleCSV = async () => {
        if (!csvFile || !communityId) {
            alert('Please select a CSV and specify a community');
            return;
        }

        try {
            setProcessingStatus('Processing...');

            const { officialRoles, userRoles } = await processCommunityRolesFromCSV(
                communityId,
                previewData
            );

            setProcessingStatus(
                `Processed ${officialRoles.length} official roles and ${userRoles.length} user roles`
            );
        } catch (error) {
            console.error("Error processing CSV:", error);
            setProcessingStatus('Error processing CSV');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Community Role Management</h1>

            <Card>
                <CardHeader>
                    <CardTitle>CSV Role Upload Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-[var(--secondary)] p-6 rounded-md">
                        <h2 className="text-xl font-semibold mb-4">How Community Role Management Works</h2>

                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium text-lg mb-2">Purpose</h3>
                                <p className="text-[var(--muted-foreground)]">
                                    This tool allows administrators to assign and manage roles for users within a specific community. By uploading a CSV file, you can quickly define user permissions and responsibilities.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-medium text-lg mb-2">What Happens When You Upload a CSV?</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>
                                        <strong>Complete Role Replacement:</strong> The upload completely replaces all existing roles for the selected community. This means any previous role assignments will be removed.
                                    </li>
                                    <li>
                                        <strong>User Matching:</strong> Roles are only assigned to users who already exist in the system and match the email in the CSV.
                                    </li>
                                    <li>
                                        <strong>Role Creation:</strong> For each valid user, two records are created:
                                        <ul className="list-circle pl-5">
                                            <li>An <strong>Official Role</strong> defining community-specific permissions</li>
                                            <li>A <strong>User Role</strong> linking the user to their specific role</li>
                                        </ul>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-medium text-lg mb-2">Permissions Explained</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold">can_pin</h4>
                                        <p className="text-sm">Allows user to pin important posts to the top of the community feed</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">can_archive</h4>
                                        <p className="text-sm">Permits archiving posts that are no longer relevant</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">can_post_emergency</h4>
                                        <p className="text-sm">Enables creating emergency alerts for the community</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">can_moderate</h4>
                                        <p className="text-sm">Allows removing or editing posts and comments</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium text-lg mb-2">CSV File Requirements</h3>
                                <div className="bg-[var(--muted)] p-4 rounded">
                                    <h4 className="font-semibold mb-2">Required Columns</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong>full_name</strong>: Complete name of the user</li>
                                        <li><strong>email</strong>: User's email address (must match existing user)</li>
                                        <li><strong>role_title</strong>: Descriptive title for the role</li>
                                        <li><strong>can_pin</strong>: true/false</li>
                                        <li><strong>can_archive</strong>: true/false</li>
                                        <li><strong>can_post_emergency</strong>: true/false</li>
                                        <li><strong>can_moderate</strong>: true/false</li>
                                        <li><strong>badge_emoji</strong>: Optional visual identifier</li>
                                        <li><strong>badge_color</strong>: Optional hex color code</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-medium text-lg mb-2">Example CSV</h3>
                                <pre className="bg-[var(--muted)] p-4 rounded overflow-x-auto">
                                    {`full_name,email,role_title,can_pin,can_archive,can_post_emergency,can_moderate,badge_emoji,badge_color
John Doe,john@example.com,Community Moderator,true,true,false,true,🛡️,#4CAF50
Jane Smith,jane@example.com,Emergency Coordinator,false,false,true,false,🚨,#FF5722`}
                                </pre>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Existing CSV upload component */}
            <Card>
                <CardHeader>
                    <CardTitle>Upload Community Roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Community Selector */}
                    <div>
                        <label htmlFor="community" className="block mb-2">Select Community</label>
                        <select
                            id="community"
                            value={communityId}
                            onChange={(e) => setCommunityId(e.target.value)}
                            className="w-full p-2 border rounded"
                            disabled={loading}
                        >
                            <option value="">Select a Community</option>
                            {communities.map(community => (
                                <option key={community.id} value={community.id}>
                                    {community.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={!communityId}
                    />

                    {previewData.length > 0 && (
                        <div>
                            <h2 className="text-xl mb-2">CSV Preview</h2>
                            <div className="max-h-64 overflow-auto">
                                <table className="w-full border">
                                    <thead>
                                        <tr>
                                            {Object.keys(previewData[0]).map((header) => (
                                                <th key={header} className="border p-2">{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 5).map((row, index) => (
                                            <tr key={index}>
                                                {Object.values(row).map((value, cellIndex) => (
                                                    <td key={cellIndex} className="border p-2">
                                                        {String(value)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {processingStatus && (
                        <div className="mt-4 p-2 bg-gray-100 rounded">
                            {processingStatus}
                        </div>
                    )}

                    <Button
                        onClick={processRoleCSV}
                        disabled={!csvFile || !communityId}
                    >
                        Process Roles
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
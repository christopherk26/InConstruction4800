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
          <CardTitle>CSV Upload Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[var(--muted)] p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-4">CSV Format Requirements</h2>
            
            <div className="space-y-2">
              <h3 className="font-medium">Required Columns:</h3>
              <ul className="list-disc pl-5">
                <li><strong>full_name</strong>: Full name of the user</li>
                <li><strong>email</strong>: User's email address</li>
                <li><strong>role_title</strong>: Title of the role</li>
                <li><strong>can_pin</strong>: Can pin posts (true/false)</li>
                <li><strong>can_archive</strong>: Can archive posts (true/false)</li>
                <li><strong>can_post_emergency</strong>: Can post emergency alerts (true/false)</li>
                <li><strong>can_moderate</strong>: Can moderate content (true/false)</li>
                <li><strong>badge_emoji</strong>: Optional emoji for role badge</li>
                <li><strong>badge_color</strong>: Optional color for role badge (hex code)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

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
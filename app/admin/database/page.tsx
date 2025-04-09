// ./app/admin/database/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Define a type for any Firestore document
type FirestoreData = Record<string, any>;

// Define a more flexible interface for our database viewer
interface DatabaseData {
  users: FirestoreData[];
  communities: FirestoreData[];
  community_memberships: FirestoreData[];
  community_user_roles: FirestoreData[];
  posts: FirestoreData[];
  comments: FirestoreData[];
  activity_logs: FirestoreData[];
  user_votes: FirestoreData[];
  notifications: FirestoreData[];
}

// Create a union type of the keys
type DatabaseCollectionName = keyof DatabaseData;

export default function DatabaseViewerPage() {
  const [data, setData] = useState<DatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DatabaseCollectionName>('users');

  // Fetch data directly from Firestore
  useEffect(() => {
    async function fetchData() {
      try {
        // Create an object to hold our results
        const result: DatabaseData = {
          users: [],
          communities: [],
          community_memberships: [],
          community_user_roles: [],
          posts: [],
          comments: [],
          activity_logs: [],
          user_votes: [],
          notifications: [],
        };

        // Fetch data from each collection
        const collections = Object.keys(result) as DatabaseCollectionName[];

        for (const collectionName of collections) {
          try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            result[collectionName] = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
          } catch (collectionError) {
            console.error(`Error fetching ${collectionName}:`, collectionError);
          }
        }

        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Render individual field values
  const renderFieldValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-[var(--muted-foreground)] italic">null</span>;
    }

    // Handle Firestore Timestamps
    if (value && typeof value === 'object' && 'seconds' in value) {
      const date = new Date(value.seconds * 1000);
      return <span>{date.toLocaleString()}</span>;
    }

    // Handle objects
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 0 
          ? value.map((item, index) => (
              <div key={index} className="pl-2 border-l border-[var(--border)]">
                {renderFieldValue(item)}
              </div>
            ))
          : <span className="text-[var(--muted-foreground)] italic">Empty Array</span>;
      }

      return (
        <div className="pl-2 border-l border-[var(--border)]">
          {Object.entries(value).map(([key, val]) => (
            <div key={key}>
              <strong>{key}:</strong> {renderFieldValue(val)}
            </div>
          ))}
        </div>
      );
    }

    return String(value);
  };

  // Render data table for the active tab
  const renderDataTable = () => {
    if (!data || !data[activeTab] || data[activeTab].length === 0) {
      return <p className="text-[var(--muted-foreground)] italic">No data found</p>;
    }

    const items = data[activeTab];
    const headers = Object.keys(items[0] || {});

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--secondary)]">
              {headers.map(header => (
                <th 
                  key={header} 
                  className="border border-[var(--border)] p-2 text-[var(--foreground)] text-left"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, rowIndex) => (
              <tr key={rowIndex} className="border-b border-[var(--border)] hover:bg-[var(--secondary)]">
                {headers.map(header => (
                  <td key={header} className="p-2 border border-[var(--border)] text-[var(--foreground)]">
                    {renderFieldValue(item[header])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-6">Database Viewer</h1>
      
      <div className="mb-6">
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {(Object.keys(data || {}) as DatabaseCollectionName[]).map(collection => (
            <Button 
              key={collection} 
              onClick={() => setActiveTab(collection)}
              variant={activeTab === collection ? "outline" : "outline"}
              className={`w-full h-auto py-2 whitespace-normal text-center transition-all ${
                activeTab === collection 
                  ? "bg-[var(--secondary)]" 
                  : "hover:bg-[var(--secondary)]"
              }`}
            >
              {collection.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      </div>
      
      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">{activeTab.replace(/_/g, ' ')} Collection</CardTitle>
        </CardHeader>
        <CardContent>
          {renderDataTable()}
        </CardContent>
      </Card>
    </div>
  );
}
// ./app/admin/database/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define a type for any Firestore document
type FirestoreData = Record<string, any>;

// Define a more flexible interface for our database viewer
interface DatabaseData {
  users: FirestoreData[];
  communities: FirestoreData[];
  official_roles: FirestoreData[];
  community_memberships: FirestoreData[];
  user_roles: FirestoreData[];
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
          official_roles: [],
          community_memberships: [],
          user_roles: [],
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
      return <span className="text-gray-400 italic">null</span>;
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
              <div key={index} className="pl-2 border-l">
                {renderFieldValue(item)}
              </div>
            ))
          : <span className="text-gray-400 italic">Empty Array</span>;
      }

      return (
        <div className="pl-2 border-l">
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
      return <p className="text-gray-500 italic">No data found</p>;
    }

    const items = data[activeTab];
    const headers = Object.keys(items[0] || {});

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {headers.map(header => (
                <th 
                  key={header} 
                  className="border p-2 bg-gray-100 text-left"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, rowIndex) => (
              <tr key={rowIndex} className="border-b">
                {headers.map(header => (
                  <td key={header} className="p-2">
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Database Viewer</h1>
      
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as DatabaseCollectionName)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-5 w-full mb-4">
          {(Object.keys(data || {}) as DatabaseCollectionName[]).map(collection => (
            <TabsTrigger key={collection} value={collection}>
              {collection.replace(/_/g, ' ')}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>{activeTab.replace(/_/g, ' ')} Collection</CardTitle>
          </CardHeader>
          <CardContent>
            {renderDataTable()}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
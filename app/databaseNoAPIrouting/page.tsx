"use client";

import { useState, useEffect } from "react";
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust path based on your project structure

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
  [key: string]: FirestoreData[];
}

type TabName = 'users' | 'communities' | 'official_roles' | 'community_memberships' | 
               'user_roles' | 'posts' | 'comments' | 'activity_logs' | 'user_votes' |
               'notifications';

export default function DatabaseViewer() {
  const [data, setData] = useState<DatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('users');

  // Initialize theme on mount
  useEffect(() => {
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem('theme');
    
    // If theme is explicitly set in localStorage, use that value
    // Otherwise, check system preference
    const isDark = 
      storedTheme === 'dark' || 
      (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Update state
    setDarkMode(isDark);
    
    // Set the 'dark' class on html element
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

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
            notifications: [], // Add this line
          };
        
        // Fetch data from each collection
        const collections = Object.keys(result);
        
        for (const collectionName of collections) {
          try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            result[collectionName] = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
          } catch (collectionError) {
            console.error(`Error fetching ${collectionName}:`, collectionError);
            // Continue with other collections even if one fails
          }
        }
        
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Initialize with empty data if fetch fails
        setData({
          users: [],
          communities: [],
          official_roles: [],
          community_memberships: [],
          user_roles: [],
          posts: [],
          comments: [],
          activity_logs: [],
          user_votes: [],
          notifications: []
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Toggle the 'dark' class on html element
    document.documentElement.classList.toggle('dark', newDarkMode);
    
    // Store preference in localStorage
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  // Function to render object fields nicely with consistent ordering
  const renderObjectField = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }
    
    // Handle Firestore Timestamps
    if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      const date = new Date(value.seconds * 1000);
      return <span className="text-green-600 dark:text-green-400">{date.toLocaleString()}</span>;
    }
    
    if (typeof value === 'object' && value instanceof Date) {
      return value.toLocaleString();
    }
    
    if (typeof value === 'boolean') {
      return value ? "Yes" : "No";
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Sort object keys to ensure consistent display
      const sortedKeys = Object.keys(value).sort();
      
      return (
        <div className="pl-2 border-l-2 border-gray-300 dark:border-gray-600">
          {sortedKeys.map((key) => (
            <div key={key} className="py-1">
              <span className="font-medium text-indigo-600 dark:text-indigo-400">{key}:</span>{" "}
              {renderObjectField(value[key])}
            </div>
          ))}
        </div>
      );
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="pl-2 border-l-2 border-gray-300 dark:border-gray-600">
          {value.length === 0 ? (
            <span className="text-gray-400 italic">Empty array</span>
          ) : (
            value.map((item, index) => (
              <div key={index} className="py-1">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">[{index}]:</span>{" "}
                {renderObjectField(item)}
              </div>
            ))
          )}
        </div>
      );
    }
    
    return String(value);
  };

  // Helper function to prioritize certain fields in display order
  const getSortedObjectEntries = (obj: Record<string, any>): [string, any][] => {
    // These fields should always appear first (if they exist)
    const priorityFields = ['id', 'name', 'title', 'firstName', 'lastName', 'email'];
    
    // Get all entries
    const entries = Object.entries(obj);
    
    // Sort entries: priority fields first in their defined order, then all others alphabetically
    return entries.sort(([keyA], [keyB]) => {
      const indexA = priorityFields.indexOf(keyA);
      const indexB = priorityFields.indexOf(keyB);
      
      // If both keys are priority fields
      if (indexA >= 0 && indexB >= 0) {
        return indexA - indexB;
      }
      
      // If only keyA is a priority field
      if (indexA >= 0) {
        return -1;
      }
      
      // If only keyB is a priority field
      if (indexB >= 0) {
        return 1;
      }
      
      // Neither is a priority field, sort alphabetically
      return keyA.localeCompare(keyB);
    });
  };

  // Render data table for the active tab
  const renderDataTable = () => {
    if (!data || !data[activeTab] || !Array.isArray(data[activeTab]) || data[activeTab].length === 0) {
      return <p className="text-gray-500 dark:text-gray-400 italic">No data found</p>;
    }

    const items = data[activeTab];
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {items.map((item, index) => {
          // Get entries with a consistent order
          const sortedEntries = getSortedObjectEntries(item);
          
          return (
            <div key={item.id || index} className="border-b border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                {item.id && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-1 mr-2">
                    ID: {item.id}
                  </span>
                )}
                {item.name || 
                 item.title || 
                 (item.firstName && `${item.firstName} ${item.lastName}`) || 
                 `Item ${index + 1}`}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedEntries
                  .filter(([key]) => key !== 'id') // Skip ID as we already show it
                  .map(([key, value]) => (
                    <div key={key} className="py-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{" "}
                      {renderObjectField(value)}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!data) return <div className="p-6 text-center text-red-500 dark:text-red-400">Error loading data</div>;

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      <div className="relative container mx-auto px-4 py-8 max-w-6xl">
        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-200 hover:bg-gray-300 dark:hover:bg-gray-600"
          aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
        >
          {!darkMode ? (
            <MoonIcon className="h-6 w-6 text-gray-800" />
          ) : (
            <SunIcon className="h-6 w-6 text-yellow-500" />
          )}
        </button>

        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Town Hall Database Viewer (Direct Client Access)</h1>
        
        {/* Tabs to switch between collections */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          {Object.keys(data).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabName)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeTab === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {key.replace(/_/g, ' ')}
              {Array.isArray(data[key as keyof DatabaseData]) && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {data[key as keyof DatabaseData]?.length || 0}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Active tab heading */}
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4 capitalize">
          {(activeTab as string).replace(/_/g, ' ')}
        </h2>
        
        {/* Data table for active tab */}
        {renderDataTable()}
      </div>
    </div>
  );
}
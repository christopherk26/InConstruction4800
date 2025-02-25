"use client";

import { useState, useEffect } from "react";
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8krcjPPhxF222gKTBUJhgeDuJ_6X5HiE",
  authDomain: "cs-4800-in-construction-63b73.firebaseapp.com",
  databaseURL: "https://cs-4800-in-construction-63b73-default-rtdb.firebaseio.com",
  projectId: "cs-4800-in-construction-63b73",
  storageBucket: "cs-4800-in-construction-63b73.firebasestorage.app",
  messagingSenderId: "430628626450",
  appId: "1:430628626450:web:a55ef8c6768ddb915e38cb",
  measurementId: "G-CRXZ621DDX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Define the shape of your database data
interface DatabaseData {
  users: any[] | null | undefined;
  communities: any[] | null | undefined;
  official_roles: any[] | null | undefined;
  community_memberships: any[] | null | undefined;
  user_roles: any[] | null | undefined;
  posts: any[] | null | undefined;
  comments: any[] | null | undefined;
  activity_logs: any[] | null | undefined;
  user_votes: any[] | null | undefined;
}

export default function DatabaseViewer() {
  const [data, setData] = useState<DatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof DatabaseData>('users');

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

// Inside your component
useEffect(() => {
    async function fetchData() {
      try {
        const collections = [
          'users', 
          'communities', 
          'official_roles', 
          'community_memberships', 
          'user_roles', 
          'posts', 
          'comments', 
          'activity_logs', 
          'user_votes'
        ] as const;
        
        const fetchedData: Partial<DatabaseData> = {
          users: [],
          communities: [],
          official_roles: [],
          community_memberships: [],
          user_roles: [],
          posts: [],
          comments: [],
          activity_logs: [],
          user_votes: [],
        };
        
        // Fetch each collection
        for (const collectionName of collections) {
          try {
            const snapshot = await getDocs(collection(db, collectionName));
            fetchedData[collectionName] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
          } catch (err) {
            console.error(`Error fetching ${collectionName}:`, err);
            // Collection already initialized to empty array above
          }
        }
        
        // Now we can safely cast it since all properties are defined
        setData(fetchedData as DatabaseData);
      } catch (error) {
        console.error("Error fetching data:", error);
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

  // Function to render object fields nicely
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
      return (
        <div className="pl-2 border-l-2 border-gray-300 dark:border-gray-600">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="py-1">
              <span className="font-medium text-indigo-600 dark:text-indigo-400">{key}:</span>{" "}
              {renderObjectField(val)}
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

  // Render data table for the active tab
  const renderDataTable = () => {
    if (!data || !data[activeTab] || !Array.isArray(data[activeTab]) || data[activeTab].length === 0) {
      return <p className="text-gray-500 dark:text-gray-400 italic">No data found</p>;
    }

    const items = data[activeTab];
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {items.map((item, index) => (
          <div key={item.id || index} className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              {item.id && (
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-1 mr-2">
                  ID: {item.id}
                </span>
              )}
              {item.name || item.title || (item.firstName && `${item.firstName} ${item.lastName}`) || `Item ${index + 1}`}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(item)
                .filter(([key]) => key !== 'id') // Skip ID as we already show it
                .map(([key, value]) => (
                  <div key={key} className="py-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{" "}
                    {renderObjectField(value)}
                  </div>
                ))}
            </div>
          </div>
        ))}
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

        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Town Hall Database Viewer</h1>
        
        {/* Tabs to switch between collections */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          {Object.keys(data).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as keyof DatabaseData)}
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
          {activeTab.replace(/_/g, ' ')}
        </h2>
        
        {/* Data table for active tab */}
        {renderDataTable()}
      </div>
    </div>
  );
}
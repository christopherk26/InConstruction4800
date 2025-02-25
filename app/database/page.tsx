"use client";

import { useState, useEffect } from "react";
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

// Define the shape of your database data
interface DatabaseData {
  users: any[] | null | undefined;
  posts: any[] | null | undefined;
  communities: any[] | null | undefined;
}

export default function DatabaseViewer() {
  const [data, setData] = useState<DatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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
    
    console.log("Initial theme set to:", isDark ? 'dark' : 'light');
  }, []);

  // Fetch data from API
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/database");
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const json = await res.json();
        console.log("Fetched data:", json);
        setData({
          users: Array.isArray(json.users) ? json.users : [],
          posts: Array.isArray(json.posts) ? json.posts : [],
          communities: Array.isArray(json.communities) ? json.communities : [],
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setData({ users: [], posts: [], communities: [] });
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
    
    console.log("Theme toggled to:", newDarkMode ? 'dark' : 'light');
  };

  if (loading) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!data) return <div className="p-6 text-center text-red-500 dark:text-red-400">Error loading data</div>;

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      <div className="relative container mx-auto px-4 py-8 max-w-5xl">
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

      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Firestore Database Viewer</h1>

      {/* Users Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Users</h2>
        {!Array.isArray(data.users) || data.users.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Email</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{user.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Posts Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Posts</h2>
        {!Array.isArray(data.posts) || data.posts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">No posts found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Content</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{post.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{post.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{post.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Communities Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Communities</h2>
        {!Array.isArray(data.communities) || data.communities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">No communities found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Name</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.communities.map((community) => (
                  <tr key={community.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{community.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{community.name || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
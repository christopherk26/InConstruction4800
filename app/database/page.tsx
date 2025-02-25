"use client";

import { useState, useEffect } from "react";

interface DatabaseData {
  users: any[] | string;
  posts: any[] | string;
  communities: any[] | string;
}

export default function DatabaseViewer() {
  const [data, setData] = useState<DatabaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/database");
        console.log("Response status:", res.status);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const json = await res.json();
        console.log("Fetched data:", json);
        setData(json);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">Error loading data</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Firestore Database Viewer</h1>

      {/* Users */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        {data.users === "not found" ? (
          <p>No users found</p>
        ) : Array.isArray(data.users) && data.users.length === 0 ? (
          <p>No users found</p>
        ) : (
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {(data.users as any[]).map((user) => (
                <tr key={user.id}>
                  <td className="border p-2">{user.id}</td>
                  <td className="border p-2">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="border p-2">{user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Posts */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Posts</h2>
        {data.posts === "not found" ? (
          <p>No posts found</p>
        ) : Array.isArray(data.posts) && data.posts.length === 0 ? (
          <p>No posts found</p>
        ) : (
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Title</th>
                <th className="border p-2">Content</th>
              </tr>
            </thead>
            <tbody>
              {(data.posts as any[]).map((post) => (
                <tr key={post.id}>
                  <td className="border p-2">{post.id}</td>
                  <td className="border p-2">{post.title}</td>
                  <td className="border p-2">{post.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Communities */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Communities</h2>
        {data.communities === "not found" ? (
          <p>No communities found</p>
        ) : Array.isArray(data.communities) && data.communities.length === 0 ? (
          <p>No communities found</p>
        ) : (
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Name</th>
              </tr>
            </thead>
            <tbody>
              {(data.communities as any[]).map((community) => (
                <tr key={community.id}>
                  <td className="border p-2">{community.id}</td>
                  <td className="border p-2">{community.name || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
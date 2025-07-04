import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { TextbookLibrary } from "./TextbookLibrary";
import { AddTextbookForm } from "./AddTextbookForm";
import { AdminPanel } from "./AdminPanel";
import { useState } from "react";

export default function App() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">The Pollak Project</h1>
            <p className="text-sm text-gray-600">Controlled Digital Lending</p>
          </div>
          <div className="flex items-center gap-4">
            <Authenticated>
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    {showAddForm ? "Hide Form" : "Add Textbook"}
                  </button>
                  <button
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    {showAdminPanel ? "Hide Admin" : "Admin Panel"}
                  </button>
                </div>
              )}
            </Authenticated>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6">
        <Unauthenticated>
          <div className="max-w-md mx-auto mt-20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to The Pollak Project</h2>
              <p className="text-gray-600">Sign in to access our digital textbook library</p>
            </div>
            <SignInForm />
          </div>
        </Unauthenticated>

        <Authenticated>
          <div className="space-y-6">
            {showAdminPanel && isAdmin && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">Admin Panel</h2>
                <AdminPanel />
              </div>
            )}
            {showAddForm && isAdmin && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">Add New Textbook</h2>
                <AddTextbookForm onSuccess={() => setShowAddForm(false)} />
              </div>
            )}
            <TextbookLibrary />
          </div>
        </Authenticated>
      </main>
      <Toaster />
    </div>
  );
}

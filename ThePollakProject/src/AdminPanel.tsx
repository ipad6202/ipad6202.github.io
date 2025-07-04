import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function AdminPanel() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const makeUserAdmin = useMutation(api.admin.makeUserAdmin);

  const handleMakeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsLoading(true);
    try {
      await makeUserAdmin({ email: email.trim() });
      toast.success(`Successfully made ${email} an admin`);
      setEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to make user admin");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Make User Admin</h3>
        <form onSubmit={handleMakeAdmin} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter user's email address"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Adding..." : "Make Admin"}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-2">
          Enter the email address of a registered user to grant them admin privileges.
        </p>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-2">Admin Instructions</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• Only existing admins can create new admins</p>
          <p>• If no admins exist, the first user to sign up can make themselves admin</p>
          <p>• Admins can add textbooks and manage the library</p>
          <p>• Users must be registered (signed up) before they can be made admin</p>
        </div>
      </div>
    </div>
  );
}

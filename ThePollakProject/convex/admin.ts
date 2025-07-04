import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to check if user is admin
async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  
  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  
  if (!userProfile?.isAdmin) {
    throw new Error("Admin privileges required");
  }
  
  return userId;
}

// Check if current user is admin
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }
    
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    
    return userProfile?.isAdmin === true;
  },
});

// Generate upload URL for textbook PDFs (admin only)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Make a user an admin (can only be called by existing admins or if no admins exist)
export const makeUserAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    // Check if any admins exist
    const existingAdmins = await ctx.db
      .query("userProfiles")
      .filter((q: any) => q.eq(q.field("isAdmin"), true))
      .collect();

    // If no admins exist, allow the first user to become admin
    // Otherwise, require admin privileges
    if (existingAdmins.length > 0) {
      await requireAdmin(ctx);
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, { isAdmin: true });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        isAdmin: true,
      });
    }
    return { success: true };
  },
});

// Add a new textbook (admin only)
export const addTextbook = mutation({
  args: {
    title: v.string(),
    author: v.string(),
    isbn: v.optional(v.string()),
    description: v.optional(v.string()),
    pdfStorageId: v.id("_storage"),
    pdfPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const textbookId = await ctx.db.insert("textbooks", {
      title: args.title,
      author: args.author,
      isbn: args.isbn,
      description: args.description,
      pdfStorageId: args.pdfStorageId,
      pdfPassword: args.pdfPassword,
      isCheckedOut: false,
    });

    return textbookId;
  },
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  textbooks: defineTable({
    title: v.string(),
    author: v.string(),
    isbn: v.optional(v.string()),
    description: v.optional(v.string()),
    pdfStorageId: v.id("_storage"),
    pdfPassword: v.string(),
    isCheckedOut: v.boolean(),
    checkedOutBy: v.optional(v.id("users")),
    checkedOutAt: v.optional(v.number()),
    dueDate: v.optional(v.number()),
  })
    .index("by_checked_out", ["isCheckedOut"])
    .index("by_user", ["checkedOutBy"]),
  
  checkoutHistory: defineTable({
    textbookId: v.id("textbooks"),
    userId: v.id("users"),
    checkedOutAt: v.number(),
    returnedAt: v.optional(v.number()),
    autoReturned: v.boolean(),
  })
    .index("by_textbook", ["textbookId"])
    .index("by_user", ["userId"]),

  // User profiles to extend auth users with additional fields
  userProfiles: defineTable({
    userId: v.id("users"),
    isAdmin: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

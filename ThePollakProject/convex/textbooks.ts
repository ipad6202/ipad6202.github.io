import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all textbooks with checkout status
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const textbooks = await ctx.db.query("textbooks").collect();
    
    return Promise.all(
      textbooks.map(async (textbook) => {
        let checkedOutByUser = null;
        if (textbook.checkedOutBy) {
          const user = await ctx.db.get(textbook.checkedOutBy);
          checkedOutByUser = user?.email || "Unknown user";
        }
        
        return {
          ...textbook,
          checkedOutByUser,
          isCheckedOutByCurrentUser: textbook.checkedOutBy === userId,
        };
      })
    );
  },
});

// Get current user's checked out textbook
export const getCurrentCheckout = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const textbook = await ctx.db
      .query("textbooks")
      .withIndex("by_user", (q) => q.eq("checkedOutBy", userId))
      .first();

    return textbook;
  },
});

// Checkout a textbook
export const checkout = mutation({
  args: { textbookId: v.id("textbooks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user already has a book checked out
    const existingCheckout = await ctx.db
      .query("textbooks")
      .withIndex("by_user", (q) => q.eq("checkedOutBy", userId))
      .first();

    if (existingCheckout) {
      throw new Error("You can only checkout one textbook at a time");
    }

    const textbook = await ctx.db.get(args.textbookId);
    if (!textbook) {
      throw new Error("Textbook not found");
    }

    if (textbook.isCheckedOut) {
      throw new Error("This textbook is already checked out");
    }

    const now = Date.now();
    const dueDate = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Update textbook
    await ctx.db.patch(args.textbookId, {
      isCheckedOut: true,
      checkedOutBy: userId,
      checkedOutAt: now,
      dueDate,
    });

    // Add to checkout history
    await ctx.db.insert("checkoutHistory", {
      textbookId: args.textbookId,
      userId,
      checkedOutAt: now,
      autoReturned: false,
    });

    return { success: true, dueDate };
  },
});

// Return a textbook
export const returnBook = mutation({
  args: { textbookId: v.id("textbooks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const textbook = await ctx.db.get(args.textbookId);
    if (!textbook) {
      throw new Error("Textbook not found");
    }

    if (!textbook.isCheckedOut || textbook.checkedOutBy !== userId) {
      throw new Error("You don't have this textbook checked out");
    }

    // Update textbook
    await ctx.db.patch(args.textbookId, {
      isCheckedOut: false,
      checkedOutBy: undefined,
      checkedOutAt: undefined,
      dueDate: undefined,
    });

    // Update checkout history
    const checkoutRecord = await ctx.db
      .query("checkoutHistory")
      .withIndex("by_textbook", (q) => q.eq("textbookId", args.textbookId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("returnedAt"), undefined))
      .first();

    if (checkoutRecord) {
      await ctx.db.patch(checkoutRecord._id, {
        returnedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get PDF access for checked out book
export const getPdfAccess = query({
  args: { textbookId: v.id("textbooks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const textbook = await ctx.db.get(args.textbookId);
    if (!textbook) {
      throw new Error("Textbook not found");
    }

    if (!textbook.isCheckedOut || textbook.checkedOutBy !== userId) {
      throw new Error("You must checkout this textbook to access the PDF");
    }

    const pdfUrl = await ctx.storage.getUrl(textbook.pdfStorageId);
		console.log(pdfUrl);
    
    return {
      pdfUrl,
      password: textbook.pdfPassword,
      dueDate: textbook.dueDate,
    };
  },
});

// Internal function to auto-return overdue books
export const autoReturnOverdueBooks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const overdueBooks = await ctx.db
      .query("textbooks")
      .withIndex("by_checked_out", (q) => q.eq("isCheckedOut", true))
      .filter((q) => q.lt(q.field("dueDate"), now))
      .collect();

    for (const book of overdueBooks) {
      // Return the book
      await ctx.db.patch(book._id, {
        isCheckedOut: false,
        checkedOutBy: undefined,
        checkedOutAt: undefined,
        dueDate: undefined,
      });

      // Update checkout history
      const checkoutRecord = await ctx.db
        .query("checkoutHistory")
        .withIndex("by_textbook", (q) => q.eq("textbookId", book._id))
        .filter((q) => q.eq(q.field("returnedAt"), undefined))
        .first();

      if (checkoutRecord) {
        await ctx.db.patch(checkoutRecord._id, {
          returnedAt: now,
          autoReturned: true,
        });
      }
    }

    return { returnedCount: overdueBooks.length };
  },
});

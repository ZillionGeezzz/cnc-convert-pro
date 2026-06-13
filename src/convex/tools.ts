import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Get all user-created tools for the current user.
 */
export const getUserTools = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const tools = await ctx.db
      .query("userTools")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return tools.map((t) => ({
      ...t,
      defaultParams: t.defaultParams ? JSON.parse(t.defaultParams) : undefined,
    }));
  },
});

/**
 * Create a new custom tool for the current user.
 */
export const createUserTool = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    number: v.number(),
    diameter: v.number(),
    flutes: v.optional(v.number()),
    length: v.optional(v.number()),
    lengthOfCut: v.optional(v.number()),
    shankDiameter: v.optional(v.number()),
    material: v.string(),
    coating: v.optional(v.string()),
    maxRPM: v.optional(v.number()),
    defaultParams: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const id = await ctx.db.insert("userTools", {
      userId: user._id,
      name: args.name,
      type: args.type,
      number: args.number,
      diameter: args.diameter,
      flutes: args.flutes,
      length: args.length,
      lengthOfCut: args.lengthOfCut,
      shankDiameter: args.shankDiameter,
      material: args.material,
      coating: args.coating,
      maxRPM: args.maxRPM,
      defaultParams: args.defaultParams,
      notes: args.notes,
    });

    return id;
  },
});

/**
 * Update an existing user tool.
 */
export const updateUserTool = mutation({
  args: {
    toolId: v.id("userTools"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    number: v.optional(v.number()),
    diameter: v.optional(v.number()),
    flutes: v.optional(v.number()),
    length: v.optional(v.number()),
    lengthOfCut: v.optional(v.number()),
    shankDiameter: v.optional(v.number()),
    material: v.optional(v.string()),
    coating: v.optional(v.string()),
    maxRPM: v.optional(v.number()),
    defaultParams: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    if (tool.userId !== user._id) throw new Error("Not authorized");

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.number !== undefined) updates.number = args.number;
    if (args.diameter !== undefined) updates.diameter = args.diameter;
    if (args.flutes !== undefined) updates.flutes = args.flutes;
    if (args.length !== undefined) updates.length = args.length;
    if (args.lengthOfCut !== undefined) updates.lengthOfCut = args.lengthOfCut;
    if (args.shankDiameter !== undefined) updates.shankDiameter = args.shankDiameter;
    if (args.material !== undefined) updates.material = args.material;
    if (args.coating !== undefined) updates.coating = args.coating;
    if (args.maxRPM !== undefined) updates.maxRPM = args.maxRPM;
    if (args.defaultParams !== undefined) updates.defaultParams = args.defaultParams;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.toolId, updates);
  },
});

/**
 * Delete a user tool.
 */
export const deleteUserTool = mutation({
  args: {
    toolId: v.id("userTools"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    if (tool.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.toolId);
  },
});

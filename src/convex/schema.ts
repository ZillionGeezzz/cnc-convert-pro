import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables,

    // the users table
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    // User's custom tools
    userTools: defineTable({
      userId: v.id("users"),
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
    })
      .index("by_user", ["userId"])
      .index("by_user_number", ["userId", "number"]),

    // User's saved programs
    savedPrograms: defineTable({
      userId: v.id("users"),
      name: v.string(),
      sourceFormat: v.string(),
      targetFormat: v.string(),
      inputCode: v.string(),
      outputCode: v.optional(v.string()),
      toolId: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_updated", ["userId", "updatedAt"]),

    // User's custom inserts
    userInserts: defineTable({
      userId: v.id("users"),
      isoCode: v.string(),
      shape: v.string(),
      clearance: v.string(),
      size: v.number(),
      thickness: v.number(),
      noseRadius: v.number(),
      material: v.string(),
      notes: v.optional(v.string()),
      brand: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // User's cutting data preferences
    userCuttingData: defineTable({
      userId: v.id("users"),
      material: v.string(),
      toolType: v.string(),
      operationType: v.string(),
      sfmMin: v.number(),
      sfmMax: v.number(),
      chipLoadMin: v.number(),
      chipLoadMax: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_material", ["userId", "material"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;

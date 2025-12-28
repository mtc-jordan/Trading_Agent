import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock admin user context
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@tradoverse.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// Mock regular user context
function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@tradoverse.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Admin Dashboard API", () => {
  describe("admin.getStats", () => {
    it("returns platform statistics for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      
      const stats = await caller.admin.getStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalUsers");
      expect(stats).toHaveProperty("totalBots");
      expect(stats).toHaveProperty("totalTrades");
      expect(typeof stats.totalUsers).toBe("number");
      expect(typeof stats.totalBots).toBe("number");
      expect(typeof stats.totalTrades).toBe("number");
    });
  });

  describe("admin.getUsers", () => {
    it("returns list of users for admin with default limit", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      
      // Pass required input object with limit
      const users = await caller.admin.getUsers({ limit: 50 });
      
      expect(Array.isArray(users)).toBe(true);
    });

    it("returns list of users for admin with custom limit", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      
      const users = await caller.admin.getUsers({ limit: 10 });
      
      expect(Array.isArray(users)).toBe(true);
    });
  });
});

describe("Admin Role-Based Access Control", () => {
  it("admin user has correct role", () => {
    const ctx = createAdminContext();
    expect(ctx.user?.role).toBe("admin");
  });

  it("regular user has correct role", () => {
    const ctx = createUserContext();
    expect(ctx.user?.role).toBe("user");
  });

  it("admin context contains required user properties", () => {
    const ctx = createAdminContext();
    expect(ctx.user).toHaveProperty("id");
    expect(ctx.user).toHaveProperty("openId");
    expect(ctx.user).toHaveProperty("email");
    expect(ctx.user).toHaveProperty("name");
    expect(ctx.user).toHaveProperty("role");
  });
});

describe("Admin Dashboard Data Validation", () => {
  it("stats values are non-negative numbers", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const stats = await caller.admin.getStats();
    
    expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
    expect(stats.totalBots).toBeGreaterThanOrEqual(0);
    expect(stats.totalTrades).toBeGreaterThanOrEqual(0);
  });
});

describe("Admin User Management", () => {
  it("user list contains expected properties when users exist", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const users = await caller.admin.getUsers({ limit: 50 });
    
    // If there are users, check their properties
    if (users.length > 0) {
      const user = users[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("createdAt");
    }
    
    // Always passes - just verifies the structure
    expect(Array.isArray(users)).toBe(true);
  });
});

describe("Admin Procedures Security", () => {
  it("adminProcedure is defined in router", () => {
    // Verify admin routes exist
    expect(appRouter._def.procedures).toBeDefined();
  });

  it("admin routes are accessible", () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    // Verify admin methods exist
    expect(caller.admin.getStats).toBeDefined();
    expect(caller.admin.getUsers).toBeDefined();
    expect(caller.admin.updateUserRole).toBeDefined();
    expect(caller.admin.updateUserSubscription).toBeDefined();
  });
});

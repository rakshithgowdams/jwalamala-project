import { describe, expect, it } from "vitest";
import { allSections, grantableKeys, permissionsFor, sectionForPath } from "@/lib/admin/sections";
import { resolvePostLoginPath } from "@/lib/auth/paths";

describe("staff sidebar access", () => {
  it("maps admin URLs to the sidebar feature that guards them", () => {
    expect(sectionForPath("/admin")).toBe("");
    expect(sectionForPath("/admin/posts")).toBe("posts");
    expect(sectionForPath("/admin/posts/new")).toBe("posts");
    expect(sectionForPath("/admin/posts/bin")).toBe("posts");
    expect(sectionForPath("/admin/analytics/live")).toBe("analytics");
    expect(sectionForPath("/admin/v4/tags")).toBe("tags");
    expect(sectionForPath("/admin/v4/trending_items")).toBe("trending");
    expect(sectionForPath("/admin/v4/business_ads")).toBe("business-ads");
    expect(sectionForPath("/admin/live-blogs/abc")).toBe("live-blogs");
    expect(sectionForPath("/admin/staff")).toBe("staff");
    expect(sectionForPath("/admin/access-requests")).toBe("access-requests");
    expect(sectionForPath("/admin/tasks")).toBe("tasks");
    expect(sectionForPath("/admin/chat")).toBe("chat");
    expect(sectionForPath("/staff/chat")).toBe("chat");
  });

  it("treats unknown admin pages as no feature, so staff are kept out", () => {
    expect(sectionForPath("/admin/secret-tool")).toBeNull();
    expect(sectionForPath("/admin/v4/unknown_table")).toBeNull();
  });

  it("never lets staff be given administrator-only features", () => {
    for (const key of ["staff", "access-requests", "users", "roles", "redirects", "settings"]) {
      expect(grantableKeys).not.toContain(key);
    }
    expect(permissionsFor(["staff", "users", "roles"])).toEqual(["admin.access"]);
  });

  it("grants only what the chosen features need", () => {
    expect(permissionsFor([])).toEqual(["admin.access"]);
    expect(permissionsFor(["posts"])).toEqual([
      "admin.access",
      "content.create",
      "content.edit",
      "content.publish",
      "content.read",
    ]);
    expect(permissionsFor(["ads", "comments"])).toEqual(["admin.access", "ads.manage", "community.manage"]);
    expect(permissionsFor(["tasks"])).toEqual(["admin.access", "content.edit", "content.read"]);
  });

  it("gives every feature a view permission that its grants include", () => {
    for (const section of allSections) {
      if (!section.key || section.adminOnly) continue;
      expect(section.grants, section.key).toContain(section.view);
    }
  });

  it("sends staff onto /staff and away from admin-only URLs after login", () => {
    expect(
      resolvePostLoginPath("/admin/staff", { role: "staff", admin_sections: ["tasks", "posts"] }),
    ).toBe("/staff/tasks");
    expect(
      resolvePostLoginPath("/admin/posts", { role: "staff", admin_sections: ["posts"] }),
    ).toBe("/staff/posts");
    expect(
      resolvePostLoginPath("/staff/tasks", { role: "staff", admin_sections: ["tasks", "posts"] }),
    ).toBe("/staff/tasks");
    expect(resolvePostLoginPath("/admin/staff", { role: "admin", admin_sections: null })).toBe("/admin/staff");
  });
});

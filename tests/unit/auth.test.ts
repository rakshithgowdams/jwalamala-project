import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { authCallbackUrl, submitEmailAuth } from "@/lib/auth/email";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getServerClient: mocks.getServerClient,
}));
import { GET } from "@/app/auth/callback/route";

describe("email authentication", () => {
  const input = {
    mode: "login" as const,
    email: " reader@gmail.com ",
    password: "  keep spaces  ",
    origin: "https://news.example",
    next: "/news/story",
  };
  function client() {
    const methods = {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    };
    return { methods, auth: methods as unknown as SupabaseClient["auth"] };
  }
  it("uses the email address and exact app password for sign-in", async () => {
    const { auth, methods } = client();
    expect(await submitEmailAuth(auth, input)).toBe("signed-in");
    expect(methods.signInWithPassword).toHaveBeenCalledWith({
      email: "reader@gmail.com",
      password: input.password,
    });
    expect(methods.signUp).not.toHaveBeenCalled();
  });
  it("waits for confirmation rather than claiming a new user is signed in", async () => {
    const { auth, methods } = client();
    expect(await submitEmailAuth(auth, { ...input, mode: "signup" })).toBe(
      "confirmation-sent",
    );
    expect(methods.signUp).toHaveBeenCalledWith({
      email: "reader@gmail.com",
      password: input.password,
      options: {
        emailRedirectTo:
          "https://news.example/auth/callback?next=%2Fnews%2Fstory",
      },
    });
  });
  it("accepts an immediate signup session when email confirmation is disabled", async () => {
    const { auth, methods } = client();
    methods.signUp.mockResolvedValue({
      data: { session: { access_token: "test-only" } },
      error: null,
    });
    expect(await submitEmailAuth(auth, { ...input, mode: "signup" })).toBe(
      "signed-in",
    );
  });
  it("routes recovery to the protected password page without sending a password", async () => {
    const { auth, methods } = client();
    expect(await submitEmailAuth(auth, { ...input, mode: "reset" })).toBe(
      "reset-sent",
    );
    expect(methods.resetPasswordForEmail).toHaveBeenCalledWith(
      "reader@gmail.com",
      {
        redirectTo:
          "https://news.example/auth/callback?next=%2Faccount%2Fpassword",
      },
    );
    expect(methods.signInWithPassword).not.toHaveBeenCalled();
  });
  it.each(["login", "signup", "reset"] as const)(
    "does not report success for a failed %s request",
    async (mode) => {
      const { auth, methods } = client();
      const error = new Error("provider failure");
      methods.signInWithPassword.mockResolvedValue({ error });
      methods.signUp.mockResolvedValue({ data: { session: null }, error });
      methods.resetPasswordForEmail.mockResolvedValue({ error });
      await expect(submitEmailAuth(auth, { ...input, mode })).rejects.toThrow(
        error,
      );
    },
  );
  it("keeps Google and email callback return URLs on this site", () => {
    for (const next of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/\nevil.test",
    ]) {
      expect(
        new URL(authCallbackUrl(input.origin, next)).searchParams.get("next"),
      ).toBe("/account");
    }
  });
});

describe("authentication callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
    mocks.getServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: mocks.exchangeCodeForSession,
        verifyOtp: mocks.verifyOtp,
      },
    });
  });
  const request = (query: string) =>
    new NextRequest("https://news.example/auth/callback?" + query);
  it("exchanges a PKCE code and returns to the saved article", async () => {
    const response = await GET(request("code=test-code&next=%2Fnews%2Fstory"));
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(response.headers.get("location")).toBe(
      "https://news.example/news/story",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("rejects an external return destination", async () => {
    const response = await GET(
      request("code=test-code&next=https%3A%2F%2Fevil.test"),
    );
    expect(response.headers.get("location")).toBe(
      "https://news.example/account",
    );
  });
  it("preserves the return page and gives a safe error when Google is cancelled", async () => {
    const response = await GET(
      request(
        "error=access_denied&error_description=private&next=%2Fnews%2Fstory",
      ),
    );
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("next")).toBe("/news/story");
    expect(destination.searchParams.get("error")).toBe("auth");
    expect(destination.href).not.toContain("private");
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("shows an error for expired codes and network exceptions", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "expired" },
    });
    expect(
      (await GET(request("code=expired"))).headers.get("location"),
    ).toContain("error=auth");
    mocks.exchangeCodeForSession.mockRejectedValueOnce(new Error("network"));
    expect(
      (await GET(request("code=unavailable"))).headers.get("location"),
    ).toContain("error=auth");
  });
  it("verifies recovery email links and forces the password update destination", async () => {
    const response = await GET(
      request("token_hash=test-hash&type=recovery&next=%2Fnews%2Fstory"),
    );
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "test-hash",
      type: "recovery",
    });
    expect(response.headers.get("location")).toBe(
      "https://news.example/account/password",
    );
  });
  it("accepts signup confirmation links", async () => {
    const response = await GET(
      request("token_hash=test-hash&type=signup&next=%2Fnews%2Fstory"),
    );
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "test-hash",
      type: "signup",
    });
    expect(response.headers.get("location")).toBe(
      "https://news.example/news/story",
    );
  });
  it("rejects missing or unsupported tokens and missing configuration", async () => {
    for (const query of ["", "token_hash=test&type=email_change"]) {
      expect((await GET(request(query))).headers.get("location")).toContain(
        "error=auth",
      );
    }
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    mocks.getServerClient.mockResolvedValue(null);
    expect((await GET(request("code=test"))).headers.get("location")).toContain(
      "error=auth",
    );
  });
});

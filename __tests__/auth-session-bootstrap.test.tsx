import { render, waitFor } from "@testing-library/react";

import { AuthSessionBootstrap } from "@/components/features/auth-session-bootstrap";
import { getCurrentUser, refreshSession } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";

jest.mock("@/lib/api/auth", () => ({
  getCurrentUser: jest.fn(),
  refreshSession: jest.fn(),
}));

test("restores identity and a fresh access token from the refresh cookie", async () => {
  useAuthStore.getState().clearSession();
  jest.mocked(refreshSession).mockResolvedValue({
    access_token: "restored-access",
    refresh_token: "server-only-refresh",
    token_type: "bearer",
    expires_in: 3600,
  });
  jest.mocked(getCurrentUser).mockResolvedValue({
    id: "user-1",
    email: "applicant@example.com",
    full_name_en: "Test Applicant",
    full_name_fr: null,
    roles: ["applicant"],
    is_active: true,
  });

  render(<AuthSessionBootstrap locale="en" />);

  await waitFor(() => {
    expect(useAuthStore.getState().accessToken).toBe("restored-access");
  });
  expect(useAuthStore.getState().user?.roles).toEqual(["applicant"]);
  expect(getCurrentUser).toHaveBeenCalledWith("restored-access", "en");
  expect(window.localStorage.getItem("thibbs-auth")).not.toContain("restored-access");
  expect(window.localStorage.getItem("thibbs-auth")).not.toContain("server-only-refresh");
});

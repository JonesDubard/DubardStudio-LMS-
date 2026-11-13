import { readAccessTokenClaims } from "./claims";

const HOME_BY_ROLE: { role: string; path: string }[] = [
  { role: "platform_admin", path: "/platform/dashboard" },
  { role: "school_admin", path: "/admin/dashboard" },
  { role: "teacher", path: "/teacher/home" },
  { role: "student", path: "/feed" },
  { role: "parent", path: "/parent/home" },
];

/** Picks a home screen from the session roles. Platform outranks a school role. */
export function homePathForRoles(roles: readonly string[]): string {
  for (const entry of HOME_BY_ROLE) {
    if (roles.includes(entry.role)) return entry.path;
  }
  return "/feed";
}

export function homePathFromAccessToken(accessToken: string | undefined): string {
  if (!accessToken) return "/feed";
  return homePathForRoles(readAccessTokenClaims(accessToken).app_roles);
}

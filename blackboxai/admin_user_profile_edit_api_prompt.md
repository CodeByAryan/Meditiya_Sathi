# Prompt: Admin/User profile edit API

We need to add admin ability to edit user profile fields:
- name
- email (optional; but admin should be able to set it if allowed)
- phone
- flatNumber
- bldg_name
- wing

Create endpoint:
- PATCH /api/admin/users/:clerkUserId/profile (admin only)

Body schema (all fields optional):
{
  name?: string,
  phone?: string | null,
  flatNumber?: string | null,
  bldg_name?: string | null,
  wing?: string | null,
}

Implementation notes:
- Protect with requireAdmin()
- Identify user by usersTable.clerkUserId
- Use drizzle ORM update(usersTable).set(body).where(eq(usersTable.clerkUserId, clerkUserId)).returning()
- Return updated user

Also extend existing self update:
- PATCH /api/users/me
Body: same fields (except clerkUserId)

Finally update:
- GET /api/users to include bldg_name and wing


import type { H3Event } from "h3";

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

// The signed in user, read from the database so changes to isAdmin apply
// without signing in again. Null when signed out.
export const getCurrentUser = async (event: H3Event) => {
  const { user } = await getUserSession(event);

  if (!user) return null;

  return await prisma.user.findUnique({
    select: { id: true, emailAddress: true, isAdmin: true },
    where: { id: user.id },
  });
};

// Throws unless the signed in user is an admin
export const requireAdmin = async (event: H3Event) => {
  await requireUserSession(event);

  const user = await getCurrentUser(event);

  if (!user?.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only admins can manage albums",
    });
  }

  return user;
};

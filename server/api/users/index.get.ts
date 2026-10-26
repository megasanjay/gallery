// Every account, with the private albums shared with each (admin only)
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const users = await prisma.user.findMany({
    omit: { password: true },
    orderBy: { created: "desc" },
  });

  const access = await prisma.albumAccess.findMany({
    select: {
      album: { select: { id: true, title: true } },
      emailAddress: true,
    },
    where: { emailAddress: { in: users.map((user) => user.emailAddress) } },
  });

  return users.map((user) => ({
    ...user,
    sharedAlbums: access
      .filter((entry) => entry.emailAddress === user.emailAddress)
      .map((entry) => entry.album),
  }));
});

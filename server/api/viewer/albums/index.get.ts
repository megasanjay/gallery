// Albums the signed in user can view: public albums plus private albums shared
// with them (everything for admins). Visitors only see public albums.
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event);

  return await listAlbums(viewableAlbumWhere(user));
});

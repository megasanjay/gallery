export default defineEventHandler(async () => {
  return await listAlbums({ isPublic: true });
});

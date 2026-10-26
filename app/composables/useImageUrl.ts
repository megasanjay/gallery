// Builds the bunny.net CDN url for a path in the storage zone
export const useImageUrl = () => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.bunnyCdnUrl.replace(/\/+$/, "");

  return (path: string) => `${baseUrl}/${path}`;
};

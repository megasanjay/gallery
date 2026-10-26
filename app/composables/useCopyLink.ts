// Copies a url to the clipboard and confirms with a toast
export const useCopyLink = () => {
  const toast = useToast();

  return async (url: string) => {
    await navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.add({
          title: "Link copied",
          description: url,
          icon: "i-lucide-clipboard-check",
          color: "success",
        });
      })
      .catch(() => {
        toast.add({
          title: "Could not copy link",
          icon: "material-symbols:error",
          color: "error",
        });
      });
  };
};

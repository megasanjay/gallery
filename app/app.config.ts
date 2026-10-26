export default defineAppConfig({
  ui: {
    button: {
      defaultVariants: {
        size: "lg",
      },
      slots: {
        base: "cursor-pointer rounded-lg",
      },
    },
    colors: {
      neutral: "neutral",
      primary: "sky",
    },
    input: {
      slots: {
        root: "w-full",
      },
    },
  },
});

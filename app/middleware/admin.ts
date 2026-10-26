// For album management pages. Signed out users go to login, signed in viewers
// go home. The server also checks the database on every admin request.
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession();

  if (!loggedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  if (!user.value?.isAdmin) {
    return navigateTo("/");
  }
});

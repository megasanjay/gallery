import { z } from "zod";
import { verify } from "argon2";

const loginSchema = z.object({
  emailAddress: z.string().email(),
  password: z.string().min(8),
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if ("user" in session) {
    return { isAdmin: session.user?.isAdmin ?? false };
  }

  const body = await readValidatedBody(event, (b) => loginSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing login credentials",
    });
  }

  const normalizedEmail = body.data.emailAddress.trim().toLowerCase(); // Normalize email

  // Get the user from the database
  const user = await prisma.user.findUnique({
    where: {
      emailAddress: normalizedEmail, // Use normalized email
    },
  });

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid email address or password",
    });
  }

  // Check if the password matches
  if (!(await verify(user.password, body.data.password))) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid email address or password",
    });
  }

  // Create a new session for the user
  const userData = {
    id: user.id,
    emailAddress: user.emailAddress,
    familyName: user.familyName,
    givenName: user.givenName,
    // For showing admin pages in the ui. The server checks the database instead.
    isAdmin: user.isAdmin,
  };

  await setUserSession(event, {
    loggedInAt: new Date(),
    user: userData,
    userSessionField: "",
  });

  // The login page sends admins to album management and everyone else home
  return { isAdmin: user.isAdmin };
});

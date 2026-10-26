import { z } from "zod";
import { hash } from "argon2";

const signupSchema = z.object({
  emailAddress: z.string().email(),
  familyName: z.string(),
  givenName: z.string(),
  password: z.string().min(12).max(128), // Updated password policy
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if ("user" in session) {
    return sendRedirect(event, "/app/albums");
  }

  const body = await readValidatedBody(event, (b) => signupSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid signup details",
    });
  }

  // This is a single user site. Only allow signup if no account exists yet.
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    throw createError({
      statusCode: 403,
      statusMessage: "Signups are closed",
    });
  }

  const normalizedEmail = body.data.emailAddress.trim().toLowerCase(); // Normalize email

  // Create a new user
  const hashedPassword = await hash(body.data.password);

  const newUser = await prisma.user.create({
    data: {
      emailAddress: normalizedEmail, // Store normalized email
      familyName: body.data.familyName,
      givenName: body.data.givenName,
      password: hashedPassword,
    },
  });

  if (!newUser) {
    throw createError({
      statusCode: 500,
      statusMessage: "Error creating user",
    });
  }

  return { message: "User created successfully" };
});

// auth.d.ts
declare module "#auth-utils" {
  interface User {
    id: string;

    givenName: string;
    familyName: string;
    emailAddress: string;

    // Only used to show admin pages. The server checks the database.
    isAdmin: boolean;
  }

  interface UserSession {
    userSessionField: string;
  }

  interface SecureSessionData {
    secureSessionField: string;
  }
}

export {};

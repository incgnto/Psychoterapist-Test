"use client";
import { useUser } from "@clerk/nextjs";

export function useEmail() {
  const { user, isSignedIn } = useUser();

  const email =
    (isSignedIn &&
      (user?.primaryEmailAddress?.emailAddress ||
       user?.emailAddresses?.[0]?.emailAddress)) ||
    "guest@pj.com";

  return email.toLowerCase();
}

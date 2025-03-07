import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <SignupForm 
      heading="Town Hall"
      subheading="Join your local community today."
      logo={{
        url: "/",
        src: "/mainlogo.png",
        alt: "Town Hall"
      }}
      loginUrl="/auth/login"
    />
  );
}
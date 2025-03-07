import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <LoginForm 
      heading="Town Hall"
      subheading="Welcome back. Log in to your account."
      logo={{
        url: "/",
        src: "/mainlogo.png",
        alt: "Town Hall"
      }}
      signupUrl="/auth/signup"
    />
  );
}
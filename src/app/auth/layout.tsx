import { AuthScene } from "@/core/components/auth-scene";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthScene>{children}</AuthScene>;
}

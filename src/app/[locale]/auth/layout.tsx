import { Suspense } from "react";
import { Toast } from "@heroui/react";
import { AuthScene } from "@/core/components/auth-scene";
import { OAuthErrorToast } from "@/core/components/auth-form";
import { ClearCachedPages } from "@/core/offline/clear-cached-pages";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthScene>{children}</AuthScene>
      <Toast.Provider placement="top" />
      <ClearCachedPages />
      {/* useSearchParams sin Suspense haría dinámicas estas páginas estáticas */}
      <Suspense fallback={null}>
        <OAuthErrorToast />
      </Suspense>
    </>
  );
}

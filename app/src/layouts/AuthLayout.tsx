import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

function AuthLayout({ children }: Props) {
  return <>{children}</>;
}

export default AuthLayout;
import { LoginForm } from "@/components/auth/LoginForm";
import { readShellBrand } from "@/lib/branding/shell";

export default async function LoginPage() {
  const brand = await readShellBrand();
  return <LoginForm schoolName={brand.schoolName} />;
}

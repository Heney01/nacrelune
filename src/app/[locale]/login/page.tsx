
import { DebugButton } from '@/components/debug-button';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <DebugButton source="Login Page" />
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}



import { SignUpForm } from '@/components/signup-form';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}


import { Loader2 } from 'lucide-react';

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  )
}
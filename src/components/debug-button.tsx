
'use client';

import { debugAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';

export function DebugButton({ source }: { source: string }) {
    return (
        <form action={debugAction} className="fixed bottom-4 left-4 z-50">
            <input type="hidden" name="source" value={source} />
            <Button type="submit" size="icon" variant="destructive">
                <Bug className="h-5 w-5" />
                <span className="sr-only">Debug Action from {source}</span>
            </Button>
        </form>
    );
}

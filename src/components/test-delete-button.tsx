
'use client';

import { deleteModel } from "@/app/actions";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function TestDeleteButton() {
    const handleConfirmDelete = async () => {
        console.log("--- TEST OK CLICKED (Client) ---");
        try {
            const result = await deleteModel();
            console.log("--- ACTION RESULT (Client):", result);
            // The alert will be blocked in the sandbox, but we keep the logic
            alert("Action Result: " + JSON.stringify(result));
        } catch (error) {
            console.error("--- ACTION ERROR (Client):", error);
            alert("Action Error: " + String(error));
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    className="border-4 border-yellow-400 p-4"
                >
                    Test Delete Action
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will call the test delete action.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

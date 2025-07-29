
'use client';

import { deleteModel } from "@/app/actions";
import { Button } from "./ui/button";

export function TestDeleteButton() {
    const handleTestClick = async () => {
        console.log("--- TEST BUTTON CLICKED (Client) ---");
        try {
            const result = await deleteModel();
            console.log("--- ACTION RESULT (Client):", result);
            alert("Action Result: " + JSON.stringify(result));
        } catch (error) {
            console.error("--- ACTION ERROR (Client):", error);
            alert("Action Error: " + error);
        }
    }

    return (
        <Button 
            onClick={handleTestClick} 
            variant="destructive"
            className="border-4 border-yellow-400 p-4"
        >
            Test Delete Action
        </Button>
    )
}

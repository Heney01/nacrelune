
import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize state with a function to run only on the client-side once.
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') {
      return false; // Default to false on the server
    }
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = () => {
      // Set state to the result of the check
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return isMobile;
}

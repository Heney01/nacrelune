
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkIsMobile = () => {
        return window.innerWidth < MOBILE_BREAKPOINT;
    }

    // Set the initial value
    setIsMobile(checkIsMobile());

    const handleResize = () => {
        setIsMobile(checkIsMobile());
    }

    window.addEventListener("resize", handleResize)
    
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return !!isMobile
}

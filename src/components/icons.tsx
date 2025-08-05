
import type { SVGProps } from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"

export function BrandLogo(props: React.ComponentProps<"img">) {
  const { className, ...rest } = props;
  const logoUrl = "https://firebasestorage.googleapis.com/v0/b/nacrelune.appspot.com/o/logo%2Flogo.png?alt=media&token=6cd225ee-ef09-4ec6-8e3a-7555cc56931f";
  
  return (
    <div className={cn("relative", className)} style={{ width: '130px', height: '46px' }}>
       <Image
          src={logoUrl}
          alt="Atelier à bijoux Logo"
          fill
          className="object-contain"
          priority
          sizes="130px"
        />
    </div>
  );
}


export function ShoppingBasketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m5 11 4-7"/>
      <path d="m19 11-4-7"/>
      <path d="M2 11h20"/>
      <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4"/>
      <path d="m9 11 1 9"/>
      <path d="M4.5 15.5h15"/>
      <path d="m15 11-1 9"/>
    </svg>
  )
}

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px" {...props}>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.657-3.657-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.508,44,29.891,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  )
}

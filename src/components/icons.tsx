import type { SVGProps } from "react"

export function BrandLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 20" {...props}>
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--accent))", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <text
        fontFamily="Alegreya, serif"
        fontSize="16"
        fontWeight="bold"
        fill="url(#grad1)"
        x="0"
        y="15"
      >
        Atelier à bijoux
      </text>
    </svg>
  )
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

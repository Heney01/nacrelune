import type { SVGProps } from "react"

export function NacreluneLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20" {...props}>
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
        Nacrelune
      </text>
    </svg>
  )
}
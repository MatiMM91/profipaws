export default function BrandLogo({ className = 'h-9 w-9', alt = 'Profipaws' }) {
  return (
    <img
      src="/logo.svg"
      alt={alt}
      className={`shrink-0 rounded-xl shadow-sm shadow-cyan-900/20 ${className}`}
      width={36}
      height={36}
      decoding="async"
    />
  )
}

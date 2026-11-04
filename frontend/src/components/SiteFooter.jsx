export default function SiteFooter({ className = '' }) {
  return (
    <footer
      className={`border-t border-cyan-100 px-4 py-6 text-center text-sm text-cyan-600 dark:border-cyan-800/60 dark:text-cyan-300/70 ${className}`}
    >
      <p>© {new Date().getFullYear()} Profipaws</p>
    </footer>
  )
}

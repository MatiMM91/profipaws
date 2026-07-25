import { Dog, Cat, Bird } from 'lucide-react'

/** Species silhouette for pet cards / profile headers. */
export default function SpeciesIcon({ species, size = 22, className = '' }) {
  const props = { size, className, strokeWidth: 1.75 }
  if (species === 'dog') return <Dog {...props} />
  if (species === 'cat') return <Cat {...props} />
  return <Bird {...props} />
}

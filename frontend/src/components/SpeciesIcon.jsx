import { Dog, Cat, Bird, Rabbit, Mouse, Fish, Turtle, Rat, Squirrel, PawPrint } from 'lucide-react'

/** Canonical species values stored in the API. */
export const SPECIES_OPTIONS = [
  'dog',
  'cat',
  'bird',
  'rabbit',
  'hamster',
  'guinea_pig',
  'fish',
  'turtle',
  'ferret',
  'other',
]

const ICONS = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  hamster: Mouse,
  guinea_pig: Squirrel,
  fish: Fish,
  turtle: Turtle,
  ferret: Rat,
  other: PawPrint,
}

export default function SpeciesIcon({ species, size = 22, className = '' }) {
  const Icon = ICONS[species] || PawPrint
  return <Icon size={size} className={className} strokeWidth={1.75} />
}

import { Dog, Cat, Bird, Rabbit, Fish, Turtle, Rat, PawPrint } from 'lucide-react-native'
import { useTheme } from '../theme/ThemeContext'

const ICONS = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  hamster: PawPrint,
  guinea_pig: PawPrint,
  fish: Fish,
  turtle: Turtle,
  ferret: Rat,
  other: PawPrint,
}

export default function SpeciesIcon({ species, size = 22, color }) {
  const { colors } = useTheme()
  const Icon = ICONS[species] || PawPrint
  return <Icon size={size} color={color || colors.icon} strokeWidth={1.75} />
}

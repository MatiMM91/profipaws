import { Image, StyleSheet, View } from 'react-native'

export default function BrandLogo({ size = 40, style }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.23, overflow: 'hidden' }, style]}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    </View>
  )
}

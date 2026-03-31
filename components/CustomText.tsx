import { Text as RNText, TextProps } from 'react-native'

const Text = (props: TextProps) => {
  return <RNText {...props} allowFontScaling={false} />
}
export default Text

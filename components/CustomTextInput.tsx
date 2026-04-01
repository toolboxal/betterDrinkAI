import { TextInput as RNTextInput, TextInputProps } from 'react-native'

const TextInput = (props: TextInputProps) => {
  return <RNTextInput {...props} allowFontScaling={false} />
}
export default TextInput

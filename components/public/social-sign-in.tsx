import { Button } from 'react-native'
import { authClient } from '@/lib/auth-client'

export default function SocialSignIn() {
  const handleLogin = async () => {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/(authenticated)',
    })
    if (error) {
      // handle error
      return
    }
  }
  return <Button title="Login with Google" onPress={handleLogin} />
}

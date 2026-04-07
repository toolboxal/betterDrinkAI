import { authClient } from './lib/auth-client'
authClient.getSession().then((val) => console.log(val.data?.session))

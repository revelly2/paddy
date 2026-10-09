import { type Session } from '../lib/supabase'
import AdminDashboard from './AdminDashboard'
import UserDashboard from './UserDashboard'

interface HomePageProps {
  session: Session
  isAdmin: boolean
}

export default function HomePage({ session, isAdmin }: HomePageProps) {
  return (
    <>
      {isAdmin ? (
        <AdminDashboard session={session} />
      ) : (
        <UserDashboard session={session} />
      )}
    </>
  )
}

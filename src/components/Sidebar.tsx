'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TOFU_LOGO = (
  <svg width="52" height="12" viewBox="0 0 85 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24.041 20H18.3262V9.75488L8.08105 20H0L14.2861 5.71387H4.04102V0H24.041V20ZM50.0166 2.38379C51.5878 2.38386 52.974 2.71928 54.1738 3.39062C55.3736 4.04775 56.3173 4.96249 57.0029 6.13379C57.6884 7.29077 58.0312 8.62665 58.0312 10.1406C58.0312 11.6403 57.6884 12.9762 57.0029 14.1475C56.3316 15.3045 55.3951 16.2192 54.1953 16.8906C52.9954 17.5477 51.6165 17.8759 50.0596 17.876C48.4883 17.876 47.095 17.5476 45.8809 16.8906C44.681 16.2193 43.7384 15.3044 43.0527 14.1475C42.3671 12.9761 42.0244 11.6405 42.0244 10.1406C42.0244 8.62641 42.3671 7.29089 43.0527 6.13379C43.7384 4.9625 44.681 4.04773 45.8809 3.39062C47.0807 2.71935 48.4597 2.38382 50.0166 2.38379ZM75.6953 11.8115C75.6954 12.3113 75.7953 12.7397 75.9951 13.0967C76.1951 13.4537 76.474 13.7255 76.8311 13.9111C77.2023 14.0967 77.6452 14.1894 78.1592 14.1895C78.6733 14.1894 79.117 14.0968 79.4883 13.9111C79.8594 13.7254 80.1386 13.4536 80.3242 13.0967C80.524 12.7397 80.624 12.3111 80.624 11.8115V2.61816H84.5879V11.8115C84.5878 13.0685 84.3306 14.1542 83.8164 15.0684C83.3022 15.9682 82.5591 16.6618 81.5879 17.1475C80.6309 17.633 79.473 17.8759 78.1162 17.876C76.7883 17.8759 75.6453 17.6328 74.6885 17.1475C73.7314 16.6618 72.9948 15.9682 72.4805 15.0684C71.9806 14.1542 71.7315 13.0684 71.7314 11.8115V2.61816H75.6953V11.8115ZM41.1172 6.26172H36.8965V17.6182H32.9316V6.26172H28.6895V2.61816H41.1172V6.26172ZM70.1143 6.26172H63.8145V8.44727H68.7432V12.0898H63.8145V17.6182H59.8496V2.61816H70.1143V6.26172ZM50.0166 6.02637C49.2599 6.0264 48.5812 6.20473 47.9814 6.56152C47.3958 6.90435 46.9307 7.39104 46.5879 8.01953C46.2595 8.63371 46.0957 9.34081 46.0957 10.1406C46.0957 10.9404 46.2667 11.6475 46.6094 12.2617C46.9522 12.8759 47.4173 13.3617 48.0029 13.7188C48.6028 14.0614 49.2884 14.2334 50.0596 14.2334C50.8308 14.2333 51.5101 14.0615 52.0957 13.7188C52.6811 13.3617 53.1384 12.8757 53.4668 12.2617C53.7952 11.6476 53.9599 10.9404 53.96 10.1406C53.96 9.34086 53.788 8.63369 53.4453 8.01953C53.1168 7.3911 52.6525 6.90437 52.0527 6.56152C51.4672 6.20447 50.7878 6.02644 50.0166 6.02637Z" fill="#1a1a18"/>
  </svg>
)

const nav = [
  { href: '/',         label: 'Dashboard',  icon: IconDashboard },
  { href: '/workers',  label: 'Crew',       icon: IconWorkers },
  { href: '/jobs',     label: 'Jobs',       icon: IconJobs },
  { href: '/chat',     label: 'Messages',   icon: IconChat },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#ffffff',
      borderRight: '1px solid #eeece8',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 8px', borderBottom: '1px solid #eeece8' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          {TOFU_LOGO}
          <span style={{
            color: '#999990',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.02em',
            paddingLeft: 4,
            borderLeft: '1px solid #dedad4',
            marginLeft: 2,
          }}>Dispatch</span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 12px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999990', padding: '0 8px 8px' }}>
          Workspace
        </div>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 10px',
              borderRadius: 7,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 13.5,
              fontWeight: active ? 600 : 500,
              color: active ? '#1a1a18' : '#555550',
              background: active ? '#f2ede6' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}>
              <Icon active={active} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #eeece8' }}>
        <div style={{ fontSize: 11, color: '#999990' }}>Manager view</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', marginTop: 2 }}>James Martinez</div>
      </div>
    </aside>
  )
}

function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a18' : '#999990'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
}
function IconWorkers({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a18' : '#999990'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconJobs({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a18' : '#999990'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}
function IconChat({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a18' : '#999990'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

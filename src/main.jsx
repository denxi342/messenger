import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import NotificationContainer from './components/NotificationContainer'
import './components/NotificationManager' // ensures window.notify is bound globally

const isNotificationWindow = typeof window !== 'undefined' && window.location.search.includes('windowType=notification');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isNotificationWindow ? (
      <NotificationContainer isStandalone={true} />
    ) : (
      <>
        <App />
        <NotificationContainer />
      </>
    )}
  </StrictMode>,
)

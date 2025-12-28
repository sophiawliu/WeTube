import { useState, createContext, useContext, ReactNode, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

const QUOTES = [
  '<i>"I had a lot of unfinished ideas, fragments of music I called \'feels.\' Each feel represented a mood or an emotion I\'d felt, and I planned to fit them together like a mosaic." - Brian Wilson</i>',
  '<i>"ChatGPT is a blurry jpeg of the Web. It retains much of the information on the Web, but all you will ever get is an approximation." - Ted Chiang</i>'
]

// Context to allow pages to inject content into the footer
interface FooterContextType {
  setFooterDial: (node: ReactNode) => void
  setFooterCollapsed: (collapsed: boolean) => void
}

export const FooterContext = createContext<FooterContextType | null>(null)

export function useFooterDial() {
  return useContext(FooterContext)
}

function App() {
  const location = useLocation()
  const isVisualizePage = location.pathname.startsWith('/visualize')
  const [quoteIndex, setQuoteIndex] = useState(isVisualizePage ? 1 : 0)
  const [footerDial, setFooterDial] = useState<ReactNode>(null)
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(true)

  // Start collapsed on visualize page, reset when navigating
  useEffect(() => {
    setIsFooterCollapsed(isVisualizePage)
  }, [location.pathname, isVisualizePage])

  // Set default quote based on page: Ted Chiang for visualize, Brian Wilson for home
  useEffect(() => {
    setQuoteIndex(isVisualizePage ? 1 : 0)
  }, [isVisualizePage])

  const toggleQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % QUOTES.length)
  }

  const toggleFooter = () => {
    setIsFooterCollapsed((prev) => !prev)
  }

  return (
    <FooterContext.Provider value={{ setFooterDial, setFooterCollapsed: setIsFooterCollapsed }}>
      <Outlet />
      <footer className={`footer footer-fixed ${isFooterCollapsed ? 'footer-collapsed' : ''}`}>
        {/* Expand/Collapse Tab */}
        {footerDial && (
          <button 
            className="footer-toggle-tab"
            onClick={toggleFooter}
            aria-label={isFooterCollapsed ? 'Expand footer' : 'Collapse footer'}
          >
            <svg 
              className={`footer-toggle-arrow ${isFooterCollapsed ? 'arrow-up' : 'arrow-down'}`}
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
          </button>
        )}

        {/* Collapsed state: show FIDELITY title centered */}
        {footerDial && isFooterCollapsed && (
          <div className="footer-collapsed-title" onClick={toggleFooter}>
            <span className="collapsed-title-main">FIDELITY DIAL</span>
          </div>
        )}

        <div className="footer-content">
          {footerDial && <div className="footer-dial">{footerDial}</div>}
          <span 
            className="footer-description footer-quote-clickable" 
            dangerouslySetInnerHTML={{ __html: QUOTES[quoteIndex] }}
            onClick={toggleQuote}
          />
          <div className="footer-links">
            <a href="https://x.com/jiratickets/status/1985476590609056240" target="_blank" rel="noopener noreferrer">
              <svg className="footer-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
              </svg>
              L.A. Woman
            </a>
            <a href="https://www.instagram.com/p/B-PljfwpJ7Q/?igsh=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer">
              <svg className="footer-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
              </svg>
              What Is and What Should Never Be
            </a>
            <a href="https://sophiawliu.com/blog.phia/bad-vibes/" target="_blank" rel="noopener noreferrer">
              <svg className="footer-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              Good Vibrations
            </a>
          </div>
        </div>
      </footer>
    </FooterContext.Provider>
  )
}

export default App

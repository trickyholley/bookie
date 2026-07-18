import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { apolloClient } from '@/lib/apollo-client'
import { CurrentUserProvider } from '@/context/UserContext'
import { CartProvider } from '@/context/CartContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <CurrentUserProvider>
        <CartProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CartProvider>
      </CurrentUserProvider>
    </ApolloProvider>
  </StrictMode>,
)

import { Navigate, Route, Routes } from 'react-router-dom';

import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { RequireAuth } from './components/RequireAuth';
import { CartProvider } from './context/CartContext';
import { CatalogRegionProvider } from './context/CatalogRegionContext';
import { CurrentLocationProvider } from './context/CurrentLocationStub';
import { MainTabLayout } from './layout/MainTabLayout';
import { BookingPage } from './pages/BookingPage';
import { BookingsPage } from './pages/BookingsPage';
import { CartPage } from './pages/CartPage';
import { CategoryServicesPage } from './pages/CategoryServicesPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { RateBookingPage } from './pages/RateBookingPage';
import { HelpSupportPage } from './pages/HelpSupportPage';
import { HomePage } from './pages/HomePage';
import { LocationGatePage } from './pages/LocationGatePage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { OTPPage } from './pages/OTPPage';
import { PaymentOptionsPage } from './pages/PaymentOptionsPage';
import { PaymentReturnPage } from './pages/PaymentReturnPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReferralPage } from './pages/ReferralPage';
import { SavedAddressesPage } from './pages/SavedAddressesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { SplashPage } from './pages/SplashPage';
import { WalletPage } from './pages/WalletPage';
import { WalletTopupPage } from './pages/WalletTopupPage';

export default function App() {
  return (
    <CurrentLocationProvider>
      <CatalogRegionProvider>
        <CartProvider>
          <>
            <PwaInstallPrompt
              appName="Install App"
              appDescription="Add AO CLEAN to your device for a faster, full-screen experience."
              iconSrc="/pwa-192.png"
            />
            <Routes>
              <Route path="/" element={<SplashPage />} />
              <Route path="/location" element={<LocationGatePage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/otp" element={<OTPPage />} />
              {/* Home tab is public (browse without login); other tabs stay behind RequireAuth. */}
              <Route path="/tabs" element={<MainTabLayout />}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<HomePage />} />
                <Route element={<RequireAuth />}>
                  <Route path="bookings" element={<BookingsPage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>
              {/* Browse + basket + booking details without login; payment step requires auth. */}
              <Route path="/category/:categoryKey" element={<CategoryServicesPage />} />
              <Route path="/service/:slug" element={<ServiceDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/payment-options" element={<PaymentOptionsPage />} />
                <Route path="/confirmation" element={<ConfirmationPage />} />
                <Route path="/rate-booking/:bookingId" element={<RateBookingPage />} />
                <Route path="/payment-result" element={<PaymentReturnPage />} />
                <Route path="/wallet-topup" element={<WalletTopupPage />} />
                <Route path="/profile/saved-addresses" element={<SavedAddressesPage />} />
                <Route path="/profile/referral" element={<ReferralPage />} />
                <Route path="/profile/help-support" element={<HelpSupportPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        </CartProvider>
      </CatalogRegionProvider>
    </CurrentLocationProvider>
  );
}

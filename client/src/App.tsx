import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { Layout } from "./components/Layout";
import { GoalsPage } from "./pages/Goals";
import { LoginPage } from "./pages/Login";
import { MyFoodsPage } from "./pages/MyFoods";
import { TodayPage } from "./pages/Today";

// The chart library is only needed on History, so load it on demand.
const HistoryPage = lazy(() => import("./pages/History").then((m) => ({ default: m.HistoryPage })));

function Routed() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LoginPage />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route
          path="history"
          element={
            <Suspense fallback={null}>
              <HistoryPage />
            </Suspense>
          }
        />
        <Route path="foods" element={<MyFoodsPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </BrowserRouter>
  );
}

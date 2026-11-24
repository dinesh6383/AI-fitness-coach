import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import ComingSoon from "./components/ComingSoon";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";

import BiometricsStep from "./pages/BioMetricsStep";
import GoalStep from "./pages/GoalStep";
import PlanStep from "./pages/PlanStep";
import ProfilePage from "./pages/ProfilePage";
import ScheduleStep from "./pages/ScheduleStep";
import TodayPage from "./pages/TodayPage";
import WorkoutPage from "./pages/WorkoutPage";

import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import TracksPage from "./pages/TrackPage";
import DietPage from "./pages/DietPage";

export default function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/signin" replace />} />

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* All routes below require authentication */}
        <Route element={<ProtectedRoute />}>
          {/* Onboarding */}
          <Route path="/builder/schedule" element={<ScheduleStep />} />
          <Route path="/builder/goal" element={<GoalStep />} />
          <Route path="/builder/about" element={<BiometricsStep />} />
          <Route path="/builder/split" element={<PlanStep />} />

          {/* Main application */}
          <Route element={<AppLayout />}>
            <Route path="/today" element={<TodayPage />} />

            <Route path="/tracks" element={<TracksPage />} />
            <Route path="/progress" element={<ComingSoon title="Progress" />} />
            <Route path="/diet" element={<DietPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route
              path="/profile/edit"
              element={<ComingSoon title="Edit Profile" />}
            />

            <Route
              path="/profile/coach"
              element={<ComingSoon title="Coach Settings" />}
            />
          </Route>

          {/* Fullscreen workout */}
          <Route path="/workout" element={<WorkoutPage />} />
        </Route>
      </Routes>
    </>
  );
}

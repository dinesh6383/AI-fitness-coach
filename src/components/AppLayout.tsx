import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

/** Shell for every screen after onboarding: page content plus the bottom navigation. */
export default function AppLayout() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-32">
      <Outlet />
      <BottomNav />
    </div>
  );
}

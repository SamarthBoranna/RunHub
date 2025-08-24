import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/react";
import { NavLink } from "react-router-dom";
import { User } from "@heroui/react";
import { useActivities } from "./ActivitiesContext";
import connectWithStravaBtn from "../assets/strava_connect_btn.svg";
import runhubLogo from "../assets/runhub2.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

function NavBar() {
  const { isAuthorized, userInfo, logout } = useActivities();

  const navLinkClass = ({ isActive }) =>
    isActive ? "text-primary font-medium" : "text-foreground";

  const handleLoginClick = () => {
    window.location.href = `${API_BASE}/authorize`;
  };

  return (
    <Navbar isBordered>
      <div className="w-full flex items-center justify-between">
        <NavbarBrand>
          <NavLink color="foreground" to="/" className="flex items-center">
            <img src={runhubLogo} alt="RunHub Logo" className="h-12 w-auto" />
            <p className="text-2xl font-medium text-inherit">RunHub</p>
          </NavLink>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem>
            <NavLink to="/runs" className={navLinkClass}>
              Runs
            </NavLink>
          </NavbarItem>
          <NavbarItem>
            <NavLink to="/badges" className={navLinkClass}>
              Badges
            </NavLink>
          </NavbarItem>
          <NavbarItem>
            <NavLink to="/heatmap" className={navLinkClass}>
              Heatmap
            </NavLink>
          </NavbarItem>
        </NavbarContent>
        <NavbarContent justify="end">
          <NavbarItem>
            {isAuthorized ? (
              <div className="flex items-center gap-2">
                {userInfo ? (
                  <User
                    avatarProps={{
                      src: userInfo.profile,
                    }}
                    description={userInfo.username}
                    name={`${userInfo.firstname} ${userInfo.lastname}`}
                  />
                ) : (
                  <span>Strava User</span>
                )}
              </div>
            ) : (
              <div className="cursor-pointer" onClick={handleLoginClick}>
                <img
                  src={connectWithStravaBtn}
                  alt="Connect with Strava"
                  className="h-8"
                />
              </div>
            )}
          </NavbarItem>
        </NavbarContent>
      </div>
    </Navbar>
  );
}

export default NavBar;

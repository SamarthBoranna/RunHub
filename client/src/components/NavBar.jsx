import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
} from "@heroui/react";
import { Link, NavLink } from "react-router-dom";
import { User } from "@heroui/react";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

function NavBar() {
  const [athlete, setAthlete] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/athlete`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setAthlete(data));
  }, []);

  const navLinkClass = ({ isActive }) =>
    isActive ? "text-primary font-medium" : "text-foreground";

  return (
    <Navbar>
      <div className="w-full flex items-center justify-between">
        <NavbarBrand>
          <NavLink color="foreground" to="/">
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
            {athlete && athlete.firstname ? (
              <User
                avatarProps={{
                  src: athlete.profile,
                }}
                description={athlete.username}
                name={athlete.firstname + " " + athlete.lastname}
              />
            ) : (
              <Button
                as={Link}
                color="primary"
                to={`${API_BASE}/authorize`}
                variant="flat"
              >
                Login with Strava
              </Button>
            )}
          </NavbarItem>
        </NavbarContent>
      </div>
    </Navbar>
  );
}

export default NavBar;

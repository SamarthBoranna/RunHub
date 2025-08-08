import {Navbar, NavbarBrand, NavbarContent, NavbarItem, Button} from "@heroui/react";
import { Link } from "react-router-dom";
import {User} from "@heroui/react";
import { useEffect, useState } from "react";


function Dashboard() {
    const [athlete, setAthlete] = useState(null);

    useEffect(() => {
        fetch("http://localhost:5050/api/athlete", {
            credentials: "include",
        })
        .then((res) => res.json())
        .then((data) => setAthlete(data));
    }, [])

  return (
    <Navbar>
        <NavbarBrand>
            <Link color="foreground" to="/">
                <p className="text-2xl font-medium text-inherit"> RunHub</p>
            </Link>
        </NavbarBrand>
        <NavbarContent className="hidden sm: flex gap-4" justify="center">
            <NavbarItem>
                <Link color="foreground" to="/runs">Runs</Link>
            </NavbarItem>
            <NavbarItem>
                <Link color="foreground" to="/badges">Badges</Link>
            </NavbarItem>
            <NavbarItem>
                <Link color="foreground" to="/heatmap">Heatmap</Link>
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
                        name={athlete.firstname + ' ' + athlete.lastname}
                    />
                ) : (
                    <Button as={Link} color="primary" to="http://localhost:5050/authorize" variant="flat">
                        Login with Strava
                    </Button>
                )}
            </NavbarItem>
        </NavbarContent>
    </Navbar>
  )
}

export default Dashboard
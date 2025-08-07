import {Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button} from "@heroui/react";


function Dashboard() {

  return (
    <Navbar>
        <NavbarBrand>
            <p className="font-bold text-inherit"> RunHub</p>
        </NavbarBrand>
        <NavbarContent className="hidden sm: flex gap-4" justify="center">
            <NavbarItem isActive>
                <Link aria-current="page" href="#">Runs</Link>
            </NavbarItem>
            <NavbarItem>
                <Link color="foreground" href="#">Badges</Link>
            </NavbarItem>
            <NavbarItem>
                <Link color="foreground" href="#">Heatmap</Link>
            </NavbarItem>
        </NavbarContent>

        <NavbarContent justify="end">
            <NavbarItem>
                <Button as={Link} color="primary" href="http://localhost:5050/authorize" variant="flat">
                    Login with Strava
                </Button>
            </NavbarItem>
        </NavbarContent>
    </Navbar>
  )
}

export default Dashboard
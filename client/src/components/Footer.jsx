import { Divider } from "@heroui/react";
import poweredByStrava from "../assets/api_logo_pwrdBy_strava_horiz_orange.svg";

export default function Footer() {
  return (
    <>
      <Divider className="my-0" />
      <footer className="py-4 mt-0">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <p className="text-sm">© 2025 RunHub</p>
          </div>
          <div>
            <img
              src={poweredByStrava}
              alt="Powered by Strava"
              className="h-4"
              style={{ height: "16px", width: "auto" }}
            />
          </div>
        </div>
      </footer>
    </>
  );
}

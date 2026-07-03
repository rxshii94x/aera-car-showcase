export interface VehicleColorway {
  id: string;
  name: string;
  hex: string;
  videoUrl: string;
  specs: {
    power: string;
    acceleration: string;
    topSpeed: string;
    dragCoefficient: string;
  };
  accentColor: string;
}

export interface NavbarLink {
  label: string;
  href: string;
}

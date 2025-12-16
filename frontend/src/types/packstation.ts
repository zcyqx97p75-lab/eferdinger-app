import { Farmer } from "./farmer";
import { Variety } from "./product";

// Packstellen-Lager
export type PackStationStock = {
  id: number;
  packStationId: number;
  farmerId: number;
  varietyId: number;
  quantityKg: number;
  farmer?: Farmer;
  variety?: Variety;
};


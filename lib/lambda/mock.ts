import { v4 as uuidv4 } from "uuid";
import { Product } from "./type";

export const mockProducts: Product[] = [
  {
    id: uuidv4(),
    title: "LEGO City Fire Station",
    price: 99.99,
    description:
      "Build a feature-packed fire station with scout tower and separate garage, a fire toy vehicle, plus a drone with spinning rotors and a water scooter.",
  },
  {
    id: uuidv4(),
    title: "LEGO Star Wars Millennium Falcon",
    price: 159.99,
    description:
      "Includes several classic Star Wars characters and features opening top panels, detailed interior, and rotatable sensor dish.",
  },
  {
    id: uuidv4(),
    title: "LEGO Technic Bugatti Chiron",
    price: 349.99,
    description:
      "Features W16 engine, detailed interior, and unique serial number.",
  },
  {
    id: uuidv4(),
    title: "LEGO Harry Potter Hogwarts Castle",
    price: 399.99,
    description:
      "Build an iconic Hogwarts Castle replica complete with a host of famous characters, intricate details, and magical rooms.",
  },
];

export type MenuStatus = "active" | "archived";

export type Tag = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Location = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Menu = {
  id: string;
  title: string;
  description: string | null;
  menuContent: string;
  menuContentHtml: string | null;
  pricePerPersonCents: number | null;
  imagePath: string | null;
  imageUrl: string | null;
  status: MenuStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tagIds: string[];
  locationIds: string[];
  isFavorite: boolean;
};

export type BootstrapPayload = {
  menus: Menu[];
  tags: Tag[];
  locations: Location[];
};

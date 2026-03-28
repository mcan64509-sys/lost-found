export type Item = {
  id: number;
  type: "lost" | "found";
  title: string;
  location: string;
  image: string;
  category?: string;
  date?: string;
  description?: string;
  createdByEmail?: string;
};

export const items: Item[] = [
  {
    id: 1,
    type: "lost",
    title: "iphone 15",
    location: "bursa yıldırım",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop",
    category: "Telefon",
    date: "2026-03-14",
    description: "bursa yıldırımda kayboldu",
  },
  {
    id: 2,
    type: "found",
    title: "bileklik",
    location: "bursa acemler",
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
    category: "Takı",
    date: "2026-03-13",
    description: "bursa acemlerde bulundu",
  },
];
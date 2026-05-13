import Link from "next/link";
import type { Item } from "../data/items";

type Props = {
  item: Item;
};

export default function ItemCard({ item }: Props) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="group block overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition-all duration-200 hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30"
    >
      <img
        src={item.image}
        alt={item.title}
        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="p-4">
        <span className="text-xs text-slate-400">
          {item.type === "lost" ? "Kayıp" : "Bulundu"}
        </span>

        <h3 className="mt-2 text-lg font-semibold text-white">
          {item.title}
        </h3>

        <p className="text-sm text-slate-400">{item.location}</p>
      </div>
    </Link>
  );
}